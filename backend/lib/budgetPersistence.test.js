const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const BudgetPayment = require('../models/BudgetPayment');

test('recurring splits save both halves in one transaction and report write failure', async () => {
  const router = require('../routes/budget');
  const handler = router.stack.find(layer => layer.route?.path === '/payments/:id' && layer.route.methods.patch).route.stack[0].handle;
  const originalFind = BudgetPayment.findOne;
  const originalSave = BudgetPayment.prototype.save;
  const originalTransaction = mongoose.connection.transaction;
  const session = {};
  let writes, committed, fail;
  BudgetPayment.findOne = async query => {
    assert.equal(query.userId, 'owner');
    return new BudgetPayment({ userId: 'owner', title: 'Bill', amount: 10, type: 'expense', kind: 'recurring', startDate: '2026-01-01' });
  };
  BudgetPayment.prototype.save = async function(options) {
    assert.equal(options.session, session);
    assert.equal(this.userId, 'owner');
    writes.push(this);
    if (fail && writes.length === 2) throw new Error('Second write failed');
    return this;
  };
  mongoose.connection.transaction = async callback => {
    await callback(session);
    committed = true;
  };
  const req = { user: { googleId: 'owner' }, params: { id: '507f1f77bcf86cd799439011' }, body: { amount: 20, scope: 'this-and-future', date: '2026-03-01', userId: 'victim' } };
  try {
    for (fail of [false, true]) {
      writes = []; committed = false;
      const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      const originalError = console.error;
      try {
        if (fail) console.error = () => {};
        await handler(req, res);
      } finally { console.error = originalError; }
      assert.equal(writes.length, 2);
      assert.equal(committed, !fail);
      assert.equal(res.code, fail ? 500 : 200);
      if (!fail) {
        assert.equal(res.body.payment.endDate, '2026-02-01');
        assert.equal(res.body.createdPayment.startDate, '2026-03-01');
      }
    }
  } finally {
    BudgetPayment.findOne = originalFind;
    BudgetPayment.prototype.save = originalSave;
    mongoose.connection.transaction = originalTransaction;
  }
});
