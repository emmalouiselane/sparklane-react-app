const jwt = require('jsonwebtoken');
const AuthAccount = require('../models/AuthAccount');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || process.env.SESSION_SECRET;
const AUTH_TOKEN_TTL = '7d';
const AUTH_TOKEN_COOKIE_NAME = 'authToken';

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

function createAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      googleId: user.googleId,
      email: user.email
    },
    AUTH_TOKEN_SECRET,
    { expiresIn: AUTH_TOKEN_TTL }
  );
}

function parseCookies(req) {
  const rawCookieHeader = req.get('cookie');

  if (!rawCookieHeader) {
    return {};
  }

  return rawCookieHeader.split(';').reduce((cookies, cookiePart) => {
    const separatorIndex = cookiePart.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const name = cookiePart.slice(0, separatorIndex).trim();
    const value = cookiePart.slice(separatorIndex + 1).trim();

    if (name) {
      cookies[name] = decodeURIComponent(value);
    }

    return cookies;
  }, {});
}

async function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }

  const cookies = parseCookies(req);
  const authToken = cookies[AUTH_TOKEN_COOKIE_NAME];

  if (authToken) {
    try {
      const decodedToken = jwt.verify(authToken, AUTH_TOKEN_SECRET);
      const user = await AuthAccount.findById(decodedToken.sub);

      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      // Fall through to the 401 response when the token is missing, invalid, or expired.
    }
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
  AUTH_TOKEN_COOKIE_NAME,
  createAuthToken,
  getAppUserId,
  requireAuth,
  requireTrustedOrigin,
  sanitizeUser
};
