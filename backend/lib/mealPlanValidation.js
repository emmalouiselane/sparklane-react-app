const { isValidDate } = require('./routineValidation');
const emptyPlan = () => ({ meals: {}, breakfast: '', lunch: '', backup: '', shopping: [] });
const isText = value => typeof value === 'string' && value.length <= 200;

function validateMealPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return 'A meal plan is required';
  if (plan.startDay !== undefined && (!Number.isInteger(plan.startDay) || plan.startDay < 0 || plan.startDay > 6)) return 'Start day must be a weekday from 0 to 6';
  if (plan.dayWeekdays !== undefined && (!plan.dayWeekdays || typeof plan.dayWeekdays !== 'object' || Array.isArray(plan.dayWeekdays) || Object.entries(plan.dayWeekdays).some(([day, weekday]) => !/^day-[1-7]$/.test(day) || !Number.isInteger(weekday) || weekday < 0 || weekday > 6))) return 'Each day must have a weekday from 0 to 6';
  if (!plan.meals || typeof plan.meals !== 'object' || Array.isArray(plan.meals)) return 'Meals must be a day-to-meal object';
  // Continue accepting saved dated entries while new plans use seven stable day slots.
  if (Object.keys(plan.meals).length > 3667 || Object.entries(plan.meals).some(([day, meal]) => (!/^day-[1-7]$/.test(day) && !isValidDate(day)) || !isText(meal))) return 'Meals must use Day 1 to Day 7 or legacy dates and text of up to 200 characters';
  if (!['breakfast', 'lunch', 'backup'].every(key => isText(plan[key]))) return 'Breakfast, lunch and backup must be text of up to 200 characters';
  if (!Array.isArray(plan.shopping) || plan.shopping.length > 200) return 'Shopping list can contain up to 200 items';
  const ids = new Set();
  for (const item of plan.shopping) {
    if (!item || !isText(item.id) || !item.id.trim() || ids.has(item.id) || !isText(item.name) || !item.name.trim() || typeof item.checked !== 'boolean') return 'Shopping items need a unique ID, a name and a checked status';
    ids.add(item.id);
  }
  return null;
}

module.exports = { emptyPlan, validateMealPlan };
