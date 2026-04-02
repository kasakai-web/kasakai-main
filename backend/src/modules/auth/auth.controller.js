const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Player = require("../../models/Player");
const Organiser = require("../../models/Organiser");
const sendFast2SMS = require("../../utils/fast2sms"); 

const crypto = require("node:crypto");

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getModelByRole = (role) => {
  return role === "organiser" ? Organiser : Player;
};

// ===============================
// REGISTER (Step 1)
// ===============================
exports.register = async (req, res) => {
  try {
    const { name, phone, email, whatsappNumber, password, role } = req.body;
    
    // Choose model based on role given by frontend
    const Model = getModelByRole(role);

    // Check existing
    const existingUser = await Model.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with this phone number." });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create inactive account with OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = new Model({
      name,
      phone,
      email,
      whatsappNumber: whatsappNumber || phone,
      password: hashedPassword,
      otp,
      otpExpires,
      isVerified: false
    });

    await newUser.save();

    // Fast2SMS integration
    console.log(`\n======================================`);
    console.log(`🚀 DEVELOPMENT MODE: OTP for ${phone} is: [ ${otp} ]`);
    console.log(`======================================\n`);

    try {
      await sendFast2SMS(phone, `Your Kasakai OTP is ${otp}. Valid for 10 mins.`);
      console.log(`[${role}]: sent OTP ${otp} to ${phone} via Fast2SMS`);
    } catch (smsError) {
      console.error(`[${role}]: Failed to send OTP via Fast2SMS. OTP is ${otp}`);
      // In development, we can still proceed even if SMS fails
    }

    res.status(200).json({ success: true, message: "OTP sent successfully to phone." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ===============================
// VERIFY OTP (Step 2/3)
// ===============================
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp, role, mode } = req.body;
    const Model = getModelByRole(role);

    const user = await Model.findOne({ phone });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found." });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // If just verifying for forgot password, don't consume the OTP and don't confirm account
    if (mode === "forgot-password") {
      return res.status(200).json({ success: true, message: "OTP correct. Proceed to reset password." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    // For Organisers, setting them pending on approval by admin
    // TEMP: Auto-approving organisers because the Admin panel is not built yet
    if (role === "organiser" || role === "organizer") {
       user.approvalStatus = "approved";
    }

    await user.save();

    res.status(200).json({ success: true, message: "Account verified successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ===============================
// LOGIN
// ===============================
exports.login = async (req, res) => {
  try {
    const { phone, password, role } = req.body;
    const Model = getModelByRole(role);

    const user = await Model.findOne({ phone });
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: "Account not verified. Please verify your phone number." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Role specific checks
    if (role === "organiser" && user.approvalStatus !== "approved") {
      return res.status(403).json({ success: false, message: `Account is ${user.approvalStatus}. Please wait for admin approval.` });
    }

    // Generate strict token with roles
    const token = jwt.sign(
      { id: user._id, role: role || "player" },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: role || "player"
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ===============================
// FORGOT PASSWORD
// ===============================
exports.forgotPassword = async (req, res) => {
  try {
    const { phone, role } = req.body;
    const Model = getModelByRole(role);

    const user = await Model.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Fast2SMS call
    console.log(`\n======================================`);
    console.log(`🚀 DEVELOPMENT MODE: FORGOT PASSWORD OTP for ${phone} is: [ ${otp} ]`);
    console.log(`======================================\n`);

    try {
      await sendFast2SMS(phone, `Your password reset OTP is ${otp}. Valid for 10 mins.`);
      console.log(`[${role}]: Password reset OTP ${otp} to ${phone}`);
    } catch (smsError) {
      console.error(`[${role}]: Failed to send reset OTP via Fast2SMS. OTP is ${otp}`);
    }

    res.status(200).json({ success: true, message: "Password reset OTP sent." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ===============================
// RESET PASSWORD
// ===============================
exports.resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword, role } = req.body;
    const Model = getModelByRole(role);

    const user = await Model.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password successfully reset." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};