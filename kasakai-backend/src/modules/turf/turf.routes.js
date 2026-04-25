const express = require("express");
const {
  getAllTurfs,
  getAllTurfsAdmin,
  getTurfById,
  createTurf,
  updateTurf,
  verifyTurf,
  discontinueTurf,
  reactivateTurf,
  deleteTurf,
} = require("./turf.controller");
const { protect, authorize } = require("../auth/auth.middleware");

const router = express.Router();

// ── Public ──────────────────────────────────
router.get("/", getAllTurfs);

// ── Admin only ───────────────────────────────
// Must be before /:id to avoid "admin" being treated as an id
router.get("/admin/all", protect, authorize("admin"), getAllTurfsAdmin);

router.get("/:id", getTurfById);

router.post("/", protect, authorize("admin"), createTurf);
router.patch("/:id", protect, authorize("admin"), updateTurf);
router.patch("/:id/verify", protect, authorize("admin"), verifyTurf);
router.patch("/:id/discontinue", protect, authorize("admin"), discontinueTurf);
router.patch("/:id/reactivate", protect, authorize("admin"), reactivateTurf);
router.delete("/:id", protect, authorize("admin"), deleteTurf);

module.exports = router;
