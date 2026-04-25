/**
 * Run once to create the admin user in the database.
 * Usage: node scripts/seed-admin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin    = require("../src/models/Admin");

const ADMIN_EMAIL    = process.env.ADMIN_LOGIN_EMAIL || "admin@kasakai.in";
const ADMIN_PASSWORD = process.env.ADMIN_LOGIN_PASSWORD || "admin@123";
const ADMIN_NAME     = process.env.ADMIN_LOGIN_NAME || "Kasakai Admin";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const existing = await Admin.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log("Admin already exists — nothing to do.");
    await mongoose.disconnect();
    return;
  }

  await Admin.create({
    name:  ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "superadmin",
    permissions: {
      users:      true,
      organisers: true,
      games:      true,
      payments:   true,
      settings:   true,
    },
    isActive: true,
  });

  console.log("Admin user created:");
  console.log("  Email   :", ADMIN_EMAIL);
  console.log("  Password:", ADMIN_PASSWORD);
  console.log("  Role    : superadmin");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
