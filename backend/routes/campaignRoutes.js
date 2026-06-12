const router  = require('express').Router();
const { protect } = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const baileysService = require('../services/baileysService');
const BaileysMessage = require('../models/BaileysMessage');

function normalizePhone(v) {
  const d = String(v || '').replace(/[^\d]/g, '').trim();
  return d.length === 10 ? '91' + d : d;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

router.get('/', protect, async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);
    res.status(201).json(campaign);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const c = await Campaign.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id', protect, async (req, res) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Trigger: manually fire an AUTO campaign now ───────────────────────────────
router.post('/:id/send', protect, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.status === 'SENDING') return res.status(409).json({ message: 'Already sending' });

    await Campaign.findByIdAndUpdate(campaign._id, { status: 'SENDING' });
    res.json({ message: 'Campaign send started', id: campaign._id });

    // Fire and forget
    runCampaign(campaign).catch(console.error);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Internal runner (Baileys) ─────────────────────────────────────────────────
async function runCampaign(campaign) {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand  = () => (Math.floor(Math.random() * 9) + 12) * 1000; // 12–20s

  let sent = 0, failed = 0;
  const updatedRecipients = campaign.recipients.map(r => ({ ...r.toObject(), status: 'PENDING' }));

  for (let i = 0; i < updatedRecipients.length; i++) {
    const r = updatedRecipients[i];
    const phone = normalizePhone(r.mobile);
    const personalMsg = (campaign.message || '').replace(/\{name\}/gi, r.name);
    try {
      if (campaign.imageUrl) {
        await baileysService.sendImage({ to: phone, imageUrl: campaign.imageUrl, caption: personalMsg });
      } else {
        await baileysService.sendText({ to: phone, body: personalMsg });
      }
      await BaileysMessage.create({
        to: phone, from: '', contactName: r.name,
        conversationKey: phone,
        direction: 'OUTGOING', source: 'CAMPAIGN',
        messageType: campaign.imageUrl ? 'IMAGE' : 'TEXT',
        bodyText: personalMsg, status: 'SENT',
        meta: { campaignId: campaign._id },
      }).catch(() => null);
      updatedRecipients[i].status = 'SENT';
      updatedRecipients[i].sentAt = new Date();
      sent++;
    } catch (err) {
      updatedRecipients[i].status = 'FAILED';
      updatedRecipients[i].error  = err.message;
      failed++;
    }
    if (i < updatedRecipients.length - 1) await sleep(rand());
  }

  await Campaign.findByIdAndUpdate(campaign._id, {
    status: 'SENT',
    sentCount: sent,
    failedCount: failed,
    recipients: updatedRecipients,
  });
}

// ── Background scheduler — checks every minute for due campaigns ──────────────
function startScheduler() {
  setInterval(async () => {
    try {
      const due = await Campaign.find({
        status: 'SCHEDULED',
        type: 'AUTO',
        scheduledAt: { $lte: new Date() },
      });
      for (const c of due) {
        await Campaign.findByIdAndUpdate(c._id, { status: 'SENDING' });
        runCampaign(c).catch(console.error);
      }
    } catch (_) {}
  }, 60 * 1000); // every 60s
}

startScheduler();

module.exports = router;
