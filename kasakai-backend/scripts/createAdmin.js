/**
 * Seeds the one and only admin account.
 *
 * Usage:
 *   node scripts/createAdmin.js
 *
 * Safe to run multiple times — skips if admin already exists.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Admin    = require('../src/models/Admin');

const ADMIN_EMAIL    = 'adminkasakai@123';
const ADMIN_PASSWORD = 'admin@123';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const exists = await Admin.findOne({ email: ADMIN_EMAIL });
  if (exists) {
    console.log(`Admin "${ADMIN_EMAIL}" already exists. Skipping.`);
    process.exit(0);
  }

  await Admin.create({
    name:  'Kasa Kai Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'superadmin',
    permissions: {
      users:      true,
      organisers: true,
      games:      true,
      payments:   true,
      settings:   true,
    },
  });

  console.log(`✓ Admin created: ${ADMIN_EMAIL}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
