const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema(
{
  // ===============================
  // 👤 BASIC INFO
  // ===============================
  name: {
    type: String,
    required: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    lowercase: true,
    sparse: true
  },

  whatsappNumber: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  otp: String,
  otpExpires: Date,

  isVerified: {
    type: Boolean,
    default: false
  },

  profileImage: {
    type: String,
    default: null
  },

  // ===============================
  // 🎮 PLAYER STATS
  // ===============================
  rating: {
    type: Number,
    default: 0
  },

  totalGamesPlayed: {
    type: Number,
    default: 0
  },

  noShowCount: {
    type: Number,
    default: 0
  },

  backoutCount: {
    type: Number,
    default: 0
  },

  // ===============================
  // 🎯 GAME PREFERENCES
  // ===============================
  preferences: {
    positions: [
      {
        type: String,
        enum: ["GK", "DEF", "MID", "FWD"]
      }
    ],

    preferredLocations: [
      {
        type: String,
        trim: true
      }
    ],

    preferredFormat: {
      type: String,
      enum: ["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"]
    },

    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"]
    }
  },

  // ===============================
  // 👥 INVITE / REFERRAL SYSTEM
  // ===============================
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },

  invitedPlayers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player"
    }
  ],

  // ===============================
  // 💰 WALLET
  // ===============================
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet"
  },

  // ===============================
  // 🔔 NOTIFICATION SETTINGS
  // ===============================
  notificationSettings: {
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },

  // ===============================
  // 📍 OPTIONAL LOCATION
  // ===============================
  location: {
    city: String,
    state: String
  },

},
{
  timestamps: true
}
);

module.exports = mongoose.model("Player", PlayerSchema);
