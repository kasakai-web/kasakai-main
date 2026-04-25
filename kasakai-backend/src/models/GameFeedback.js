const mongoose = require('mongoose');

const PeerRatingSchema = new mongoose.Schema(
  {
    ratedPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    rating:      { type: Number, min: 1, max: 5 },
    note:        { type: String, default: null, maxlength: 200 },
  },
  { _id: false }
);

const GameFeedbackSchema = new mongoose.Schema(
  {
    game:             { type: mongoose.Schema.Types.ObjectId, ref: 'Game',   required: true, index: true },
    submittedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    gameRating:       { type: Number, required: true, min: 1, max: 5 },
    organiserRating:  { type: Number, default: null, min: 1, max: 5 },
    venueRating:      { type: Number, default: null, min: 1, max: 5 },
    tags:             { type: [String], default: [] },
    comment:          { type: String,  default: null, maxlength: 1000 },
    requiresFollowUp: { type: Boolean, default: false },
    followedUpAt:     { type: Date,    default: null },
    peerRatings:      { type: [PeerRatingSchema], default: [] },
  },
  { timestamps: true }
);

// One feedback per player per game
GameFeedbackSchema.index({ game: 1, submittedBy: 1 }, { unique: true });

module.exports = mongoose.model('GameFeedback', GameFeedbackSchema);
