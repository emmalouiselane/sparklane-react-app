const mongoose = require('mongoose');

const budgetSettingsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User'
  },
  payDay: {
    type: Number,
    min: 1,
    max: 31,
    default: 28
  }
}, {
  timestamps: true
});

budgetSettingsSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('BudgetSettings', budgetSettingsSchema);
