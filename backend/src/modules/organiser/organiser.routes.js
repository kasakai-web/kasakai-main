const express = require("express");
const { protect, authorize } = require("../auth/auth.middleware");
const { getMyProfile, updateMyProfile, deleteMyProfile, uploadProfileImage } = require("./organiser.controller");
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

module.exports = router;
