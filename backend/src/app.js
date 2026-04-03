const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const notFoundHandler = require('./middlewares/notFound.middleware');
const errorHandler = require('./middlewares/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const turfRoutes = require('./modules/turf/turf.routes');
const gameRoutes = require('./modules/game/game.routes');
const playerRoutes = require('./modules/player/player.routes');
const organiserRoutes = require('./modules/organiser/organiser.routes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cookieParser());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigin.includes(origin)) {
        return callback(null, true);
      }

      const corsError = new Error('Not allowed by CORS');
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
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

app.get('/health', (req, res) => {
  res.json({ message: 'System operational' });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
