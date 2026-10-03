const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const { allowedOrigins } = require('./middleware/auth');
const AuthAccount = require('./models/AuthAccount');
const MongoSessionStore = require('./lib/MongoSessionStore');
const { apiRateLimiter, authRateLimiter } = require('./lib/rateLimit');

const authRoutes = require('./routes/auth');
const securityEvents = require('./routes/securityEvents');
const calendarRoutes = require('./routes/calendar');
const budgetRoutes = require('./routes/budget');
const timeLogsRoutes = require('./routes/timeLogs');
const todosRoutes = require('./routes/todos');
const routinesRoutes = require('./routes/routines');
const mealPlannerRoutes = require('./routes/mealPlanner');

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieName = isProduction ? '__Host-sessionId' : 'sessionId';

const required = ['SESSION_SECRET', 'TOKEN_ENCRYPTION_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MONGODB_URI'];
if (isProduction) required.push('FRONTEND_URL', 'BACKEND_PUBLIC_URL');
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

app.set('trust proxy', 1);
app.use(helmet());
app.use(['/auth', '/api'], (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use('/security-events', express.text({
  type: ['application/secevent+jwt', 'application/jwt', 'text/plain'],
  limit: '64kb'
}), securityEvents);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoSessionStore(),
  name: sessionCookieName,
  rolling: true,
  cookie: {
    secure: isProduction,
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    path: '/'
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (userId, done) => {
  try { done(null, await AuthAccount.findById(userId)); } catch (error) { done(error); }
});
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.session?.cookie?.expires && new Date() > req.session.cookie.expires) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session expired' }));
  }
  next();
});

app.use((req, res, next) => {
  if (req.user && req.session.authVersion !== req.user.sessionVersion) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session revoked' }));
  }
  next();
});

app.get('/', (req, res) => res.json({ message: 'Welcome to Sparklane API' }));
app.get('/api/', (req, res) => res.json({ message: 'API is working', status: 'connected' }));

app.use('/auth', authRateLimiter);
app.use('/api', apiRateLimiter);
app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/time-logs', timeLogsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/meal-planner', mealPlannerRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).json({ message: 'Something went wrong!' });
});

async function connectDB() {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

connectDB();
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
