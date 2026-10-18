const { allowedOrigins } = require('../middleware/auth');

module.exports = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['Retry-After', 'RateLimit', 'RateLimit-Policy', 'X-CSRF-Token']
};
