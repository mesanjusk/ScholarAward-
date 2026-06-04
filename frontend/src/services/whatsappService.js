import api from '../api';

const whatsappService = {
  // ── Official Cloud API ────────────────────────────────────────────────────
  getConnections:      ()           => api.get('/whatsapp/connections'),
  getTemplates:        ()           => api.get('/whatsapp/templates'),
  getMessages:         ()           => api.get('/whatsapp/messages'),
  getRecipients:       ()           => api.get('/whatsapp/recipients'),
  getInbox:            ()           => api.get('/whatsapp/inbox'),
  getConversation:     (key)        => api.get(`/whatsapp/conversation/${key}`),
  markConversationRead:(key)        => api.post(`/whatsapp/conversation/${key}/read`),
  getRules:            ()           => api.get('/whatsapp/auto-reply-rules'),
  saveRule:            (payload, id)=> id
    ? api.put(`/whatsapp/auto-reply-rules/${id}`, payload)
    : api.post('/whatsapp/auto-reply-rules', payload),
  sendText:            (payload)    => api.post('/whatsapp/send-text', payload),
  sendInvitation:      (payload)    => api.post('/whatsapp/send-invitation', payload),

  // ── Baileys (unofficial) ──────────────────────────────────────────────────
  baileysGetStatus:    ()           => api.get('/baileys/status'),
  baileysConnect:      ()           => api.post('/baileys/connect'),
  baileysDisconnect:   ()           => api.post('/baileys/disconnect'),

  baileysGetInbox:     ()           => api.get('/baileys/inbox'),
  baileysGetConversation: (key)     => api.get(`/baileys/conversation/${key}`),
  baileysMarkRead:     (key)        => api.post(`/baileys/conversation/${key}/read`),

  baileysSendText:     (payload)    => api.post('/baileys/send-text', payload),
  baileysSendInvitation:(payload)   => api.post('/baileys/send-invite', payload),

  baileysGetRules:     ()           => api.get('/baileys/rules'),
  baileysSaveRule:     (payload, id)=> id
    ? api.put(`/baileys/rules/${id}`, payload)
    : api.post('/baileys/rules', payload),

  baileysGetLogs:      ()           => api.get('/baileys/logs'),
};

export default whatsappService;