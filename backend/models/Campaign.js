const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  name:   { type: String, default: '' },
  mobile: { type: String, default: '' },
  status: { type: String, enum: ['PENDING','SENT','FAILED'], default: 'PENDING' },
  error:  { type: String, default: '' },
  sentAt: { type: Date },
}, { _id: false });

const schema = new mongoose.Schema({
  title:        { type: String, default: 'Untitled Campaign' },
  imageUrl:     { type: String, default: '' },
  message:      { type: String, default: '' },
  fontStyle:    { type: mongoose.Schema.Types.Mixed, default: {} },
  includeRsvp:  { type: Boolean, default: false },
  rsvpYesLabel: { type: String, default: "Yes, I'll attend ✅" },
  rsvpNoLabel:  { type: String, default: "Sorry, can't make it ❌" },
  recipients:   [recipientSchema],
  scheduledAt:  { type: Date, default: null },
  // AUTO = send via API automatically; MANUAL = wa.me links, remind user
  type:         { type: String, enum: ['AUTO', 'MANUAL'], default: 'MANUAL' },
  status:       { type: String, enum: ['DRAFT','SCHEDULED','SENDING','SENT','CANCELLED'], default: 'DRAFT' },
  sentCount:    { type: Number, default: 0 },
  failedCount:  { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', schema);
