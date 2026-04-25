/**
 * Resets admin login credentials to known values.
 * Usage: node scripts/reset-admin-password.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin    = require("../src/models/Admin");

const TARGET_EMAIL   = process.env.ADMIN_LOGIN_EMAIL || "admin@kasakai.in";
const NEW_PASSWORD   = process.env.ADMIN_LOGIN_PASSWORD || "admin@123";
const LEGACY_EMAIL   = process.env.ADMIN_LEGACY_EMAIL || "adminkasakai@123";
const ADMIN_NAME     = process.env.ADMIN_LOGIN_NAME || "Kasakai Admin";

async function reset() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let admin = await Admin.findOne({ email: TARGET_EMAIL });

  if (!admin) {
    admin = await Admin.findOne({ email: LEGACY_EMAIL });
  }

  if (!admin) {
    admin = await Admin.findOne().sort({ createdAt: 1 });
  }

  if (!admin) {
    admin = new Admin({
      name: ADMIN_NAME,
      email: TARGET_EMAIL,
      password: NEW_PASSWORD,
      role: "superadmin",
      permissions: {
        users: true,
        organisers: true,
        games: true,
        payments: true,
        settings: true,
      },
      isActive: true,
    });
    await admin.save();
    console.log("Admin account created with requested credentials.");
  } else {
    admin.email = TARGET_EMAIL;
    admin.password = NEW_PASSWORD;
    admin.isActive = true;
    if (!admin.name) admin.name = ADMIN_NAME;
    await admin.save(); // pre-save hook will hash it
    console.log("Admin credentials reset successfully.");
  }

  console.log("  Email   :", TARGET_EMAIL);
  console.log("  Password:", NEW_PASSWORD);

  await mongoose.disconnect();
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
