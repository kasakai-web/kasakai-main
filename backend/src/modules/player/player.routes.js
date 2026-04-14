const express = require("express");
const { protect, authorize } = require("../auth/auth.middleware");
const { getMyProfile, updateMyProfile, deleteMyProfile, uploadProfileImage } = require("./player.controller");
const { getMyWallet, topUpWallet } = require("../wallet/wallet.controller");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

router
  .route("/me")
  .get(protect, authorize("player"), getMyProfile)
  .patch(protect, authorize("player"), updateMyProfile)
  .delete(protect, authorize("player"), deleteMyProfile);

router.post(
  "/me/profile-image",
  protect,
  authorize("player"),
  upload.single("profileImage"),
  uploadProfileImage
);

router.get("/me/wallet",        protect, authorize("player"), getMyWallet);
router.post("/me/wallet/topup", protect, authorize("player"), topUpWallet);

module.exports = router;
