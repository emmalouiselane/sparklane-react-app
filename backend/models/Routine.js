const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  days: { type: [Number], required: true },
  time: { type: String, default: '' },
  steps: [{ title: { type: String, required: true, maxlength: 200 }, completedOn: { type: String, default: '' } }]
}, { timestamps: true });

module.exports = mongoose.model('Routine', routineSchema);
