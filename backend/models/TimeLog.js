const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  durationHours: {
    type: Number,
    required: true,
    min: 0.1
  },
  date: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

timeLogSchema.index({ userId: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('TimeLog', timeLogSchema);
