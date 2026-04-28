const express = require("express");
const { protect, authorize } = require("../auth/auth.middleware");
const {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
  uploadProfileImage,
  uploadPlayerImage,
  getTemplates,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
} = require("./organiser.controller");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

router
  .route("/me")
  .get(protect, authorize("organiser"), getMyProfile)
  .patch(protect, authorize("organiser"), updateMyProfile)
  .delete(protect, authorize("organiser"), deleteMyProfile);

router.post(
  "/me/profile-image",
  protect,
  authorize("organiser"),
  upload.single("profileImage"),
  uploadProfileImage
);

router.post(
  "/me/players/:playerId/profile-image",
  protect,
  authorize("organiser"),
  upload.single("profileImage"),
  uploadPlayerImage
);

// Game templates
router
  .route("/me/templates")
  .get(protect, authorize("organiser"), getTemplates)
  .post(protect, authorize("organiser"), saveTemplate);

router
  .route("/me/templates/:templateId")
  .patch(protect, authorize("organiser"), updateTemplate)
  .delete(protect, authorize("organiser"), deleteTemplate);

module.exports = router;
