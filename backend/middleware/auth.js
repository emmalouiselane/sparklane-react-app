const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://sparklane-react-app.up.railway.app'
  ].filter(Boolean)
);

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    displayName: user.displayName,
    name: user.name,
    emails: user.emails,
    photos: user.photos,
    picture: user.photos?.[0]?.value,
    email: user.emails?.[0]?.value
  };
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
  requireAuth,
  requireTrustedOrigin,
  sanitizeUser
};
