const express = require('express');
const passport = require('passport');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'] 
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login` 
  }),
  (req, res) => {
    // Successful authentication, redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=success`);
  }
);

router.post('/google/success', (req, res) => {
  // Create a session for the user
  req.login(req.body.user, (err) => {
    if (err) console.error('Session creation failed:', err);
    res.json({ user: req.body.user });
  });
});

router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Logout failed:', err);
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
