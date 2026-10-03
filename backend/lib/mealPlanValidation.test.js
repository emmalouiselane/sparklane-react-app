const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyPlan, validateMealPlan } = require('./mealPlanValidation');

test('validates seven day slots, legacy dates, meal text and shopping items', () => {
  assert.equal(validateMealPlan(emptyPlan()), null);
  assert.equal(validateMealPlan({ ...emptyPlan(), dayWeekdays: { 'day-1': 5, 'day-7': 0 } }), null);
  for (const dayWeekdays of [null, [], { 'day-8': 0 }, { 'day-1': 7 }, { 'day-1': -1 }, { 'day-1': 'Monday' }, { 'day-1': 1.5 }]) assert.equal(typeof validateMealPlan({ ...emptyPlan(), dayWeekdays }), 'string');
  for (const startDay of [0, 6]) assert.equal(validateMealPlan({ ...emptyPlan(), startDay }), null);
  for (const startDay of [-1, 7, 1.5, 'Monday', null]) assert.equal(typeof validateMealPlan({ ...emptyPlan(), startDay }), 'string');
  assert.equal(validateMealPlan({ ...emptyPlan(), meals: { '2026-10-03': 'Toast' } }), null);
  assert.equal(validateMealPlan({ ...emptyPlan(), meals: { 'day-1': 'Toast', 'day-7': 'Pasta' } }), null);
  for (const day of ['day-0', 'day-8', 'day-01', 'Monday']) {
    assert.equal(typeof validateMealPlan({ ...emptyPlan(), meals: { [day]: 'Toast' } }), 'string');
  }
  for (const patch of [{ meals: { '2026-02-30': 'Toast' } }, { backup: 'x'.repeat(201) }, { shopping: [{ id: '1', name: 'Bread', checked: 'yes' }] }, { shopping: Array(201).fill({ id: '1', name: 'Bread', checked: false }) }, { shopping: [{ id: '1', name: 'Bread', checked: false }, { id: '1', name: 'Milk', checked: true }] }]) {
    assert.equal(typeof validateMealPlan({ ...emptyPlan(), ...patch }), 'string');
  }
});

test('reads and writes only the authenticated user and detects stale revisions', async () => {
  const MealPlan = require('../models/MealPlan');
  const router = require('../routes/mealPlanner');
  const get = router.stack.find(layer => layer.route?.methods.get).route.stack[0].handle;
  const put = router.stack.find(layer => layer.route?.methods.put).route.stack[0].handle;
  const originals = [MealPlan.findOne, MealPlan.findOneAndUpdate];
  let filter, update;
  let result = { plan: emptyPlan(), revision: 3 };
  MealPlan.findOne = async query => { filter = query; return result; };
  MealPlan.findOneAndUpdate = async (query, changes) => { filter = query; update = changes; return result; };
  const req = { user: { id: 'account', googleId: 'owner' }, body: { userId: 'someone-else', plan: { ...emptyPlan(), startDay: 5, dayWeekdays: { 'day-1': 2 } }, revision: 2 } };
  const res = { statusCode: 200, json(value) { this.body = value; return this; }, status(code) { this.statusCode = code; return this; } };
  try {
    await get(req, res);
    assert.deepEqual(filter, { userId: 'owner' });
    await put(req, res);
    assert.deepEqual(filter, { userId: 'owner', revision: 2 });
    assert.equal(update.$inc.revision, 1);
    assert.equal(update.$set.plan.startDay, 5);
    assert.deepEqual(update.$set.plan.dayWeekdays, { 'day-1': 2 });
    assert.equal(res.body.revision, 3);
    result = null;
    await put(req, res);
    assert.equal(res.statusCode, 409);
    MealPlan.findOneAndUpdate = async () => { throw { code: 11000 }; };
    req.body.revision = 0;
    await put(req, res);
    assert.equal(res.statusCode, 409);
  } finally {
    [MealPlan.findOne, MealPlan.findOneAndUpdate] = originals;
  }
});
