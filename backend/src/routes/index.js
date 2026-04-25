import express from "express";
import gamesRoutes from "./games.routes.js";

const router = express.Router();

// mount games routes
router.use("/games", gamesRoutes);

export default router;