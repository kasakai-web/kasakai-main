const mongoose = require('mongoose');

const ChangeEntrySchema = new mongoose.Schema(
  {
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    oldValue:  { type: mongoose.Schema.Types.Mixed },
    newValue:  { type: mongoose.Schema.Types.Mixed },
    reason:    { type: String, default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AdminSettingSchema = new mongoose.Schema(
  {
    key: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      index:    true,
    },

    label:       { type: String, required: true },
    description: { type: String, default: '' },

    value: { type: mongoose.Schema.Types.Mixed, required: true },

    valueType: {
      type:    String,
      enum:    ['string', 'number', 'boolean', 'json'],
      default: 'string',
    },

    isEditable: { type: Boolean, default: true },

    history: [ChangeEntrySchema],
  },
  { timestamps: true }
);

// AdminSetting.get('key') → value or null
AdminSettingSchema.statics.get = async function (key) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : null;
};

// AdminSetting.set('key', value, adminId, reason)
AdminSettingSchema.statics.set = async function (key, value, adminId, reason) {
  const doc = await this.findOne({ key });
  if (!doc)            throw new Error(`Setting "${key}" not found`);
  if (!doc.isEditable) throw new Error(`Setting "${key}" is read-only`);

  doc.history.push({ changedBy: adminId, oldValue: doc.value, newValue: value, reason });
  doc.value = value;
  return doc.save();
};

module.exports = mongoose.model('AdminSetting', AdminSettingSchema);
