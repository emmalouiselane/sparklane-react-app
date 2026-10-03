const mongoose = require('mongoose');

const mealPlanSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  plan: { type: mongoose.Schema.Types.Mixed, required: true },
  revision: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
