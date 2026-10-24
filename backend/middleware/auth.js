const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REQUIRED_MODULES = ['home', 'my-week'];
const LEGACY_OPTIONAL_DEFAULTS = ['wellness', 'monthly-budget', 'time-logs', 'meal-planner'];
const SIDEBAR_MODULES = [...REQUIRED_MODULES, 'wellness', 'recurring-routines', 'monthly-budget', 'meal-planner', 'time-logs'];

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
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000'])
  ]);
}

const allowedOrigins = collectAllowedOrigins();

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const storedModules = Array.isArray(user.enabledModules)
    ? user.enabledModules.filter((moduleId) => SIDEBAR_MODULES.includes(moduleId))
    : null;

  const selectedModules = user.modulePreferencesVersion >= 1
    ? storedModules || []
    : ['wellness', ...(storedModules || LEGACY_OPTIONAL_DEFAULTS)];

  const enabledModules = SIDEBAR_MODULES.filter((moduleId) =>
    REQUIRED_MODULES.includes(moduleId) || selectedModules.includes(moduleId)
  );

  return {
    id: user.googleId || user.id,
    displayName: user.displayName,
    name: user.name,
    emails: user.emails,
    photos: user.photos,
    picture: user.photos?.[0]?.value,
    email: user.emails?.[0]?.value,
    theme: ['dark', 'light', 'cherry-blossom'].includes(user.theme) ? user.theme : 'dark',
    weeklyIntention: typeof user.weeklyIntention === 'string' ? user.weeklyIntention : '',
    enabledModules
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
