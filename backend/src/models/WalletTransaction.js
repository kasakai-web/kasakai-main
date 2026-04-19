const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['topup', 'lock', 'unlock', 'debit', 'refund', 'backout_fee', 'bonus', 'withdrawal'],
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    balanceAfterPaise: {
      type: Number,
      required: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    razorpayOrderId:   { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success',
    },
    pairedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
