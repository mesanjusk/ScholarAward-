const mongoose = require('mongoose');

const presenterSchema = new mongoose.Schema({
  name:  { type: String, default: '' },
  row:   { type: Number, default: 1 },  // 1=Team, 2=Guest/Org, 3=Special1, 4=Special2
  slot:  { type: Number, default: 1 },  // 1 or 2 (left/right within the row)
}, { _id: false });

const studentEntrySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  name:       { type: String, required: true },
  percentage: { type: String, default: '' },
  extra:      { type: String, default: '' },
  presenters: { type: [presenterSchema], default: [] },
  order:      { type: Number, default: 0 },
  status:     { type: String, default: 'live', enum: ['live', 'done'] },
}, { _id: false });

const agendaCategorySchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  order:    { type: Number, default: 0 },
  students: { type: [studentEntrySchema], default: [] },
  status:   { type: String, default: 'live', enum: ['live', 'done'] },
}, { timestamps: true });

module.exports = mongoose.model('AgendaCategory', agendaCategorySchema);
