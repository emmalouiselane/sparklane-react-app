const express = require('express');
const passport = require('passport');
const { AUTH_TOKEN_COOKIE_NAME, createAuthToken, requireAuth, requireTrustedOrigin, sanitizeUser } = require('../middleware/auth');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const authCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
  state: true,
  prompt: 'select_account'
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=error`,
    session: false 
  }),
  (req, res, next) => {
    const authenticatedUser = req.user;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const authToken = createAuthToken(authenticatedUser);

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      req.login(authenticatedUser, (loginError) => {
        if (loginError) {
          return next(loginError);
        }

        return req.session.save((saveError) => {
          if (saveError) {
            return next(saveError);
          }

          res.cookie(AUTH_TOKEN_COOKIE_NAME, authToken, authCookieOptions);
          return res.redirect(`${frontendUrl}?auth=success#token=${encodeURIComponent(authToken)}`);
        });
      });
    });
  }
);

router.get('/user', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.post('/logout', requireTrustedOrigin, (req, res) => {
  req.logout((logoutError) => {
    if (logoutError) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        return res.status(500).json({ error: 'Failed to destroy session' });
      }

      res.clearCookie('sessionId', {
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction
      });
      res.clearCookie(AUTH_TOKEN_COOKIE_NAME, authCookieOptions);
      return res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
