const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      unique: true,
    },
    balancePaise: { type: Number, default: 0, min: 0 },
    lockedPaise:  { type: Number, default: 0, min: 0 },
    currency:     { type: String, default: 'INR' },
    razorpayContactId: { type: String, default: null },
    razorpayFundAccId: { type: String, default: null },
    isActive:          { type: Boolean, default: true },
    totalTopUpPaise:    { type: Number, default: 0 },
    totalSpentPaise:    { type: Number, default: 0 },
    totalRefundedPaise: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// availablePaise = balance minus locked (for future lock-based flow)
WalletSchema.virtual('availablePaise').get(function () {
  return this.balancePaise - this.lockedPaise;
});

WalletSchema.set('toJSON',   { virtuals: true });
WalletSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wallet', WalletSchema);
