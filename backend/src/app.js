require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db/connection');

const authRoutes = require('./routes/auth');
const vaccineRoutes = require('./routes/vaccines');
const inventoryRoutes = require('./routes/inventory');
const administrationRoutes = require('./routes/administrations');

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Body parsing
app.use(express.json());

// Sessions
const KnexSessionStore = require('connect-session-knex')(session);
const store = new KnexSessionStore({
  knex: db,
  tablename: 'sessions',
  createtable: false,
});

app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

// Make db available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/vaccines', vaccineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/administrations', administrationRoutes);

module.exports = app;
