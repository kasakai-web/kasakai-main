const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const env = require('./config/env');
const notFoundHandler = require('./middlewares/notFound.middleware');
const errorHandler = require('./middlewares/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const turfRoutes = require('./modules/turf/turf.routes');
const gameRoutes = require('./modules/game/game.routes');
const playerRoutes = require('./modules/player/player.routes');
const organiserRoutes = require('./modules/organiser/organiser.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const webhookRoutes      = require('./modules/webhook/webhook.routes');

const app = express();

// Azure App Service sits behind a reverse proxy; trust one hop so
// express-rate-limit uses the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

const normalizeOrigin = (value) => {
  if (!value) return value;
  return String(value).trim().replace(/\/+$/, '');
};

const allowedOrigins = new Set(env.corsOrigin.map(normalizeOrigin));

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // ✅ allow localhost
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }

      // ✅ allow configured origins
      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      // ❌ block others
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Webhook route uses raw body for HMAC verification — must be registered BEFORE express.json()
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const isLocalhost = (req) => {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: isLocalhost,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: isLocalhost,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth requests. Please try again later.',
  },
});

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/turfs', turfRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/players', playerRoutes);
app.use('/api/v1/organisers', organiserRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ message: 'System operational', db: 'connected' });
  } catch {
    res.status(503).json({ message: 'Database unavailable', db: 'disconnected' });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
