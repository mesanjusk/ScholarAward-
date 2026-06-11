const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  sendText, getRecipients, sendInvitation,
  saveBlast, listBlasts, getBlastById, updateBlast,
  getInbox, getConversation, markConversationRead,
  verifyWebhook, receiveWebhook, getGroups,
} = require('../controllers/whatsappController');
const crudRoutes = require('./crudRoutes');

router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

router.use('/connections',      crudRoutes(require('../models/WhatsAppConnection')));
router.use('/templates',        crudRoutes(require('../models/WhatsAppTemplate')));
router.use('/messages',         crudRoutes(require('../models/WhatsAppMessage')));
router.use('/auto-reply-rules', crudRoutes(require('../models/WhatsAppAutoReplyRule')));

router.get('/inbox',                           protect, getInbox);
router.get('/conversation/:conversationKey',   protect, getConversation);
router.post('/conversation/:conversationKey/read', protect, markConversationRead);
router.get('/recipients',    protect, getRecipients);
router.post('/send-text',    protect, sendText);
router.post('/send-invitation', protect, sendInvitation);

// Blast campaigns
router.post('/blasts',       protect, saveBlast);
router.get('/blasts',        protect, listBlasts);
router.get('/blasts/:id',    protect, getBlastById);
router.patch('/blasts/:id',  protect, updateBlast);

router.get('/groups', protect, getGroups);
module.exports = router;
