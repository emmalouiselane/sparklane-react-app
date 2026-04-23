const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
require('dotenv').config();
const { allowedOrigins } = require('./middleware/auth');
const AuthAccount = require('./models/AuthAccount');
const MongoSessionStore = require('./lib/MongoSessionStore');
const { apiRateLimiter, authRateLimiter } = require('./lib/rateLimit');
const { encryptToken } = require('./lib/tokenCrypto');

// Import routes
const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const budgetRoutes = require('./routes/budget');
const timeLogsRoutes = require('./routes/timeLogs');
const todosRoutes = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const backendPublicUrl =
  process.env.BACKEND_PUBLIC_URL ||
  process.env.API_URL ||
  process.env.RAILWAY_PUBLIC_URL ||
  process.env.RAILWAY_PUBLIC_DOMAIN ||
  'http://localhost:5000';
  
const sessionCookieSettings = {
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  path: '/',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
};

const REQUIRED_ENV_VARS = [
  'SESSION_SECRET',
  'TOKEN_ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MONGODB_URI'
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Railway (needed for secure cookies to work)
app.set('trust proxy', 1);

// Session middleware
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoSessionStore(),
  cookie: sessionCookieSettings,
  name: 'sessionId', 
  rolling: true 
}));

// Add session logging middleware
app.use((req, res, next) => {
  next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${backendPublicUrl}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const authAccount = await AuthAccount.findOneAndUpdate(
      { googleId: profile.id },
      {
        googleId: profile.id,
        displayName: profile.displayName,
        name: {
          givenName: profile.name?.givenName || '',
          familyName: profile.name?.familyName || ''
        },
        email: profile.emails?.[0]?.value || '',
        emails: Array.isArray(profile.emails) ? profile.emails : [],
        photos: Array.isArray(profile.photos) ? profile.photos : [],
        accessToken: encryptToken(accessToken),
        ...(refreshToken ? { refreshToken: encryptToken(refreshToken) } : {})
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return done(null, authAccount);
  } catch (error) {
    return done(error);
  }
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await AuthAccount.findById(userId);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Database connection
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
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
app.use('/auth', authRateLimiter);
app.use('/api', apiRateLimiter);
app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/time-logs', timeLogsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/todos', todosRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
