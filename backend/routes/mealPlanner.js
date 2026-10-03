const express = require('express');
const MealPlan = require('../models/MealPlan');
const { emptyPlan, validateMealPlan } = require('../lib/mealPlanValidation');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.use(requireTrustedOrigin);

router.get('/', async (req, res) => {
  try {
    const saved = await MealPlan.findOne({ userId: getAppUserId(req.user) });
    res.json({ plan: saved?.plan || emptyPlan(), revision: saved?.revision || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Could not load your meal plan' });
  }
});

router.put('/', async (req, res) => {
  const { plan, revision } = req.body || {};
  const error = validateMealPlan(plan);
  if (error || !Number.isSafeInteger(revision) || revision < 0) return res.status(400).json({ error: error || 'A valid revision is required' });
  // Only the authenticated session selects the owner. Never trust a supplied user ID.
  const userId = getAppUserId(req.user);
  const cleanPlan = { meals: plan.meals, startDay: plan.startDay ?? 0, dayWeekdays: plan.dayWeekdays ?? {}, breakfast: plan.breakfast, lunch: plan.lunch, backup: plan.backup, shopping: plan.shopping.map(({ id, name, checked }) => ({ id, name, checked })) };
  try {
    const saved = await MealPlan.findOneAndUpdate(
      { userId, revision },
      { $set: { plan: cleanPlan }, $inc: { revision: 1 } },
      { new: true, upsert: revision === 0, runValidators: true }
    );
    if (!saved) return res.status(409).json({ error: 'Your plan changed on another device' });
    res.json({ plan: saved.plan, revision: saved.revision });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Your plan changed on another device' });
    res.status(500).json({ error: 'Could not save your meal plan' });
  }
});

module.exports = router;
