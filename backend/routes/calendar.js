const express = require('express');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');

const router = express.Router();

// JWT middleware for protected routes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        console.log('Calendar JWT verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.user = user;
      next();
    });
  } else {
    console.log('Calendar - No authorization header found');
    res.status(401).json({ error: 'No token provided' });
  }
};

// Apply JWT middleware to all calendar routes
router.use(authenticateJWT);

// Get calendar events (next 7 days)
router.get('/events', async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const endTime = new Date();
    endTime.setDate(now.getDate() + 7); // Get events for next 7 days

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      q: req.query.search || undefined
    });

    const events = response.data.items.map(event => ({
      id: event.id,
      title: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      status: event.status
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

module.exports = router;
