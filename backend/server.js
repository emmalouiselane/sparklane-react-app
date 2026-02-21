const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, 
    httpOnly: true, 
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000) 
  },
  name: 'sessionId', 
  rolling: true 
}));

// Trust proxy for Railway (needed for secure cookies to work)
app.set('trust proxy', 1);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.RAILWAY_PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:5000'}/auth/google/callback`
}, (accessToken, refreshToken, profile, done) => {
  // Store tokens for calendar access
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  // Here you would typically find or create a user in your database
  return done(null, profile);
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Database connection
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Session validation middleware
app.use((req, res, next) => {
  if (req.session && req.session.cookie && req.session.cookie.expires) {
    if (new Date() > req.session.cookie.expires) {
      // Session has expired, destroy it
      req.session.destroy((err) => {
        if (err) console.error('Error destroying expired session:', err);
      });
      return res.status(401).json({ error: 'Session expired' });
    }
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Sparklane API' });
});

app.get('/api/', (req, res) => {
  res.json({ message: 'API is working', status: 'connected' });
});

// Use route files
app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
