const path = require("path");
const fs = require("fs");
const Player = require("../../models/Player");

const safePlayerSelect = "-password -otp -otpExpires";

exports.getMyProfile = async (req, res) => {
  try {
    const player = await Player.findById(req.user._id).select(safePlayerSelect);

    if (!player) {
      return res.status(404).json({ success: false, message: "Player not found" });
    }

    return res.status(200).json({ success: true, data: player });
  } catch (error) {
    console.error("getMyProfile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "email",
      "phone",
      "whatsappNumber",
      "location",
      "preferences",
      "notificationSettings",
      "profileImage",
    ];

    const payload = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const updated = await Player.findByIdAndUpdate(
      req.user._id,
      { $set: payload },
      { new: true, runValidators: true }
    ).select(safePlayerSelect);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Player not found" });
    }

    return res.status(200).json({ success: true, data: updated, message: "Profile updated" });
  } catch (error) {
    console.error("updateMyProfile error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Phone or email already in use" });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const player = await Player.findById(req.user._id).select(safePlayerSelect);
    if (!player) {
      return res.status(404).json({ success: false, message: "Player not found" });
    }

    // Delete old profile image file if it exists
    if (player.profileImage) {
      const oldPath = path.join(__dirname, "../../../uploads", path.basename(player.profileImage));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updated = await Player.findByIdAndUpdate(
      req.user._id,
      { $set: { profileImage: imageUrl } },
      { new: true }
    ).select(safePlayerSelect);

    return res.status(200).json({ success: true, data: updated, message: "Profile image updated" });
  } catch (error) {
    console.error("uploadProfileImage player error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    const deleted = await Player.findByIdAndDelete(req.user._id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Player not found" });
    }

    return res.status(200).json({ success: true, message: "Profile deleted successfully" });
  } catch (error) {
    console.error("deleteMyProfile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
