const mongoose = require('mongoose');

const TurfSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },

  shortName: { type: String, trim: true, maxlength: 40 },

  // ===============================
  // 📍 LOCATION
  // ===============================
  address: {
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
  },

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },

  googleMapsUrl: String,
  parkingNotes: String,

  // ===============================
  // ⚽ TURF DETAILS
  // ===============================
  surfaceType: {
    type: String,
    enum: ['natural_grass', 'artificial_turf', 'concrete', 'indoor'],
    default: 'artificial_turf',
  },

  numberOfPitches: { type: Number, default: 1 },

  pitchSizes: {
    type: [String],
    enum: ['small','medium','large','full'],
    default: ['medium'],
  },

  hasFloodlights: { type: Boolean, default: true },
  hasChangingRooms: { type: Boolean, default: false },
  hasParking: { type: Boolean, default: false },
  hasRefreshments: { type: Boolean, default: false },

  // ===============================
  // 📞 CONTACT
  // ===============================
  contactPhone: String,
  contactName: String,

  // ===============================
  // 🖼️ MEDIA
  // ===============================
  photos: [{ type: String }],

  // ===============================
  // 👥 RELATIONS
  // ===============================
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // Admin adds turfs
  },

  communities: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Community' }
  ],

  associatedOrganisers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organiser' // Match the Mongoose Organiser Model Ref
    }
  ],

  // ===============================
  // 📊 STATS
  // ===============================
  totalGamesHosted: { type: Number, default: 0 },

  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },

  // ===============================
  // 🟢 STATUS
  // ===============================
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

},
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
}
);

// 📍 GEO INDEX
TurfSchema.index({ location: '2dsphere' });

// 🔍 SEARCH INDEX
TurfSchema.index({ 'address.city': 1, isActive: 1 });

module.exports = mongoose.model('Turf', TurfSchema);