const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { ipKeyGenerator } = require('express-rate-limit');
const {
  accountKey, createRateLimiter, createRequestLimiters, installEarlyRateLimits,
  installAccountRateLimits, policies, rateLimitErrorHandler
} = require('./rate-limit');
const { MongoRateLimitStore, RateLimitStoreError } = require('./mongo-rate-limit-store');
const RateLimitBucket = require('../models/rate-limit-bucket');

// A deterministic test store lets HTTP tests cross window boundaries without
// waiting, and seed a nearly exhausted quota without hundreds of HTTP calls.
class TestStore {
  constructor(prefix, buckets = new Map(), clock = { now: Date.now() }) {
    this.prefix = prefix;
    this.buckets = buckets;
    this.clock = clock;
    this.calls = [];
  }
  init({ windowMs }) { this.windowMs = windowMs; }
  seed(key, totalHits) {
    this.buckets.set(`${this.prefix}:${key}`, {
      totalHits, resetTime: new Date(this.clock.now + this.windowMs)
    });
  }
  async increment(key) {
    this.calls.push(key);
    const id = `${this.prefix}:${key}`;
    let bucket = this.buckets.get(id);
    if (!bucket || bucket.resetTime <= this.clock.now) {
      this.seed(key, 0);
      bucket = this.buckets.get(id);
    }
    return { ...bucket, totalHits: ++bucket.totalHits };
  }
  async decrement(key) { this.buckets.get(`${this.prefix}:${key}`).totalHits--; }
  async resetKey(key) { this.buckets.delete(`${this.prefix}:${key}`); }
}

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}

function harness({ trustProxy = 1 } = {}) {
  const app = express();
  app.set('trust proxy', trustProxy);
  const stores = {};
  const limiters = createRequestLimiters(name => (stores[name] = new TestStore(name)));
  const calls = { sessions: 0, handlers: 0 };
  installEarlyRateLimits(app, limiters);
  app.use('/security-events', express.text({ type: '*/*' }), (req, res) => {
    calls.handlers++;
    res.sendStatus(202);
  });
  app.use(express.json());
  app.use((req, res, next) => {
    calls.sessions++;
    // Test-only stand-in for Passport. Production never reads identity headers.
    const id = req.get('test-account');
    req.user = id ? { id } : null;
    req.isAuthenticated = () => Boolean(id);
    next();
  });
  installAccountRateLimits(app, limiters);
  app.all(['/', '/api', '/api/*', '/auth/*'], (req, res) => {
    calls.handlers++;
    res.json({ ok: true });
  });
  app.use(rateLimitErrorHandler);
  return { app, stores, calls };
}

test('exact quota, concurrent requests, retry headers, and recovery after reset', async t => {
  const app = express();
  const clock = { now: Date.now() };
  const store = new TestStore('boundary', new Map(), clock);
  app.use(createRateLimiter({ name: 'boundary', windowMs: 10000, maxRequests: 2, message: 'Slow down', store }));
  app.get('/', (req, res) => res.sendStatus(200));
  const request = await serve(t, app);
  const responses = await Promise.all(Array.from({ length: 3 }, () => request('/')));
  assert.deepEqual(responses.map(res => res.status).sort(), [200, 200, 429]);
  const blocked = responses.find(res => res.status === 429);
  assert.deepEqual(await blocked.json(), { error: 'Slow down' });
  assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  assert.match(blocked.headers.get('RateLimit'), /boundary/);
  assert.match(blocked.headers.get('RateLimit-Policy'), /q=2/);
  clock.now += 10001;
  assert.equal((await request('/')).status, 200);
});

test('ingress covers root, API probe, unknown paths and stops before parsing/session work', async t => {
  const { app, stores, calls } = harness();
  const request = await serve(t, app);
  stores.ingress.seed('203.0.113.1', policies.ingress.maxRequests);
  for (const path of ['/', '/api/', '/unknown', '/auth/user', '/api/todos']) {
    const response = await request(path, {
      method: 'POST', headers: { 'X-Forwarded-For': '203.0.113.1', 'Content-Type': 'application/json' }, body: '{invalid'
    });
    assert.equal(response.status, 429, path);
  }
  assert.equal(calls.sessions, 0);
  assert.equal(calls.handlers, 0);
});

test('OAuth starts, callbacks and Calendar consent share an early quota; session reads have a separate quota', async t => {
  const { app, stores, calls } = harness();
  const request = await serve(t, app);
  stores.oauth.seed('203.0.113.1', policies.oauth.maxRequests - 1);
  const headers = { 'X-Forwarded-For': '203.0.113.1' };
  assert.equal((await request('/auth/google', { headers })).status, 200);
  for (const path of ['/auth/google/callback', '/auth/google/calendar', '/auth/google/calendar/callback']) {
    assert.equal((await request(path, { headers })).status, 429, path);
  }
  assert.equal(calls.sessions, 1);
  assert.equal((await request('/auth/user', { headers })).status, 200);
});

test('security events are limited before parsing, network calls, and session work', async t => {
  const { app, stores, calls } = harness();
  const request = await serve(t, app);
  stores.securityEvents.seed('203.0.113.1', policies.securityEvents.maxRequests - 1);
  const options = { method: 'POST', headers: { 'X-Forwarded-For': '203.0.113.1' }, body: 'jwt' };
  assert.equal((await request('/security-events', options)).status, 202);
  assert.equal((await request('/security-events', options)).status, 429);
  assert.equal(calls.sessions, 0);
  assert.equal(calls.handlers, 1);
});

test('API probe, auth/user and every module share the account quota across IPs', async t => {
  const { app, stores } = harness();
  const request = await serve(t, app);
  stores.api.seed('account:owner', policies.api.maxRequests - 1);
  assert.equal((await request('/api/', { headers: { 'test-account': 'owner' } })).status, 200);
  for (const [index, path] of ['/auth/user', '/api/todos/1', '/api/time-logs', '/api/budget', '/api/meal-planner', '/api/routines'].entries()) {
    assert.equal((await request(path, { headers: { 'test-account': 'owner', 'X-Forwarded-For': `203.0.113.${index + 1}` } })).status, 429, path);
  }
  assert.equal((await request('/api/todos', { headers: { 'test-account': 'other-owner' } })).status, 200);
});

test('all write methods and preferences share a quota without blocking reads or other accounts', async t => {
  const { app, stores } = harness();
  const request = await serve(t, app);
  stores.writes.seed('account:owner', policies.writes.maxRequests - 1);
  const headers = { 'test-account': 'owner' };
  assert.equal((await request('/api/todos', { method: 'POST', headers })).status, 200);
  for (const [method, path] of [
    ['PUT', '/api/meal-planner'], ['PATCH', '/auth/preferences'],
    ['DELETE', '/api/todos/different-id'], ['POST', '/auth/logout']
  ]) {
    assert.equal((await request(path, { method, headers })).status, 429, `${method} ${path}`);
  }
  assert.equal((await request('/api/todos', { headers })).status, 200);
  assert.equal((await request('/auth/user', { method: 'HEAD', headers })).status, 200);
  assert.equal((await request('/api/todos', { method: 'POST', headers: { 'test-account': 'other-owner' } })).status, 200);
});

test('Calendar reads and writes share a tighter account quota', async t => {
  const { app, stores } = harness();
  const request = await serve(t, app);
  stores.calendar.seed('account:owner', policies.calendar.maxRequests - 1);
  const headers = { 'test-account': 'owner' };
  assert.equal((await request('/api/calendar/events', { headers })).status, 200);
  assert.equal((await request('/api/calendar/events', { method: 'POST', headers })).status, 429);
  assert.equal((await request('/api/todos', { headers })).status, 200);
});

test('OPTIONS preflights consume no quota', async t => {
  const { app, stores } = harness();
  const request = await serve(t, app);
  assert.equal((await request('/api/calendar/events', { method: 'OPTIONS' })).status, 200);
  assert.ok(Object.values(stores).every(store => store.calls.length === 0));
});

test('direct deployments cannot evade limits with forwarded headers', async t => {
  const { app, stores } = harness({ trustProxy: 0 });
  const request = await serve(t, app);
  // Warm-up validation without a forwarded header (the library correctly warns
  // if such a header is sent to a deployment configured to ignore proxies).
  await request('/');
  stores.ingress.seed('127.0.0.1', policies.ingress.maxRequests);
  for (const ip of ['203.0.113.1', '203.0.113.2']) {
    assert.equal((await request('/', { headers: { 'X-Forwarded-For': ip } })).status, 429);
  }
});

test('trusted single proxy uses the nearest forwarded IP, ignoring attacker prefixes', async t => {
  const { app, stores } = harness();
  const request = await serve(t, app);
  stores.ingress.seed('203.0.113.1', policies.ingress.maxRequests);
  for (const spoofed of ['198.51.100.1', '198.51.100.2']) {
    assert.equal((await request('/', { headers: { 'X-Forwarded-For': `${spoofed}, 203.0.113.1` } })).status, 429);
  }
});

test('IPv6 address rotation within a /56 cannot evade IP quotas', async t => {
  const { app, stores } = harness();
  const request = await serve(t, app);
  stores.ingress.seed(ipKeyGenerator('2001:db8:1234:5600::1'), policies.ingress.maxRequests);
  for (const ip of ['2001:db8:1234:5600::2', '2001:db8:1234:56ff::abcd']) {
    assert.equal((await request('/', { headers: { 'X-Forwarded-For': ip } })).status, 429);
  }
  assert.equal((await request('/', { headers: { 'X-Forwarded-For': '2001:db8:1234:5700::1' } })).status, 200);
});

test('account keys require authenticated identity and never use body/query user IDs', () => {
  const req = { ip: '203.0.113.1', user: { id: 'owner' }, body: { userId: 'victim' }, query: { userId: 'victim' } };
  assert.equal(accountKey(req), 'ip:203.0.113.1');
  req.isAuthenticated = () => true;
  assert.equal(accountKey(req), 'account:owner');
});

test('Mongo store hashes keys, isolates policies, and retries concurrent initial inserts', async () => {
  let attempts = 0;
  const resetTime = new Date(Date.now() + 10000);
  const model = { findOneAndUpdate(filter, update, options) {
    assert.match(filter._id, /^[0-9a-f]{64}$/);
    assert.ok(Array.isArray(update));
    assert.equal(options.upsert, true);
    assert.equal(options.new, true);
    return { lean: async () => {
      if (++attempts === 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
      return { hits: 2, expiresAt: resetTime };
    } };
  } };
  const store = new MongoRateLimitStore('api', model);
  store.init({ windowMs: 10000 });
  assert.deepEqual(await store.increment('private-account-id'), { totalHits: 2, resetTime });
  assert.equal(attempts, 2);
  assert.equal(store.bucketId('owner'), new MongoRateLimitStore('api').bucketId('owner'));
  assert.notEqual(store.bucketId('owner'), new MongoRateLimitStore('writes').bucketId('owner'));
  assert.ok(RateLimitBucket.schema.indexes().some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0));
});

test('store outages return retryable 503 and never reach protected work', async t => {
  const model = { findOneAndUpdate() { throw new Error('database offline'); } };
  const app = express();
  app.use(createRateLimiter({ name: 'outage', windowMs: 10000, maxRequests: 2, message: 'Slow down', store: new MongoRateLimitStore('outage', model) }));
  let reached = false;
  app.use((req, res) => { reached = true; res.sendStatus(200); });
  app.use(rateLimitErrorHandler);
  const request = await serve(t, app);
  const response = await request('/');
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '5');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(reached, false);
  assert.doesNotMatch(JSON.stringify(await response.json()), /database offline/);
  await assert.rejects(new MongoRateLimitStore('outage', model).increment('owner'), RateLimitStoreError);
});
