const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function collectAllowedOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.CORS_ALLOWED_ORIGINS
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([
    ...configuredOrigins,
    'http://localhost:3000'
  ]);
}

const allowedOrigins = collectAllowedOrigins();

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.googleId || user.id,
    displayName: user.displayName,
    name: user.name,
    emails: user.emails,
    photos: user.photos,
    picture: user.photos?.[0]?.value,
    email: user.emails?.[0]?.value
  };
}

function getAppUserId(user) {
  return user?.googleId || user?.id || null;
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

function requireTrustedOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get('origin');

  if (!origin || !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Untrusted origin' });
  }

  return next();
}

module.exports = {
  allowedOrigins: Array.from(allowedOrigins),
  getAppUserId,
  requireAuth,
  requireTrustedOrigin,
  sanitizeUser
};
