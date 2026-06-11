const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  name:   { type: String, default: '' },
  mobile: { type: String, default: '' },
  source: { type: String, default: 'CUSTOM' },
  status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
  error:  { type: String, default: '' },
  sentAt: { type: Date },
}, { _id: false });

const schema = new mongoose.Schema({
  title:        { type: String, default: '' },
  message:      { type: String, default: '' },
  imageUrl:     { type: String, default: '' },
  includeRsvp:  { type: Boolean, default: false },
  rsvpYesLabel: { type: String, default: "Yes, I'll attend ✅" },
  rsvpNoLabel:  { type: String, default: "Sorry, can't make it ❌" },
  fontStyle:    { type: mongoose.Schema.Types.Mixed, default: {} },
  status:       { type: String, enum: ['DRAFT', 'SENDING', 'COMPLETED', 'CANCELLED'], default: 'DRAFT' },
  totalRecipients: { type: Number, default: 0 },
  sentCount:    { type: Number, default: 0 },
  failedCount:  { type: Number, default: 0 },
  recipients:   [recipientSchema],
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppBlast', schema);
