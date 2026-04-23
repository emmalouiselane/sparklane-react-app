const express = require('express');
const passport = require('passport');
const { requireAuth, requireTrustedOrigin, sanitizeUser } = require('../middleware/auth');

const router = express.Router();

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

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      req.login(authenticatedUser, (loginError) => {
        if (loginError) {
          return next(loginError);
        }

        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=success`);
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
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      return res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
