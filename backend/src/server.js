const { notify } = require("./services/notificationService");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const app = require('./app');
const { setIo } = require('./socket');
const env = require('./config/env');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI environment variable is not set.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('Connected to MongoDB Successfully');

    const server = http.createServer(app);

    // ── Socket.io real-time notifications ──────────────────────────────────
    const io = new Server(server, {
      cors: {
        origin(origin, cb) {
          if (!origin) return cb(null, true);
          if (
            env.nodeEnv === 'development' &&
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
          ) {
            return cb(null, true);
          }
          const allowed = new Set(env.corsOrigin.map((o) => o.trim().replace(/\/+$/, '')));
          const normalised = origin.trim().replace(/\/+$/, '');
          return cb(allowed.has(normalised) ? null : new Error('Not allowed by CORS'), true);
        },
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // JWT authentication middleware for Socket.io
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No auth token'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = (decoded.id || decoded._id || '').toString();
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      if (socket.userId) {
        socket.join(socket.userId);
        console.log(`[SOCKET] User ${socket.userId} connected`);
      }
      socket.on('disconnect', () => {
        console.log(`[SOCKET] User ${socket.userId} disconnected`);
      });
    });

    setIo(io);
    // ───────────────────────────────────────────────────────────────────────

    server.listen(PORT, '0.0.0.0', () => {
      console.log('Server is running on port ' + PORT);
    });

    const shutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        mongoose.connection.close().then(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
const cron = require("node-cron");
const Game = require("./models/Game");
const GameDecisionEngine = require("./utils/gameDecisionEngine");

const runGameDecision = async (time) => {
  console.log(`⏰ Running ${time} game decision...`);

  const games = await Game.find({ status: "open" });

  for (let game of games) {
    const playerCount =
      game.registrations.length + (game.organiserIsPlaying ? 1 : 0);

    const engine = new GameDecisionEngine(playerCount);

    let decision;

    if (time === "8PM") {
      decision = engine.evaluateAt8PM();
    } else if (time === "10PM") {
      decision = engine.evaluateAt10PM();
    }

    console.log("Game:", game.title, "Players:", playerCount, decision);

    if (decision.action === "SUGGEST_CANCEL") {
      console.log("⚠ Suggest cancel:", game.title);
    }

   if (decision.action === "CONFIRM") {
  if (playerCount >= 10 && playerCount <= 14) {
    game.format = "7v7";
  } else if (playerCount > 14) {
    game.format = "9v9";
  }

  game.status = "confirmed";
  await game.save();

  console.log("✅ Game confirmed:", game.title, "Format:", game.format);

  // 🔔 notify organiser
  notify(game.organiser, "organiser", {
    type: "game_confirmed",
    title: "✅ Game Confirmed!",
    body: `${game.title} is confirmed (${game.format})`,
    game: game._id,
  });

  // 🔔 notify players
  for (let reg of game.registrations) {
    if (!reg.player) continue;

    notify(reg.player, "player", {
      type: "game_confirmed",
      title: "⚽ Game Confirmed!",
      body: `${game.title} is ON! Get ready 🔥`,
      game: game._id,
    });
  }
}

if (decision.action === "CANCEL") {
  game.status = "cancelled";
  await game.save();

  console.log("❌ Game cancelled:", game.title);

  // 🔔 notify organiser
  notify(game.organiser, "organiser", {
    type: "game_cancelled",
    title: "❌ Game Cancelled",
    body: `${game.title} has been cancelled`,
    game: game._id,
  });

  // 🔔 notify players
  for (let reg of game.registrations) {
    if (!reg.player) continue;

    notify(reg.player, "player", {
      type: "game_cancelled",
      title: "❌ Game Cancelled",
      body: `${game.title} has been cancelled`,
      game: game._id,
    });
  }
}
  }
};

// ✅ Runs ONLY once at exact times
cron.schedule("0 20 * * *", () => runGameDecision("8PM"));  // 8 PM
cron.schedule("0 22 * * *", () => runGameDecision("10PM")); // 10 PM