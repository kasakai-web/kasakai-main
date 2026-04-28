const path = require("path");
const fs = require("fs");
const Organiser = require("../../models/Organiser");
const Player = require("../../models/Player");

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

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const organiser = await Organiser.findById(req.user._id).select(safeOrganiserSelect);
    if (!organiser) {
      return res.status(404).json({ success: false, message: "Organiser not found" });
    }

    // Delete old profile image file if it exists
    if (organiser.profileImage) {
      const oldPath = path.join(__dirname, "../../../uploads", path.basename(organiser.profileImage));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updated = await Organiser.findByIdAndUpdate(
      req.user._id,
      { $set: { profileImage: imageUrl } },
      { new: true }
    ).select(safeOrganiserSelect);

    return res.status(200).json({ success: true, data: updated, message: "Profile image updated" });
  } catch (error) {
    console.error("uploadProfileImage organiser error:", error);
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

// ── Game Templates ────────────────────────────────────────────────────────────

exports.getTemplates = async (req, res) => {
  try {
    const organiser = await Organiser.findById(req.user._id)
      .select("gameTemplates")
      .populate("gameTemplates.turf", "name location.city");
    if (!organiser) return res.status(404).json({ success: false, message: "Organiser not found" });
    return res.status(200).json({ success: true, data: organiser.gameTemplates || [] });
  } catch (error) {
    console.error("getTemplates error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.saveTemplate = async (req, res) => {
  try {
    const {
      name, turf, format, durationMins, feeInRs, feeInPaise,
      minPlayers, totalSlots, reportingMinsBeforeGame,
      allowSizeChange, organiserIsPlaying, alternateFormats,
    } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: "Template name is required" });

    const template = {
      name: name.trim(),
      turf:                    turf                    || null,
      format:                  format                  || "6v6",
      durationMins:            durationMins            || 60,
      feeInPaise:              feeInRs ? Math.round(Number(feeInRs) * 100) : (feeInPaise || 0),
      minPlayers:              minPlayers              || 0,
      totalSlots:              totalSlots              || 0,
      reportingMinsBeforeGame: reportingMinsBeforeGame || 30,
      allowSizeChange:         Boolean(allowSizeChange),
      organiserIsPlaying:      Boolean(organiserIsPlaying),
      alternateFormats: Array.isArray(alternateFormats)
        ? alternateFormats.map((af) => ({
            ...af,
            feeInPaise: af.feeInRs ? Math.round(Number(af.feeInRs) * 100) : (af.feeInPaise || 0),
          }))
        : [],
    };

    const organiser = await Organiser.findByIdAndUpdate(
      req.user._id,
      { $push: { gameTemplates: template } },
      { new: true, select: "gameTemplates" }
    );

    const saved = organiser.gameTemplates[organiser.gameTemplates.length - 1];
    return res.status(201).json({ success: true, message: "Template saved", data: saved });
  } catch (error) {
    console.error("saveTemplate error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const organiser = await Organiser.findById(req.user._id);
    if (!organiser) return res.status(404).json({ success: false, message: "Organiser not found" });

    const tmpl = organiser.gameTemplates.id(templateId);
    if (!tmpl) return res.status(404).json({ success: false, message: "Template not found" });

    const allowed = [
      "name","turf","format","durationMins","minPlayers","totalSlots",
      "reportingMinsBeforeGame","allowSizeChange","organiserIsPlaying","alternateFormats",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) tmpl[key] = req.body[key];
    }
    if (req.body.feeInRs !== undefined) tmpl.feeInPaise = Math.round(Number(req.body.feeInRs) * 100);

    await organiser.save();
    return res.status(200).json({ success: true, message: "Template updated", data: tmpl });
  } catch (error) {
    console.error("updateTemplate error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const organiser = await Organiser.findByIdAndUpdate(
      req.user._id,
      { $pull: { gameTemplates: { _id: templateId } } },
      { new: true, select: "gameTemplates" }
    );
    if (!organiser) return res.status(404).json({ success: false, message: "Organiser not found" });
    return res.status(200).json({ success: true, message: "Template deleted" });
  } catch (error) {
    console.error("deleteTemplate error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Organiser uploads/replaces a player's profile image
// @route   POST /api/v1/organisers/me/players/:playerId/profile-image
// @access  Private (Organiser)
exports.uploadPlayerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const player = await Player.findById(req.params.playerId).select("_id name profileImage");
    if (!player) {
      return res.status(404).json({ success: false, message: "Player not found" });
    }

    if (player.profileImage) {
      const oldPath = path.join(__dirname, "../../../uploads", path.basename(player.profileImage));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const updated = await Player.findByIdAndUpdate(
      req.params.playerId,
      { $set: { profileImage: imageUrl } },
      { new: true }
    ).select("_id name profileImage");

    return res.status(200).json({ success: true, data: updated, message: "Player image updated" });
  } catch (error) {
    console.error("uploadPlayerImage organiser error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
