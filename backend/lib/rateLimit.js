function createRateLimiter({ windowMs, maxRequests, message }) {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const current = requests.get(key);

    if (!current || current.resetAt <= now) {
      requests.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.set('Retry-After', `${retryAfterSeconds}`);
      return res.status(429).json({ error: message });
    }

    current.count += 1;
    return next();
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many authentication requests. Please try again later.'
});

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 240,
  message: 'Too many API requests. Please slow down and try again.'
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  createRateLimiter
};
