const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const healthRoutes = require("./health.routes");
const gamesRoutes = require("./games.routes"); // 👈 ADD THIS

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/health", healthRoutes);
router.use("/games", gamesRoutes); // 👈 ADD THIS

module.exports = router;