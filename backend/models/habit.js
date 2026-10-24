const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true },
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 120 },
  days: { 
    type: [Boolean], 
    default: () => Array(7).fill(false) },
  checkInDates: { 
    type: [String], 
    default: undefined }
}, { timestamps: true });

module.exports = mongoose.model('Habit', habitSchema);
