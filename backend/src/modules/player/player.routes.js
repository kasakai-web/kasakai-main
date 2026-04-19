const express    = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { protect, authorize } = require("../auth/auth.middleware");
const { getMyProfile, updateMyProfile, deleteMyProfile, uploadProfileImage } = require("./player.controller");
const { getMyWallet, topUpWallet } = require("../wallet/wallet.controller");
const { createOrder, verifyPayment } = require("../wallet/razorpay.controller");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

// Stricter rate limit for payment endpoints — prevents brute-force order creation
const paymentLimiter = rateLimit({
  windowMs:       60 * 1000, // 1 minute
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  keyGenerator:   (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  message: { success: false, message: 'Too many payment requests. Please wait a minute.' },
});

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

router.get( "/me/wallet",          protect, authorize("player"), getMyWallet);
router.post("/me/wallet/topup",    protect, authorize("player"), topUpWallet);
router.post("/me/wallet/orders",   protect, authorize("player"), paymentLimiter, createOrder);
router.post("/me/wallet/verify",   protect, authorize("player"), paymentLimiter, verifyPayment);

module.exports = router;
