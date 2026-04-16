const mongoose = require('mongoose');

const PlayerRatingSchema = new mongoose.Schema(
  {
    game:      { type: mongoose.Schema.Types.ObjectId, ref: 'Game',      required: true, index: true },
    player:    { type: mongoose.Schema.Types.ObjectId, ref: 'Player',    required: true, index: true },
    organiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Organiser', required: true },

    conductRating:  { type: Number, required: true, min: 1, max: 5 },
    gameplayRating: { type: Number, required: true, min: 1, max: 5 },

    preferredPosition: {
      type: String,
      enum: ['goalkeeper', 'defender', 'midfielder', 'forward', 'any'],
      default: 'any',
    },
    gkAffinity: { type: Number, default: null, min: 0, max: 100 },

    playWith:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    playAgainst: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],

    notes: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

// One rating per player per game (upsert-friendly)
PlayerRatingSchema.index({ game: 1, player: 1 }, { unique: true });

module.exports = mongoose.model('PlayerRating', PlayerRatingSchema);
