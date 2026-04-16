const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientRole: { type: String, enum: ['player', 'organiser', 'admin'], required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'game_created',
        'game_registered',
        'game_cancelled',
        'game_backout_player',
        'game_backout_organiser',
        'waitlist_joined',
        'waitlist_spot',
        'waitlist_approved',
        'player_removed',
        'wallet_topup',
        'wallet_debit',
        'wallet_refund',
        'system',
      ],
    },
    title:     { type: String, required: true },
    body:      { type: String, required: true },
    imageUrl:  { type: String, default: null },
    actionUrl: { type: String, default: null },
    game:      { type: mongoose.Schema.Types.ObjectId, ref: 'Game', default: null },
    isRead:    { type: Boolean, default: false, index: true },
    readAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fast per-user queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
