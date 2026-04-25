const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },

    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    password: {
      type:     String,
      required: true,
      select:   false,   // never returned in queries by default
    },

    role: {
      type:    String,
      enum:    ['superadmin', 'admin', 'moderator'],
      default: 'admin',
    },

    permissions: {
      users:      { type: Boolean, default: true  },
      organisers: { type: Boolean, default: true  },
      games:      { type: Boolean, default: true  },
      payments:   { type: Boolean, default: false },
      settings:   { type: Boolean, default: false },
    },

    isActive:  { type: Boolean, default: true  },
    lastLogin: { type: Date,    default: null   },
  },
  { timestamps: true }
);

// Hash password on create / update
AdminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method used in login
AdminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);
