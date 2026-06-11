const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppAutoReplyRule = require('../models/WhatsAppAutoReplyRule');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const { emitEvent } = require('../services/socket');
const WhatsAppBlast = require('../models/WhatsAppBlast');
const { sendTemplateMessage, sendTextMessage, uploadWhatsAppMedia, sendImageMessage } = require('../services/whatsappService');
function normalizePhone(value) { const d = String(value || '').replace(/[^\d]/g, '').trim(); return d.length === 10 ? '91' + d : d; }
function uniqueRecipients(items = []) { const seen = new Set(); return items.filter((item) => { const mobile = normalizePhone(item.mobile); if (!mobile || seen.has(mobile)) return false; seen.add(mobile); item.mobile = mobile; return true; }); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function getConversationKey(primary, fallback = '') { return normalizePhone(primary || fallback); }
function extractMessageText(message = {}) { if (message?.text?.body) return String(message.text.body); if (message?.button?.text) return String(message.button.text); if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title); if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title); if (message?.type === 'image') return '[image]'; if (message?.type === 'document') return '[document]'; if (message?.type === 'audio') return '[audio]'; if (message?.type === 'video') return '[video]'; return ''; }
function generateImageWithName(baseUrl, name, pos = {}) { if (!baseUrl || !String(baseUrl).includes('/upload/')) return baseUrl; const safeName = String(name || 'Guest').trim() || 'Guest'; const encodedText = encodeURIComponent(safeName); const color = String(pos?.color || '#000000').replace('#', '') || '000000'; const originalWidth = Number(pos?.imageWidth) > 0 ? Number(pos.imageWidth) : 0; const originalHeight = Number(pos?.imageHeight) > 0 ? Number(pos.imageHeight) : 0; const previewWidth = Number(pos?.previewWidth) > 0 ? Number(pos.previewWidth) : 0; let x = 150; let y = 200; let fontSize = Number(pos?.fontSize) > 0 ? Number(pos.fontSize) : 30; const hasPercentPosition = Number.isFinite(Number(pos?.xPercent)) && Number.isFinite(Number(pos?.yPercent)); if (hasPercentPosition && originalWidth > 0 && originalHeight > 0) { const xPercent = clamp(Number(pos.xPercent), 0, 0.98); const yPercent = clamp(Number(pos.yPercent), 0, 0.98); x = Math.round(originalWidth * xPercent); y = Math.round(originalHeight * yPercent); if (Number(pos?.fontSize) > 0 && previewWidth > 0) fontSize = Math.max(12, Math.round((Number(pos.fontSize) / previewWidth) * originalWidth)); } else { x = Number.isFinite(Number(pos?.x)) ? Math.round(Number(pos.x)) : 150; y = Number.isFinite(Number(pos?.y)) ? Math.round(Number(pos.y)) : 200; } return baseUrl.replace('/upload/', `/upload/l_text:Arial_${fontSize}_bold:${encodedText},co_rgb:${color},g_north_west,x_${x},y_${y}/`); }
async function createOutboundLog({ to, contactName = '', bodyText = '', templateName = '', messageType = 'TEXT', status = 'SENT', source = 'MANUAL', isAutoReply = false, providerResponse = {}, replyToMessageId = '' }) { const log = await WhatsAppMessage.create({ to: normalizePhone(to), from: process.env.WHATSAPP_PHONE_NUMBER_ID || '', contactName, conversationKey: getConversationKey(to), waMessageId: providerResponse?.messages?.[0]?.id || '', replyToMessageId, direction: 'OUTGOING', source, messageType, templateName, bodyText, status, isAutoReply, meta: providerResponse || {} }); emitEvent('whatsapp_message_logged', log); return log; }
async function runAutoReply(incomingMessage) { const incomingText = String(incomingMessage?.bodyText || '').trim().toLowerCase(); const rules = await WhatsAppAutoReplyRule.find({ isActive: true }).sort({ priority: 1, createdAt: -1 }).lean(); for (const rule of rules) { const trigger = String(rule.triggerText || '').trim().toLowerCase(); const matched = rule.matchType === 'ALL' ? true : rule.matchType === 'EXACT' ? incomingText === trigger : rule.matchType === 'STARTS_WITH' ? incomingText.startsWith(trigger) : incomingText.includes(trigger); if (!matched) continue; try { let providerResponse = {}; if (rule.replyType === 'TEMPLATE' && rule.templateName) providerResponse = await sendTemplateMessage({ to: incomingMessage.from, templateName: rule.templateName, languageCode: rule.templateLanguage || 'en_US' }); else if (rule.replyText) providerResponse = await sendTextMessage({ to: incomingMessage.from, body: rule.replyText }); else continue; await createOutboundLog({ to: incomingMessage.from, contactName: incomingMessage.contactName, bodyText: rule.replyType === 'TEXT' ? rule.replyText : '', templateName: rule.replyType === 'TEMPLATE' ? rule.templateName : '', messageType: rule.replyType === 'TEMPLATE' ? 'TEMPLATE' : 'TEXT', status: providerResponse?.messages?.length ? 'SENT' : 'QUEUED', source: 'AUTO_REPLY', isAutoReply: true, providerResponse, replyToMessageId: incomingMessage.waMessageId || '' }); if (rule.stopAfterMatch !== false) break; } catch (error) { await createOutboundLog({ to: incomingMessage.from, contactName: incomingMessage.contactName, bodyText: rule.replyType === 'TEXT' ? rule.replyText : '', templateName: rule.replyType === 'TEMPLATE' ? rule.templateName : '', messageType: rule.replyType === 'TEMPLATE' ? 'TEMPLATE' : 'TEXT', status: 'FAILED', source: 'AUTO_REPLY', isAutoReply: true, providerResponse: { error: error?.response?.data || error.message }, replyToMessageId: incomingMessage.waMessageId || '' }); break; } } }
async function saveIncomingMessage(message, contactMap = {}) { const from = normalizePhone(message?.from); if (!from) return null; const waMessageId = String(message?.id || ''); const existing = waMessageId ? await WhatsAppMessage.findOne({ waMessageId }) : null; if (existing) return existing; const created = await WhatsAppMessage.create({ to: process.env.WHATSAPP_PHONE_NUMBER_ID || '', from, contactName: contactMap[from] || '', conversationKey: getConversationKey(from), waMessageId, direction: 'INCOMING', source: 'WEBHOOK', messageType: String(message?.type || 'TEXT').toUpperCase(), bodyText: extractMessageText(message), mediaUrl: message?.image?.id || message?.document?.id || '', status: 'RECEIVED', meta: message || {} }); emitEvent('whatsapp_message_logged', created); emitEvent('whatsapp_incoming_message', created); await Notification.create({ title: 'New WhatsApp message', message: `${created.contactName || from} sent a new message`, type: 'WHATSAPP', targetRoles: ['ADMIN', 'SENIOR_TEAM'] }).catch(() => null); await runAutoReply(created); return created; }
async function getInbox(req, res) { const messages = await WhatsAppMessage.find({ conversationKey: { $ne: '' } }).sort({ createdAt: -1 }).limit(400).lean(); const grouped = new Map(); for (const item of messages) { const key = item.conversationKey || getConversationKey(item.from || item.to); if (!key) continue; const current = grouped.get(key); if (!current) grouped.set(key, { conversationKey: key, phone: key, contactName: item.contactName || '', lastMessage: item.bodyText || item.templateName || item.messageType, lastMessageAt: item.createdAt, lastDirection: item.direction, unreadCount: item.direction === 'INCOMING' && item.status !== 'READ' ? 1 : 0, lastStatus: item.status, messages: 1 }); else { current.unreadCount += item.direction === 'INCOMING' && item.status !== 'READ' ? 1 : 0; current.messages += 1; if (!current.contactName && item.contactName) current.contactName = item.contactName; } } res.json(Array.from(grouped.values()).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))); }
async function getConversation(req, res) { const conversationKey = getConversationKey(req.params.conversationKey); const rows = await WhatsAppMessage.find({ conversationKey }).sort({ createdAt: 1 }).lean(); res.json(rows); }
async function markConversationRead(req, res) { const conversationKey = getConversationKey(req.params.conversationKey); await WhatsAppMessage.updateMany({ conversationKey, direction: 'INCOMING', status: { $in: ['RECEIVED', 'DELIVERED'] } }, { $set: { status: 'READ' } }); res.json({ message: 'Conversation marked as read' }); }
async function sendText(req, res) { const { to, text, templateName, contactName = '', replyToMessageId = '' } = req.body; try { let providerResponse = null; if (templateName) providerResponse = await sendTemplateMessage({ to, templateName, languageCode: 'en_US' }); else if (text) providerResponse = await sendTextMessage({ to, body: text }); else return res.status(400).json({ message: 'Text or templateName is required' }); const log = await createOutboundLog({ to, contactName, bodyText: text || '', templateName: templateName || '', messageType: templateName ? 'TEMPLATE' : 'TEXT', status: providerResponse?.messages?.length ? 'SENT' : 'QUEUED', source: 'MANUAL', providerResponse, replyToMessageId }); await Notification.create({ title: 'WhatsApp reply sent', message: `WhatsApp ${templateName ? 'template' : 'text'} sent to ${to}`, type: 'WHATSAPP', targetRoles: ['ADMIN', 'SENIOR_TEAM'] }).catch(() => null); emitEvent('notification_created', { type: 'WHATSAPP', to }); return res.status(201).json(log); } catch (error) { const failureLog = await createOutboundLog({ to, contactName, bodyText: text || '', templateName: templateName || '', messageType: templateName ? 'TEMPLATE' : 'TEXT', status: 'FAILED', source: 'MANUAL', providerResponse: { error: error?.response?.data || error.message }, replyToMessageId }); return res.status(500).json(failureLog); } }
async function getRecipients(req, res) { const [students, volunteers, parents, teamMembers, guests] = await Promise.all([ Student.find({}, 'fullName mobile schoolName className').sort({ fullName: 1 }).lean(), Volunteer.find({}, 'fullName mobile teamOther').sort({ fullName: 1 }).lean(), Student.find({}, 'fullName parentMobile schoolName className').sort({ fullName: 1 }).lean(), User.find({ isActive: true, eventDutyType: { $in: ['VOLUNTEER', 'TEAM_LEADER', 'SENIOR_TEAM', 'ADMIN', 'HOST', 'CERTIFICATE_TEAM'] } }, 'name mobile eventDutyType').sort({ name: 1 }).lean(), User.find({ isActive: true, eventDutyType: 'GUEST' }, 'name mobile eventDutyType').sort({ name: 1 }).lean() ]); res.json({ students: uniqueRecipients(students.map((item) => ({ name: item.fullName, mobile: item.mobile, source: 'STUDENT', meta: { schoolName: item.schoolName || '', className: item.className || '' } }))), parents: uniqueRecipients(parents.map((item) => ({ name: `${item.fullName} Parent`, mobile: item.parentMobile, source: 'PARENT', meta: { studentName: item.fullName, schoolName: item.schoolName || '', className: item.className || '' } }))), teamMembers: uniqueRecipients(teamMembers.map((item) => ({ name: item.name, mobile: item.mobile, source: 'TEAM_MEMBER', meta: { dutyType: item.eventDutyType || '' } }))), volunteers: uniqueRecipients(volunteers.map((item) => ({ name: item.fullName, mobile: item.mobile, source: 'VOLUNTEER', meta: { team: item.teamOther || '' } }))), guests: uniqueRecipients(guests.map((item) => ({ name: item.name, mobile: item.mobile, source: 'GUEST', meta: { dutyType: item.eventDutyType || '' } }))) }); }
async function sendInvitation(req, res) {
  const {
    imageUrl = '',
    message = '',
    textPosition,
    recipients = [],
    includeRsvp = false,
    rsvpYesLabel = "Yes, I'll attend ✅",
    rsvpNoLabel  = "Sorry, can't make it ❌",
  } = req.body;

  const cleanRecipients = uniqueRecipients(
    (Array.isArray(recipients) ? recipients : []).map((item) => ({
      name:   String(item?.name || item?.fullName || 'Guest').trim() || 'Guest',
      mobile: item?.mobile || item?.phone || item?.number || item?.whatsapp,
      source: item?.source || 'CUSTOM',
    }))
  ).filter((item) => String(item.mobile || '').length >= 10);

  if (!cleanRecipients.length)
    return res.status(400).json({ message: 'At least one valid recipient is required' });

  const results = [];

  for (const recipient of cleanRecipients) {
    const recipientName = String(recipient.name || 'Guest').trim();
    const personalMsg   = String(message || '').replace(/\{name\}/gi, recipientName);

    try {
      let providerResponse = {};

      if (String(imageUrl).trim()) {
        // Image provided — upload to WhatsApp then send as image + caption
        const mediaUpload   = await uploadWhatsAppMedia({ fileUrl: imageUrl });
        const uploadedId    = mediaUpload?.id || '';
        providerResponse    = await sendImageMessage({ to: recipient.mobile, mediaId: uploadedId, caption: personalMsg });
        await createOutboundLog({
          to: recipient.mobile, contactName: recipientName,
          bodyText: personalMsg, messageType: 'IMAGE',
          status: providerResponse?.messages?.length ? 'SENT' : 'QUEUED',
          source: 'INVITATION', providerResponse,
        });
      } else if (personalMsg) {
        // Text-only blast
        providerResponse = await sendTextMessage({ to: recipient.mobile, body: personalMsg });
        await createOutboundLog({
          to: recipient.mobile, contactName: recipientName,
          bodyText: personalMsg, messageType: 'TEXT',
          status: providerResponse?.messages?.length ? 'SENT' : 'QUEUED',
          source: 'INVITATION', providerResponse,
        });
      }

      if (includeRsvp) {
        try {
          const rsvpText = `Please confirm your attendance:\n\n✅ Reply *${rsvpYesLabel}*\n❌ Reply *${rsvpNoLabel}*`;
          const rsvpResp = await sendTextMessage({ to: recipient.mobile, body: rsvpText });
          await createOutboundLog({
            to: recipient.mobile, contactName: recipientName,
            bodyText: rsvpText, messageType: 'TEXT',
            status: rsvpResp?.messages?.length ? 'SENT' : 'QUEUED',
            source: 'INVITATION', providerResponse: rsvpResp,
          });
        } catch (rsvpErr) {
          console.warn('[whatsapp] RSVP text failed for', recipient.mobile, rsvpErr.message);
        }
      }

      results.push({ mobile: recipient.mobile, name: recipientName, success: true });
    } catch (error) {
      await createOutboundLog({
        to: recipient.mobile, contactName: recipientName,
        bodyText: personalMsg, messageType: imageUrl ? 'IMAGE' : 'TEXT',
        status: 'FAILED', source: 'INVITATION',
        providerResponse: { error: error?.response?.data || error.message },
      });
      results.push({ mobile: recipient.mobile, name: recipientName, success: false, error: error?.response?.data?.error?.message || error.message });
    }
  }

  emitEvent('whatsapp_invitation_sent', { total: results.length, success: results.filter((r) => r.success).length });
  res.json({
    total:   results.length,
    success: results.filter((r) => r.success).length,
    failed:  results.filter((r) => !r.success).length,
    results,
  });
}

async function saveBlast(req, res) {
  try {
    const blast = await WhatsAppBlast.create(req.body);
    res.status(201).json(blast);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function listBlasts(req, res) {
  const blasts = await WhatsAppBlast.find({}, '-recipients').sort({ createdAt: -1 }).limit(200).lean();
  res.json(blasts);
}

async function getBlastById(req, res) {
  const blast = await WhatsAppBlast.findById(req.params.id).lean();
  if (!blast) return res.status(404).json({ message: 'Not found' });
  res.json(blast);
}

async function updateBlast(req, res) {
  const blast = await WhatsAppBlast.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!blast) return res.status(404).json({ message: 'Not found' });
  res.json(blast);
}
async function verifyWebhook(req, res) { const mode = req.query['hub.mode']; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge']; if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) return res.status(200).send(challenge); return res.sendStatus(403); }
async function receiveWebhook(req, res) { try { const entries = Array.isArray(req.body?.entry) ? req.body.entry : []; for (const entry of entries) { for (const change of entry?.changes || []) { const value = change?.value || {}; const contactMap = {}; (value.contacts || []).forEach((contact) => { const waId = normalizePhone(contact?.wa_id); if (waId) contactMap[waId] = contact?.profile?.name || ''; }); for (const message of value.messages || []) await saveIncomingMessage(message, contactMap); for (const statusItem of value.statuses || []) { if (!statusItem?.id) continue; await WhatsAppMessage.findOneAndUpdate({ waMessageId: statusItem.id }, { $set: { status: String(statusItem.status || '').toUpperCase() || 'SENT', meta: statusItem || {} } }); } } } res.sendStatus(200); } catch (error) { console.error('receiveWebhook error', error?.response?.data || error.message || error); res.sendStatus(500); } }
const baileysService = require('../services/baileysService');
async function getGroups(req, res) {
  try {
    const groups = await baileysService.getGroups();
    res.json(groups);
  } catch (e) {
    console.error('[getGroups] error:', e.message);
    res.json([]);
  }
}
module.exports = { sendText, getRecipients, sendInvitation, saveBlast, listBlasts, getBlastById, updateBlast, getInbox, getConversation, markConversationRead, verifyWebhook, receiveWebhook, getGroups };
