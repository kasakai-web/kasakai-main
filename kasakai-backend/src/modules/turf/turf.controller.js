const Turf = require("../../models/Turf");

// ─────────────────────────────────────────────
// GET /api/v1/turfs   (public — active only)
// ─────────────────────────────────────────────
exports.getAllTurfs = async (req, res) => {
  try {
    const turfs = await Turf.find({ isActive: true });
    res.status(200).json({ success: true, count: turfs.length, data: turfs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/turfs/admin   (admin — all turfs)
// ─────────────────────────────────────────────
exports.getAllTurfsAdmin = async (req, res) => {
  try {
    const turfs = await Turf.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: turfs.length, data: turfs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/turfs/:id
// ─────────────────────────────────────────────
exports.getTurfById = async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id);
    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found." });
    }
    res.status(200).json({ success: true, data: turf });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/v1/turfs   (admin only)
// ─────────────────────────────────────────────
exports.createTurf = async (req, res) => {
  try {
    const turf = await Turf.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: turf });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/v1/turfs/:id   (admin only)
// ─────────────────────────────────────────────
exports.updateTurf = async (req, res) => {
  try {
    // Prevent overwriting these via PATCH — use dedicated endpoints
    const { isActive, isVerified, addedBy, totalGamesHosted, averageRating, totalRatings, ...updates } = req.body;

    const turf = await Turf.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found." });
    }

    res.status(200).json({ success: true, data: turf });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/v1/turfs/:id/verify   (admin only)
// ─────────────────────────────────────────────
exports.verifyTurf = async (req, res) => {
  try {
    const turf = await Turf.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );

    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found." });
    }

    res.status(200).json({ success: true, message: "Turf verified.", data: turf });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/v1/turfs/:id/discontinue   (admin only)
// Sets isActive = false (soft delete)
// ─────────────────────────────────────────────
exports.discontinueTurf = async (req, res) => {
  try {
    const turf = await Turf.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found." });
    }

    res.status(200).json({ success: true, message: "Turf discontinued.", data: turf });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/v1/turfs/:id/reactivate   (admin only)
// ─────────────────────────────────────────────
exports.reactivateTurf = async (req, res) => {
  try {
    const turf = await Turf.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found." });
    }

    res.status(200).json({ success: true, message: "Turf reactivated.", data: turf });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/v1/turfs/:id   (admin only — hard delete)
// Use discontinue for soft delete; this is permanent
// ─────────────────────────────────────────────
exports.deleteTurf = async (req, res) => {
  try {
    const turf = await Turf.findByIdAndDelete(req.params.id);

    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found." });
    }

    res.status(200).json({ success: true, message: "Turf permanently deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};
