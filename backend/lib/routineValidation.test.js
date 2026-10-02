const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRoutine, isValidDate } = require('./routineValidation');
const valid = { title: 'Morning', days: [1, 2, 3], time: '08:30', steps: ['Pack lunch'] };

test('validates schedule, time and checklist limits', () => {
  assert.equal(validateRoutine(valid), null);
  for (const patch of [{ title: ' ' }, { days: [] }, { days: [7] }, { days: ['1'] }, { time: '25:00' }, { steps: [] }, { steps: [' '] }, { steps: ['x'.repeat(201)] }, { steps: Array(31).fill('Step') }]) {
    assert.equal(typeof validateRoutine({ ...valid, ...patch }), 'string');
  }
  assert.equal(validateRoutine({ ...valid, time: '' }), null);
});

test('completion dates must be real calendar dates including leap years', () => {
  assert.equal(isValidDate('2024-02-29'), true);
  for (const date of ['2025-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '', null]) assert.equal(isValidDate(date), false);
});

test('checklist update is scoped to the user, routine, step and scheduled weekday', async () => {
  const Routine = require('../models/Routine');
  const router = require('../routes/routines');
  const handler = router.stack.find(layer => layer.route?.path === '/:id/steps/:stepId').route.stack[0].handle;
  const original = Routine.findOneAndUpdate;
  let query;
  let update;
  Routine.findOneAndUpdate = async (filter, changes) => { query = filter; update = changes; return { title: 'Morning' }; };
  try {
    const req = { user: { id: 'account-123', googleId: 'google-123' }, params: { id: '507f1f77bcf86cd799439011', stepId: '507f1f77bcf86cd799439012' }, body: { date: '2026-10-02', completed: true } };
    const res = { json() {}, status() { return this; } };
    await handler(req, res);
    assert.equal(query._id, req.params.id);
    assert.equal(query.userId, 'google-123');
    assert.equal(query['steps._id'], req.params.stepId);
    assert.equal(query.days, 5);
    assert.equal(update.$set['steps.$.completedOn'], '2026-10-02');
    req.body.completed = false;
    await handler(req, res);
    assert.equal(update.$set['steps.$.completedOn'], '');
  } finally { Routine.findOneAndUpdate = original; }
});
