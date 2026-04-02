const express = require("express");
const { protect, authorize } = require("../auth/auth.middleware");
const { getMyProfile, updateMyProfile, deleteMyProfile } = require("./organiser.controller");

const router = express.Router();

router
  .route("/me")
  .get(protect, authorize("organiser"), getMyProfile)
  .patch(protect, authorize("organiser"), updateMyProfile)
  .delete(protect, authorize("organiser"), deleteMyProfile);

module.exports = router;
