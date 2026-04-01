const mongoose = require("mongoose");

const OrganiserSchema = new mongoose.Schema(
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

  // ===============================
  // ✅ APPROVAL SYSTEM (ADMIN CONTROL)
  // ===============================
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending"
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },

  approvedAt: Date,
  suspendedAt: Date,
  suspendReason: String,

  // ===============================
  // 📍 LOCATION
  // ===============================
  location: {
    city: String,
    state: String,
    country: { type: String, default: "India" },

    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // ===============================
  // 🏘️ COMMUNITY
  // ===============================
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community"
  },

  // ===============================
  // 🏟️ TURF ACCESS
  // ===============================
  associatedVenues: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue"
    }
  ],

  // ===============================
  // 📊 PERFORMANCE STATS
  // ===============================
  totalGamesHosted: {
    type: Number,
    default: 0
  },

  totalPlayersManaged: {
    type: Number,
    default: 0
  },

  averageRating: {
    type: Number,
    default: 0
  },

  totalRatingsReceived: {
    type: Number,
    default: 0
  },

  cancellationRate: {
    type: Number,
    default: 0
  },

  // ===============================
  // 💰 EARNINGS
  // ===============================
  totalEarningsPaise: {
    type: Number,
    default: 0
  },

  pendingPayoutPaise: {
    type: Number,
    default: 0
  },

  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet"
  },

  // ===============================
  // 🎯 DEFAULT GAME SETTINGS
  // ===============================
  defaultVenueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Venue"
  },

  defaultFeeInPaise: {
    type: Number,
    default: 0
  },

  defaultFormat: {
    type: String,
    enum: ["5v5","6v6","7v7","8v8","9v9","10v10"],
    default: "6v6"
  },

  defaultCutoffHours: {
    type: Number,
    default: 24
  },

  // ===============================
  // 📱 WHATSAPP INTEGRATION
  // ===============================
  whatsappGroupId: String,
  whatsappGroupLink: String,

  // ===============================
  // 🔔 NOTIFICATION SETTINGS
  // ===============================
  notificationSettings: {
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },

  // ===============================
  // 🟢 STATUS
  // ===============================
  isActive: {
    type: Boolean,
    default: true
  },

  lastGameCreatedAt: Date

},
{
  timestamps: true
}
);

module.exports = mongoose.model("Organiser", OrganiserSchema);
