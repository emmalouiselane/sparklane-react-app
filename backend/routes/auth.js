const express = require('express');
const AuthAccount = require('../models/AuthAccount');
const { encryptToken, tokenIdentifiers } = require('../lib/tokenCrypto');
const { requireAuth, requireTrustedOrigin, sanitizeUser } = require('../middleware/auth');
const { createAuthorizationRequest, exchangeAndVerify } = require('../lib/googleOAuth');

const router = express.Router();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const sessionCookieName = process.env.NODE_ENV === 'production' ? '__Host-sessionId' : 'sessionId';

function validateOAuthState(req, kind) {
  const oauth = req.session.oauth;
  if (!oauth || oauth.kind !== kind || req.query.state !== oauth.state ||
      Date.now() - oauth.createdAt > 10 * 60 * 1000) {
    throw new Error('Invalid or expired OAuth state');
  }
  delete req.session.oauth;
  return oauth;
}

router.get('/google', async (req, res, next) => {
  try {
    res.redirect(await createAuthorizationRequest('login', req.session));
  } catch (error) {
    next(error);
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    if (req.query.error) return res.redirect(`${frontendUrl}?auth=error`);
    const oauth = validateOAuthState(req, 'login');
    const { tokens, claims } = await exchangeAndVerify(req.query.code, oauth, 'login');

    const account = await AuthAccount.findOne({ googleId: claims.sub });
    if (account?.googleSignInDisabled) return res.redirect(`${frontendUrl}?auth=error`);

    const authAccount = await AuthAccount.findOneAndUpdate(
      { googleId: claims.sub },
      {
        $set: {
          googleId: claims.sub,
          displayName: claims.name || '',
          name: { givenName: claims.given_name || '', familyName: claims.family_name || '' },
          email: claims.email || '',
          emails: [{ value: claims.email || '', verified: Boolean(claims.email_verified) }],
          photos: claims.picture ? [{ value: claims.picture }] : []
        },
        $setOnInsert: {
          sessionVersion: 0,
          googleSignInDisabled: false,
          enabledModules: []
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.passport = { user: authAccount.id };
    req.session.authVersion = authAccount.sessionVersion;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));

    return res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Google login failed:', error.message);
    return res.redirect(`${frontendUrl}?auth=error`);
  }
});

router.get('/google/calendar', requireAuth, async (req, res, next) => {
  try {
    res.redirect(await createAuthorizationRequest('calendar', req.session, req.user.googleId));
  } catch (error) {
    next(error);
  }
});

router.get('/google/calendar/callback', async (req, res) => {
  try {
    if (req.query.error) return res.redirect(`${frontendUrl}?auth=calendar-error`);
    const oauth = validateOAuthState(req, 'calendar');
    if (!req.user || !oauth.expectedGoogleId) throw new Error('Calendar flow is not attached to a session');

    const { tokens, claims } = await exchangeAndVerify(req.query.code, oauth, 'calendar');
    const currentAccount = await AuthAccount.findById(req.user.id);
    if (!currentAccount || claims.sub !== currentAccount.googleId ||
        claims.sub !== oauth.expectedGoogleId) {
      throw new Error('Google account changed during Calendar authorization');
    }

    currentAccount.accessToken = encryptToken(tokens.access_token);
    if (tokens.refresh_token) {
      currentAccount.refreshToken = encryptToken(tokens.refresh_token);
      const identifiers = tokenIdentifiers(tokens.refresh_token);
      currentAccount.refreshTokenPrefix = identifiers.prefix;
      currentAccount.refreshTokenDoubleHash = identifiers.doubleHash;
    }
    await currentAccount.save();

    return res.redirect(`${frontendUrl}?auth=calendar-success`);
  } catch (error) {
    console.error('Google Calendar authorization failed:', error.message);
    return res.redirect(`${frontendUrl}?auth=calendar-error`);
  }
});

router.get('/user', requireAuth, (req, res) => res.json({ user: sanitizeUser(req.user) }));

router.patch('/preferences', requireAuth, requireTrustedOrigin, async (req, res) => {
  try {
    const { theme, enabledModules, homepageTab } = req.body;
    const allowedModules = new Set(['monthly-budget', 'time-logs', 'meal-planner', 'recurring-routines']);

    if (theme === undefined && enabledModules === undefined && homepageTab === undefined) {
      return res.status(400).json({ error: 'At least one preference is required' });
    }

    if (theme !== undefined && !['dark', 'light'].includes(theme)) {
      return res.status(400).json({ error: 'Theme must be either dark or light' });
    }

    if (homepageTab !== undefined && !['events', 'routines'].includes(homepageTab)) {
      return res.status(400).json({ error: 'Homepage tab must be events or routines' });
    }

    if (enabledModules !== undefined && (
      !Array.isArray(enabledModules) ||
      enabledModules.some((moduleId) => typeof moduleId !== 'string' || !allowedModules.has(moduleId))
    )) {
      return res.status(400).json({ error: 'Enabled modules contains an invalid module' });
    }

    if (theme !== undefined) {
      req.user.theme = theme;
    }

    if (enabledModules !== undefined) {
      req.user.enabledModules = [...new Set(enabledModules)];
    }

    if (homepageTab !== undefined) req.user.homepageTab = homepageTab;

    await req.user.save();

    return res.json({
      message: 'Preferences updated successfully',
      user: sanitizeUser(req.user)
    });
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

router.post('/logout', requireTrustedOrigin, (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: 'Failed to destroy session' });
    res.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAMESITE || 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    return res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
