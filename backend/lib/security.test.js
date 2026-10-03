const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Session = require('../models/Session');
const MongoSessionStore = require('./MongoSessionStore');
const Todo = require('../models/Todo');
const { requireAuth, requireTrustedOrigin } = require('../middleware/auth');

test('expired sessions cannot be renewed while awaiting MongoDB TTL cleanup', async () => {
  const original = Session.findOne;
  const store = new MongoSessionStore();
  try {
    for (const expiresAt of [new Date(Date.now() - 1000), undefined, new Date(Date.now() + 60000)]) {
      Session.findOne = () => ({ lean: async () => ({ expiresAt, session: JSON.stringify({ passport: { user: 'owner' } }) }) });
      const data = await new Promise((resolve, reject) => store.get('session', (error, value) => error ? reject(error) : resolve(value)));
      assert.equal(Boolean(data), Boolean(expiresAt && expiresAt > new Date()));
    }
  } finally { Session.findOne = original; }
});

test('authentication and origin checks reject unauthenticated and cross-site writes', () => {
  const res = { status(code) { this.code = code; return this; }, json() {} };
  let passed = false;
  requireAuth({ isAuthenticated: () => false }, res, () => { passed = true; });
  assert.equal(res.code, 401);
  assert.equal(passed, false);
  for (const origin of [undefined, 'https://attacker.example']) {
    requireTrustedOrigin({ method: 'POST', get: () => origin }, res, () => { passed = true; });
    assert.equal(res.code, 403);
    assert.equal(passed, false);
  }
  requireTrustedOrigin({ method: 'POST', get: () => 'http://localhost:3000' }, res, () => { passed = true; });
  assert.equal(passed, true);
});

test('todo routes reject other owners and bind mutations to the session owner', async () => {
  const original = { findOne: Todo.findOne, findOneAndUpdate: Todo.findOneAndUpdate, findOneAndDelete: Todo.findOneAndDelete };
  const calls = [];
  const id = '507f1f77bcf86cd799439011';
  Todo.findOne = async (query) => query._id === id && query.userId === 'owner' ? { _id: id } : null;
  Todo.findOneAndUpdate = async (query, update) => { calls.push(query); return { _id: id, ...update }; };
  Todo.findOneAndDelete = async (query) => { calls.push(query); return { _id: id }; };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { googleId: req.get('test-owner') }; req.isAuthenticated = () => Boolean(req.user.googleId); next(); });
  app.use('/todos', require('../routes/todos'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/todos/${id}`;
  try {
    for (const method of ['PUT', 'DELETE']) {
      const request = (owner) => fetch(url, { method, headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json', 'test-owner': owner }, body: JSON.stringify({ title: 'Updated', userId: 'victim' }) });
      assert.equal((await request('other-user')).status, 404);
      assert.equal(calls.length, method === 'PUT' ? 0 : 1);
      assert.equal((await request('owner')).status, 200);
      assert.deepEqual(calls.at(-1), { _id: id, userId: 'owner' });
    }
  } finally {
    Object.assign(Todo, original);
    await new Promise(resolve => server.close(resolve));
  }
});
