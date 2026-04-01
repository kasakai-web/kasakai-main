const express = require("express");
const {
  register,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
