const mongoose = require('mongoose');

const presenterSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { _id: false });

const studentEntrySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  name:       { type: String, required: true },
  percentage: { type: String, default: '' },
  extra:      { type: String, default: '' },
  presenters: { type: [presenterSchema], default: [] },
  order:      { type: Number, default: 0 },
}, { _id: false });

const agendaCategorySchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  order:    { type: Number, default: 0 },
  students: { type: [studentEntrySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('AgendaCategory', agendaCategorySchema);
