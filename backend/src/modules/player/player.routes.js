const express = require("express");
const { protect, authorize } = require("../auth/auth.middleware");
const { getMyProfile, updateMyProfile, deleteMyProfile } = require("./player.controller");

const router = express.Router();

router
  .route("/me")
  .get(protect, authorize("player"), getMyProfile)
  .patch(protect, authorize("player"), updateMyProfile)
  .delete(protect, authorize("player"), deleteMyProfile);

module.exports = router;
