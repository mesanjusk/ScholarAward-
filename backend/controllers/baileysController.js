const BaileysMessage      = require('../models/BaileysMessage');
const BaileysRule         = require('../models/WhatsAppAutoReplyRule'); // reuse same schema
const Notification        = require('../models/Notification');
const WhatsAppGroupMember = require('../models/WhatsAppGroupMember');
const { emitEvent }       = require('../services/socket');
const baileysService      = require('../services/baileysService');

function normalizePhone(value) {
  const d = String(value || '').replace(/[^\d]/g, '').trim();
  return d.length === 10 ? '91' + d : d;
}
function getConversationKey(phone) {
  return normalizePhone(phone);
}

// ── Status & QR ───────────────────────────────────────────────────────────────

async function getStatus(req, res) {
  if (!baileysService.isWhatsappEnabled()) {
    return res.json({ qr: null, status: 'DISABLED', phone: '', message: 'WhatsApp disabled on this instance (WHATSAPP_ENABLED not set).' });
  }
  res.json(baileysService.getStatus());
}

async function startConnection(req, res) {
  if (!baileysService.isWhatsappEnabled()) {
    return res.status(403).json({ message: 'WhatsApp is disabled on this server instance. Set WHATSAPP_ENABLED=true in environment variables to enable it.' });
  }
  try {
    console.log('[baileys] /connect hit — starting connection');
    await baileysService.connect();
    res.json({ message: 'Baileys connecting…', status: baileysService.getStatus() });
  } catch (error) {
    console.error('[baileys] startConnection error:', error.message);
    res.status(500).json({ message: error.message });
  }
}

async function stopConnection(req, res) {
  try {
    await baileysService.disconnect();
    res.json({ message: 'Baileys disconnected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

async function getInbox(req, res) {
  const messages = await BaileysMessage.find({ conversationKey: { $ne: '' } })
    .sort({ createdAt: -1 })
    .limit(400)
    .lean();

  const grouped = new Map();
  for (const item of messages) {
    const key = item.conversationKey || getConversationKey(item.from || item.to);
    if (!key) continue;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        conversationKey: key,
        phone: key,
        contactName: item.contactName || '',
        lastMessage: item.bodyText || item.messageType,
        lastMessageAt: item.createdAt,
        lastDirection: item.direction,
        unreadCount: item.direction === 'INCOMING' && item.status !== 'READ' ? 1 : 0,
        lastStatus: item.status,
        messages: 1,
        provider: 'baileys',
      });
    } else {
      current.unreadCount += item.direction === 'INCOMING' && item.status !== 'READ' ? 1 : 0;
      current.messages += 1;
      if (!current.contactName && item.contactName) current.contactName = item.contactName;
    }
  }

  res.json(
    Array.from(grouped.values()).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
  );
}

async function getConversation(req, res) {
  const conversationKey = getConversationKey(req.params.conversationKey);
  const rows = await BaileysMessage.find({ conversationKey }).sort({ createdAt: 1 }).lean();
  res.json(rows);
}

async function markConversationRead(req, res) {
  const conversationKey = getConversationKey(req.params.conversationKey);
  await BaileysMessage.updateMany(
    { conversationKey, direction: 'INCOMING', status: { $in: ['RECEIVED', 'DELIVERED'] } },
    { $set: { status: 'READ' } }
  );
  res.json({ message: 'Marked as read' });
}

// ── Send Text ──────────────────────────────────────────────────────────────────

async function sendText(req, res) {
  const { to, text, contactName = '', replyToMessageId = '' } = req.body;
  if (!to || !text) return res.status(400).json({ message: 'to and text are required' });

  try {
    const result = await baileysService.sendText({ to, body: text });
    const log = await BaileysMessage.create({
      to: normalizePhone(to),
      from: '',
      contactName,
      conversationKey: getConversationKey(to),
      baileysMessageId: result?.key?.id || '',
      replyToMessageId,
      direction: 'OUTGOING',
      source: 'MANUAL',
      messageType: 'TEXT',
      bodyText: text,
      status: 'SENT',
      meta: result || {},
    });
    emitEvent('baileys_message_logged', log);
    return res.status(201).json(log);
  } catch (error) {
    const log = await BaileysMessage.create({
      to: normalizePhone(to),
      contactName,
      conversationKey: getConversationKey(to),
      direction: 'OUTGOING',
      source: 'MANUAL',
      messageType: 'TEXT',
      bodyText: text,
      status: 'FAILED',
      meta: { error: error.message },
    });
    return res.status(500).json(log);
  }
}

// ── Logs (flat list of all messages) ─────────────────────────────────────────

async function getLogs(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const logs = await BaileysMessage.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ── Send Invitation (image blast) ─────────────────────────────────────────────

async function sendInvitation(req, res) {
  const {
    imageUrl    = '',
    message     = '',
    textPosition,
    recipients  = [],
    includeRsvp = false,
    rsvpYesLabel = "Yes, I'll attend ✅",
    rsvpNoLabel  = "Sorry, can't make it ❌",
  } = req.body;

  const cleanRecipients = (Array.isArray(recipients) ? recipients : []).filter(r => {
    const phone = normalizePhone(r.mobile || r.phone || '');
    return phone.length >= 10;
  });

  if (!cleanRecipients.length) {
    return res.status(400).json({ message: 'At least one valid recipient is required' });
  }

  let success = 0;
  let failed  = 0;
  const errors = [];

  for (const recipient of cleanRecipients) {
    const phone = normalizePhone(recipient.mobile || recipient.phone || '');
    const recipientName = String(recipient.name || 'Guest').trim();
    const personalMsg   = String(message || '').replace(/\{name\}/gi, recipientName);

    try {
      if (imageUrl) {
        await baileysService.sendImage({ to: phone, imageUrl, caption: personalMsg });
        await BaileysMessage.create({
          to: phone, from: '', contactName: recipientName,
          conversationKey: getConversationKey(phone),
          direction: 'OUTGOING', source: 'INVITATION',
          messageType: 'IMAGE', bodyText: personalMsg, status: 'SENT',
          meta: { imageUrl, textPosition },
        });
      } else if (personalMsg) {
        await baileysService.sendText({ to: phone, text: personalMsg });
        await BaileysMessage.create({
          to: phone, from: '', contactName: recipientName,
          conversationKey: getConversationKey(phone),
          direction: 'OUTGOING', source: 'INVITATION',
          messageType: 'TEXT', bodyText: personalMsg, status: 'SENT',
        });
      }

      if (includeRsvp) {
        try {
          const rsvpText = `Please confirm your attendance:\n\n✅ Reply *${rsvpYesLabel}*\n❌ Reply *${rsvpNoLabel}*`;
          await baileysService.sendText({ to: phone, text: rsvpText });
          await BaileysMessage.create({
            to: phone, from: '', contactName: recipientName,
            conversationKey: getConversationKey(phone),
            direction: 'OUTGOING', source: 'INVITATION',
            messageType: 'TEXT', bodyText: rsvpText, status: 'SENT',
            meta: { rsvp: true, rsvpYesLabel, rsvpNoLabel },
          });
        } catch (rsvpErr) {
          console.warn('[baileys] RSVP send failed for', phone, rsvpErr.message);
        }
      }

      success++;
    } catch (err) {
      failed++;
      errors.push({ phone, error: err.message });
      await BaileysMessage.create({
        to: phone, contactName: recipientName,
        conversationKey: getConversationKey(phone),
        direction: 'OUTGOING', source: 'INVITATION',
        messageType: imageUrl ? 'IMAGE' : 'TEXT',
        bodyText: personalMsg, status: 'FAILED',
        meta: { error: err.message },
      }).catch(() => null);
    }
  }

  res.json({
    message: `Invitation sent: ${success} success, ${failed} failed`,
    total: recipients.length,
    success,
    failed,
    errors,
  });
}

// ── Group Members ─────────────────────────────────────────────────────────────

async function getBaileysGroups(req, res) {
  try {
    const groups = await baileysService.getGroups();
    res.json(groups);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function getBaileysGroupMembers(req, res) {
  try {
    const { groupId } = req.params;
    const data = await baileysService.getGroupMembers(decodeURIComponent(groupId));
    if (!data) return res.status(404).json({ message: 'Group not found or Baileys not connected.' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function getAllBaileysGroupMembers(req, res) {
  try {
    const members = await baileysService.getAllGroupMembers();
    res.json(members);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function saveGroupMembersToMongo(req, res) {
  const { members = [] } = req.body;
  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ message: 'members array is required' });
  }
  let saved = 0, skipped = 0;
  for (const m of members) {
    if (!m.phone || !m.groupId) { skipped++; continue; }
    try {
      await WhatsAppGroupMember.findOneAndUpdate(
        { phone: m.phone, groupId: m.groupId },
        { $set: { name: m.name || '', groupName: m.groupName || '', role: m.role || 'member', jid: m.jid || '' } },
        { upsert: true }
      );
      saved++;
    } catch (_) { skipped++; }
  }
  res.json({ message: `${saved} saved, ${skipped} skipped`, saved, skipped });
}

// ── Auto-reply rules ──────────────────────────────────────────────────────────

async function getRules(req, res) {
  try {
    const rules = await BaileysRule.find().sort({ priority: 1, createdAt: -1 }).lean();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function saveRule(req, res) {
  try {
    const { id } = req.params;
    let rule;
    if (id) {
      rule = await BaileysRule.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!rule) return res.status(404).json({ message: 'Rule not found' });
    } else {
      rule = await BaileysRule.create(req.body);
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// ── Incoming (called from baileysService event) ───────────────────────────────

async function saveIncomingMessage({ id, from, body, type, raw }) {
  const existing = id
    ? await BaileysMessage.findOne({ baileysMessageId: id })
    : null;
  if (existing) return existing;

  const created = await BaileysMessage.create({
    to: '',
    from: normalizePhone(from),
    conversationKey: getConversationKey(from),
    baileysMessageId: id || '',
    direction: 'INCOMING',
    source: 'WEBHOOK',
    messageType: String(type || 'TEXT').toUpperCase(),
    bodyText: body || '',
    status: 'RECEIVED',
    meta: raw || {},
  });

  emitEvent('baileys_message_logged', created);
  emitEvent('baileys_incoming_message', created);

  await Notification.create({
    title: 'New Baileys WhatsApp message',
    message: `${from} sent a new message`,
    type: 'WHATSAPP',
    targetRoles: ['ADMIN', 'SENIOR_TEAM'],
  }).catch(() => null);

  return created;
}

// Wire up incoming messages from the service layer
const socket = require('../services/socket');
(function wireIncoming() {
  if (!global._baileysIncomingWired) {
    global._baileysIncomingWired = true;
    const origEmit = socket.emitEvent;
    socket.emitEvent = function (event, data) {
      if (event === 'baileys_incoming_message') {
        saveIncomingMessage(data).catch(console.error);
      }
      return origEmit(event, data);
    };
  }
})();

module.exports = {
  getStatus,
  startConnection,
  stopConnection,
  getInbox,
  getConversation,
  markConversationRead,
  sendText,
  getLogs,
  sendInvitation,
  getRules,
  saveRule,
  getBaileysGroups,
  getBaileysGroupMembers,
  getAllBaileysGroupMembers,
  saveGroupMembersToMongo,
};
