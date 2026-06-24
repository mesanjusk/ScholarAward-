const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    phone:     { type: String, required: true, trim: true },
    name:      { type: String, default: '',    trim: true },
    groupId:   { type: String, required: true },
    groupName: { type: String, default: '' },
    role:      { type: String, default: 'member' },
    jid:       { type: String, default: '' },
  },
  { timestamps: true }
);

schema.index({ phone: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('WhatsAppGroupMember', schema);
