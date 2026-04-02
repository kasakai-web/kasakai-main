const Organiser = require("../../models/Organiser");

const safeOrganiserSelect = "-password -otp -otpExpires";

exports.getMyProfile = async (req, res) => {
  try {
    const organiser = await Organiser.findById(req.user._id).select(safeOrganiserSelect);

    if (!organiser) {
      return res.status(404).json({ success: false, message: "Organiser not found" });
    }

    return res.status(200).json({ success: true, data: organiser });
  } catch (error) {
    console.error("getMyProfile organiser error:", error);
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
      "community",
      "defaultTurfId",
      "defaultFeeInPaise",
      "defaultFormat",
      "defaultCutoffHours",
      "notificationSettings",
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

    const updated = await Organiser.findByIdAndUpdate(
      req.user._id,
      { $set: payload },
      { new: true, runValidators: true }
    ).select(safeOrganiserSelect);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Organiser not found" });
    }

    return res.status(200).json({ success: true, data: updated, message: "Profile updated" });
  } catch (error) {
    console.error("updateMyProfile organiser error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Phone or email already in use" });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    const deleted = await Organiser.findByIdAndDelete(req.user._id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Organiser not found" });
    }

    return res.status(200).json({ success: true, message: "Profile deleted successfully" });
  } catch (error) {
    console.error("deleteMyProfile organiser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
