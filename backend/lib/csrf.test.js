const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const csurf = require('csurf');
const corsOptions = require('./corsOptions');
const BudgetPayment = require('../models/BudgetPayment');

test('cross-origin payment deletion succeeds with a session CSRF token and rejects missing or foreign tokens', async t => {
  const originalFind = BudgetPayment.findOne;
  const originalDelete = BudgetPayment.findOneAndDelete;
  const queries = [];
  BudgetPayment.findOne = async query => { queries.push(query); return { _id: query._id }; };
  BudgetPayment.findOneAndDelete = async query => { queries.push(query); return { _id: query._id }; };
  t.after(() => {
    BudgetPayment.findOne = originalFind;
    BudgetPayment.findOneAndDelete = originalDelete;
  });

  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(session({ secret: 'csrf-test-session-secret', resave: false, saveUninitialized: false }));
  app.use((req, res, next) => {
    // Stand in for Passport, keeping real session/CSRF and ownership checks.
    req.user = { id: 'account', googleId: 'owner' };
    req.isAuthenticated = () => true;
    next();
  });
  app.use(['/auth', '/api'], csurf({ cookie: false }));
  app.use('/auth', require('../routes/auth'));
  app.use('/api/budget', require('../routes/budget'));
  app.use((error, req, res, next) => {
    if (error.code !== 'EBADCSRFTOKEN') return next(error);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
  const origin = 'http://localhost:3000';
  const path = '/api/budget/payments/507f1f77bcf86cd799439011';

  const preflight = await request(path, { method: 'OPTIONS', headers: {
    Origin: origin, 'Access-Control-Request-Method': 'DELETE',
    'Access-Control-Request-Headers': 'content-type,x-csrf-token'
  } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /X-CSRF-Token/i);

  const bootstrap = await request('/auth/csrf', { headers: { Origin: origin } });
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.headers.get('Cache-Control'), 'no-store');
  assert.match(bootstrap.headers.get('Access-Control-Expose-Headers'), /X-CSRF-Token/i);
  const { csrfToken } = await bootstrap.json();
  assert.ok(csrfToken);
  const cookie = bootstrap.headers.get('set-cookie').split(';')[0];

  for (const token of [undefined, 'invalid-token']) {
    const headers = { Origin: origin, Cookie: cookie };
    if (token) headers['X-CSRF-Token'] = token;
    const response = await request(path, { method: 'DELETE', headers });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'Invalid CSRF token' });
    assert.equal(queries.length, 0);
  }

  const foreignSession = await request('/auth/csrf');
  const foreignCookie = foreignSession.headers.get('set-cookie').split(';')[0];
  assert.equal((await request(path, { method: 'DELETE', headers: {
    Origin: origin, Cookie: foreignCookie, 'X-CSRF-Token': csrfToken
  } })).status, 403);
  assert.equal(queries.length, 0);

  assert.equal((await request(path, { method: 'DELETE', headers: {
    Origin: 'https://attacker.example', Cookie: cookie, 'X-CSRF-Token': csrfToken
  } })).status, 403);
  assert.equal(queries.length, 0);

  const deleted = await request(path, { method: 'DELETE', headers: {
    Origin: origin, Cookie: cookie, 'X-CSRF-Token': csrfToken
  } });
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { message: 'Payment deleted successfully' });
  assert.deepEqual(queries, [
    { _id: '507f1f77bcf86cd799439011', userId: 'owner' },
    { _id: '507f1f77bcf86cd799439011', userId: 'owner' }
  ]);
});
