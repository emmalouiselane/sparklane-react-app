const express = require('express');
const { google } = require('googleapis');
const { requireAuth, requireTrustedOrigin } = require('../middleware/auth');
const { decryptStoredToken, encryptToken } = require('../lib/tokenCrypto');

const router = express.Router();

router.use(requireAuth);
router.use(requireTrustedOrigin);

async function getAuthorizedCalendarClient(user) {
  const accessToken = decryptStoredToken(user.accessToken);
  const refreshToken = decryptStoredToken(user.refreshToken);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (!refreshToken) {
    const authError = new Error('Google Calendar needs to be reconnected.');
    authError.status = 401;
    throw authError;
  }

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      user.accessToken = encryptToken(credentials.access_token);
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || refreshToken
      });
    }

    if (credentials.refresh_token) {
      user.refreshToken = encryptToken(credentials.refresh_token);
    }

    if (credentials.access_token || credentials.refresh_token) {
      await user.save();
    }
  } catch (error) {
    const authError = new Error('Google Calendar needs to be reconnected.');
    authError.status = 401;
    authError.cause = error;
    throw authError;
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Get calendar events (next 7 days)
router.get('/events', async (req, res) => {
  try {
    const calendar = await getAuthorizedCalendarClient(req.user);
    
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
    res.status(error.status || 500).json({
      error: error.status === 401 ? 'Google Calendar needs to be reconnected.' : 'Failed to fetch calendar events'
    });
  }
});

// Create calendar event
router.post('/events', async (req, res) => {
  try {
    const { title, description, startTime, endTime, location } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    const calendar = await getAuthorizedCalendarClient(req.user);

    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.json({ 
      message: 'Event created successfully',
      event: {
        id: response.data.id,
        title: response.data.summary,
        description: response.data.description,
        start: response.data.start,
        end: response.data.end,
        location: response.data.location,
        status: response.data.status
      }
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(error.status || 500).json({
      error: error.status === 401 ? 'Google Calendar needs to be reconnected.' : 'Failed to create calendar event'
    });
  }
});

module.exports = router;
