const mongoose = require('mongoose');

// ── Embedded: single registration slot ───────────────────
const RegistrationSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    plusOne: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    plusOneName: { type: String, default: null },

    preferredPosition: {
      type: String,
      enum: ['goalkeeper','defender','midfielder','forward','any'],
      default: 'any',
    },
    teamPreference: {
      type: String,
      enum: ['same','opposite','none'],
      default: 'none',
    },
    preferredTeamWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ['pending','wallet_locked','paid','refunded','forfeited'],
      default: 'pending',
    },
    amountPaidPaise: { type: Number, default: 0 },
    walletLockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
      default: null,
    },

    attended: {
      type: String,
      enum: ['present','absent','no_show','not_marked'],
      default: 'not_marked',
    },

    assignedTeam: {
      type: String,
      enum: ['A','B','unassigned'],
      default: 'unassigned',
    },
    assignedColour: { type: String, default: null },

    signedUpAt: { type: Date, default: Date.now },
    backedOutAt: { type: Date, default: null },
    backoutType: {
      type: String,
      enum: ['pre_cutoff','post_cutoff', null],
      default: null,
    },
  },
  { _id: true }
);

// ── Embedded: waitlist entry ──────────────────────────────
const WaitlistEntrySchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    joinedAt:   { type: Date, default: Date.now },
    notifiedAt: { type: Date, default: null },
    respondedAt:{ type: Date, default: null },
    status: {
      type: String,
      enum: ['waiting','notified','accepted','declined','expired'],
      default: 'waiting',
    },
  },
  { _id: true }
);

// ── Embedded: team (post distribution) ───────────────────
const TeamSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true },
    colour: { type: String, required: true },
    players: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
    ],
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
  },
  { _id: true }
);

// ── Main Game Schema ──────────────────────────────────────
const GameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    sport: {
      type: String,
      enum: ['football'],
      default: 'football',
    },
    format: {
      type: String,
      enum: ['5v5','6v6','7v7','8v8','9v9','10v10'],
      required: true,
    },

    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organiser',
      required: true,
      index: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: false, // Made optional for now since Community schema might not be ready
      index: true,
    },
    turf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf', // Changed from Venue to Turf
      required: true,
    },

    scheduledAt:   { type: Date, required: true, index: true },
    durationMins:  { type: Number, default: 60 },
    cutoffAt: {
      type: Date,
      required: true,
    },

    totalSlots: { type: Number, required: true },
    minPlayers: { type: Number, required: true },

    feeInPaise:        { type: Number, required: true },
    backoutFeeInPaise: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['draft','open','tentative','confirmed','completed','cancelled'],
      default: 'draft',
      index: true,
    },
    confirmedAt:  { type: Date, default: null },
    cancelledAt:  { type: Date, default: null },
    cancelReason: { type: String, default: null },
    completedAt:  { type: Date, default: null },

    registrations: [RegistrationSchema],
    waitlist:      [WaitlistEntrySchema],

    teams:            [TeamSchema],
    teamsPublished:   { type: Boolean, default: false },
    teamsPublishedAt: { type: Date, default: null },

    attendanceMarked:   { type: Boolean, default: false },
    attendanceMarkedAt: { type: Date, default: null },
    walletSettled:      { type: Boolean, default: false },
    walletSettledAt:    { type: Date, default: null },

    notificationLog: [
      {
        type:      { type: String },
        sentAt:    { type: Date, default: Date.now },
        channel:   { type: String, enum: ['whatsapp','push','sms'] },
        recipient: { type: String },
      },
    ],

    sosActive:   { type: Boolean, default: false },
    sosTriggeredAt: { type: Date, default: null },

    shareableSlug: { type: String, unique: true, sparse: true },

    sizeChangeNotified: { type: Boolean, default: false },
    allowSizeChange:    { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

GameSchema.virtual('spotsRemaining').get(function () {
  const active = this.registrations.filter(
    (r) => !['refunded','forfeited'].includes(r.paymentStatus)
  ).length;
  return Math.max(0, this.totalSlots - active);
});

GameSchema.virtual('isFull').get(function () {
  return this.spotsRemaining === 0;
});

GameSchema.index({ community: 1, scheduledAt: -1 });
GameSchema.index({ organiser: 1, status: 1 });
GameSchema.index({ scheduledAt: 1, status: 1 });

module.exports = mongoose.model('Game', GameSchema);
