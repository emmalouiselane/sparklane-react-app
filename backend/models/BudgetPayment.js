const mongoose = require('mongoose');

const budgetPaymentSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  kind: {
    type: String,
    enum: ['single', 'recurring'],
    required: true
  },
  date: {
    type: String,
    trim: true
  },
  startDate: {
    type: String,
    trim: true
  },
  paidDates: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

budgetPaymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BudgetPayment', budgetPaymentSchema);
