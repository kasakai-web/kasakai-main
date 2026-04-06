const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Player = require("../src/models/Player");
const Organiser = require("../src/models/Organiser");

const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomPhone = (prefix = "93") => {
  const tail = String(Math.floor(10000000 + Math.random() * 90000000));
  return `${prefix}${tail}`;
};

const randomTag = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

const getModelByRole = (role) => (role === "organiser" ? Organiser : Player);

const getOtpByEmail = async (role, email) => {
  const Model = getModelByRole(role);
  const user = await Model.findOne({ email: email.toLowerCase() }).sort({ updatedAt: -1 }).lean();
  return user?.otp || null;
};

const runFlow = async ({ role, emailBase }) => {
  const tag = randomTag();
  const phone = randomPhone(role === "organiser" ? "94" : "93");
  const email = `${emailBase}+${role}.${tag}@gmail.com`;
  const password = "Test@1234";
  const newPassword = "Reset@1234";
  const result = [];

  const record = (step, passed, details) => {
    result.push({ step, passed, details });
  };

  try {
    await api.post("/auth/register", {
      name: `${role} e2e`,
      phone,
      email,
      whatsappNumber: phone,
      password,
      role,
    });
    record("register", true, "OTP triggered");
  } catch (error) {
    record("register", false, error.response?.data || error.message);
    return { role, email, phone, result };
  }

  await sleep(800);
  const signupOtp = await getOtpByEmail(role, email);
  if (!signupOtp) {
    record("fetch-signup-otp", false, "OTP not found in DB");
    return { role, email, phone, result };
  }
  record("fetch-signup-otp", true, "OTP found in DB");

  try {
    await api.post("/auth/verify-otp", {
      email,
      otp: signupOtp,
      role,
      mode: "signup",
    });
    record("verify-signup-otp", true, "Account verified");
  } catch (error) {
    record("verify-signup-otp", false, error.response?.data || error.message);
    return { role, email, phone, result };
  }

  try {
    await api.post("/auth/login", {
      phone,
      password,
      role,
    });
    record("login-after-signup", true, "Login successful");
  } catch (error) {
    record("login-after-signup", false, error.response?.data || error.message);
    return { role, email, phone, result };
  }

  try {
    await api.post("/auth/forgot-password", {
      email,
      role,
    });
    record("forgot-password-request", true, "Reset OTP triggered");
  } catch (error) {
    record("forgot-password-request", false, error.response?.data || error.message);
    return { role, email, phone, result };
  }

  await sleep(800);
  const resetOtp = await getOtpByEmail(role, email);
  if (!resetOtp) {
    record("fetch-reset-otp", false, "Reset OTP not found in DB");
    return { role, email, phone, result };
  }
  record("fetch-reset-otp", true, "Reset OTP found in DB");

  try {
    await api.post("/auth/verify-otp", {
      email,
      otp: resetOtp,
      role,
      mode: "forgot-password",
    });
    record("verify-reset-otp", true, "OTP accepted for password reset");
  } catch (error) {
    record("verify-reset-otp", false, error.response?.data || error.message);
    return { role, email, phone, result };
  }

  try {
    await api.post("/auth/reset-password", {
      email,
      otp: resetOtp,
      newPassword,
      role,
    });
    record("reset-password", true, "Password reset successful");
  } catch (error) {
    record("reset-password", false, error.response?.data || error.message);
    return { role, email, phone, result };
  }

  try {
    await api.post("/auth/login", {
      phone,
      password: newPassword,
      role,
    });
    record("login-after-reset", true, "Login successful with new password");
  } catch (error) {
    record("login-after-reset", false, error.response?.data || error.message);
  }

  return { role, email, phone, result };
};

(async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const playerReport = await runFlow({ role: "player", emailBase: "nishant202mishra" });
  const organiserReport = await runFlow({ role: "organiser", emailBase: "nishant202mishra" });

  const all = [playerReport, organiserReport];
  const hasFailures = all.some((entry) => entry.result.some((step) => !step.passed));

  console.log(JSON.stringify({ success: !hasFailures, reports: all }, null, 2));

  await mongoose.disconnect();
  process.exit(hasFailures ? 1 : 0);
})().catch(async (error) => {
  console.error("E2E auth check failed:", error.message);
  if (mongoose.connection.readyState) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
