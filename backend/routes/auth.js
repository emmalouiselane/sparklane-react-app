const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'] 
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    session: false 
  }),
  (req, res) => {
    // Create JWT token
    const token = jwt.sign(
      { 
        id: req.user.id, 
        email: req.user.emails[0].value,
        name: req.user.displayName,
        picture: req.user.photos[0].value,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken
      },
      process.env.SESSION_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Redirect to frontend with token in URL
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=success&token=${token}`);
  }
);

router.post('/google/success', (req, res) => {
  // Create a session for the user
  req.login(req.body.user, (err) => {
    if (err) console.error('Session creation failed:', err);
    res.json({ user: req.body.user });
  });
});

// JWT middleware for protected routes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        console.log('JWT verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.user = user;
      next();
    });
  } else {
    console.log('No authorization header found');
    res.status(401).json({ error: 'No token provided' });
  }
};

router.get('/user', authenticateJWT, (req, res) => {
  console.log('JWT Auth check - User authenticated:', !!req.user);
  console.log('JWT Auth check - User data:', req.user);
  
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Logout failed:', err);
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
