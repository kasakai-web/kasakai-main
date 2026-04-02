const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const turfRoutes = require('./modules/turf/turf.routes');
const gameRoutes = require('./modules/game/game.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/turfs', turfRoutes);
app.use('/api/v1/games', gameRoutes);

app.get('/health', (req, res) => {
  res.json({ message: 'System operational' });
});

module.exports = app;
