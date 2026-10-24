const mongoose = require('mongoose');

const wellnessCheckInSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true },
  dateKey: { 
    type: String, 
    required: true },
  mood: { 
    type: String, 
    required: true, 
    enum: ['Very low', 'Low', 'Okay', 'Good', 'Great'] },
  note: { 
    type: String, 
    trim: true, 
    maxlength: 500, 
    default: '' },
  savedAt: { 
    type: Date, 
    default: Date.now, 
    index: true }
}, { timestamps: true });

wellnessCheckInSchema.index({ 
  userId: 1, savedAt: -1 });
wellnessCheckInSchema.index(
  { 
    userId: 1, 
    dateKey: 1 
  },
  { 
    unique: true, 
    partialFilterExpression: { 
      dateKey: { 
        $type: 'string' 
      } 
    } 
  }
);

module.exports = mongoose.model('WellnessCheckIn', wellnessCheckInSchema);
