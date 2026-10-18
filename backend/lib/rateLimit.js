const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { MongoRateLimitStore, RateLimitStoreError } = require('./MongoRateLimitStore');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MINUTE = 60 * 1000;

// Shared buckets across endpoints and sessions prevent evasion by changing
// resource IDs or logging in again. Only Passport's authenticated user is used.
function accountKey(req) {
  if (req.isAuthenticated?.() && req.user?.id) return `account:${req.user.id}`;
  return `ip:${ipKeyGenerator(req.ip)}`;
}

const policies = {
  ingress: { windowMs: MINUTE, maxRequests: 600, message: 'Too many requests. Please try again later.' },
  oauth: { windowMs: 15 * MINUTE, maxRequests: 30, message: 'Too many authentication requests. Please try again later.' },
  api: { windowMs: MINUTE, maxRequests: 240, keyGenerator: accountKey, message: 'Too many API requests. Please slow down and try again.' },
  writes: { windowMs: MINUTE, maxRequests: 60, keyGenerator: accountKey, skip: (req) => SAFE_METHODS.has(req.method), message: 'Too many changes. Please wait before trying again.' },
  calendar: { windowMs: MINUTE, maxRequests: 30, keyGenerator: accountKey, message: 'Too many Calendar requests. Please try again shortly.' },
  securityEvents: { windowMs: MINUTE, maxRequests: 120, message: 'Too many security events. Please try again shortly.' }
};

function createRateLimiter({ name, windowMs, maxRequests, message, store, keyGenerator, skip }) {
  return rateLimit({
    windowMs,
    limit: maxRequests,
    identifier: name,
    message: { error: message },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: false,
    store: store || new MongoRateLimitStore(name),
    ...(keyGenerator ? { keyGenerator } : {}),
    skip: (req) => req.method === 'OPTIONS' || Boolean(skip?.(req))
  });
}

function createRequestLimiters(storeFactory = (name) => new MongoRateLimitStore(name)) {
  return Object.fromEntries(Object.entries(policies).map(([name, policy]) => [
    name, createRateLimiter({ name, ...policy, store: storeFactory(name) })
  ]));
}

function installEarlyRateLimits(app, limiters) {
  app.use(limiters.ingress);
  // Express prefix matching includes both OAuth callbacks and Calendar consent.
  app.use('/auth/google', limiters.oauth);
  app.use('/security-events', limiters.securityEvents);
}

function installAccountRateLimits(app, limiters) {
  app.use(['/api', '/auth'], limiters.api, limiters.writes);
  app.use('/api/calendar', limiters.calendar);
}

function rateLimitErrorHandler(error, req, res, next) {
  if (!(error instanceof RateLimitStoreError)) return next(error);
  console.error('Rate limit storage unavailable:', error.cause?.message);
  res.set('Cache-Control', 'no-store');
  res.set('Retry-After', '5');
  return res.status(503).json({ error: 'Service temporarily unavailable. Please try again shortly.' });
}

module.exports = {
  accountKey,
  createRateLimiter,
  createRequestLimiters,
  installEarlyRateLimits,
  installAccountRateLimits,
  policies,
  rateLimitErrorHandler
};
