const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const csurf = require('csurf');
require('dotenv').config();

const { allowedOrigins } = require('./middleware/auth');
const AuthAccount = require('./models/AuthAccount');
const MongoSessionStore = require('./lib/MongoSessionStore');
const RateLimitBucket = require('./models/RateLimitBucket');
const {
  createRequestLimiters, installEarlyRateLimits, installAccountRateLimits, rateLimitErrorHandler
} = require('./lib/rateLimit');

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
const csrfProtection = csurf({ cookie: false });

const required = ['SESSION_SECRET', 'TOKEN_ENCRYPTION_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MONGODB_URI'];
if (isProduction) required.push('FRONTEND_URL', 'BACKEND_PUBLIC_URL');
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

// Local requests must not be able to choose their own IP using forwarded headers.
// Production defaults to the existing single ingress proxy deployment.
const trustProxy = process.env.TRUST_PROXY || (isProduction ? '1' : '0');
if (['true', 'false'].includes(trustProxy.toLowerCase())) {
  throw new Error('TRUST_PROXY must be a hop count or a list of trusted proxy IPs/CIDRs');
}
app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy.split(',').map(value => value.trim()));
app.use(helmet());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['Retry-After', 'RateLimit', 'RateLimit-Policy']
}));

const limiters = createRequestLimiters();
installEarlyRateLimits(app, limiters);

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

app.use(['/auth', '/api'], csrfProtection);
app.use(['/auth', '/api'], (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    res.set('X-CSRF-Token', req.csrfToken());
  }
  next();
});

app.use((req, res, next) => {
  if (req.session?.cookie?.expires && new Date() > req.session.cookie.expires) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session expired' }));
  }
  next();
});

app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

app.use((req, res, next) => {
  if (req.user && req.session.authVersion !== req.user.sessionVersion) {
    return req.session.destroy(() => res.status(401).json({ error: 'Session revoked' }));
  }
  next();
});

installAccountRateLimits(app, limiters);

app.get('/', (req, res) => res.json({ message: 'Welcome to Sparklane API' }));
app.get('/api/', (req, res) => res.json({ message: 'API is working', status: 'connected' }));

app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/time-logs', timeLogsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/meal-planner', mealPlannerRoutes);

app.use(rateLimitErrorHandler);
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).json({ message: 'Something went wrong!' });
});

async function connectDB() {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    // Ensure TTL cleanup exists before accepting traffic, including deployments
    // where Mongoose automatic index creation is disabled.
    await RateLimitBucket.createIndexes();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});
