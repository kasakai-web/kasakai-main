const express = require("express");
const { createGame, getOrganiserGames, deleteGame, updateGame } = require("./game.controller");
const { protect, authorize } = require("../auth/auth.middleware");

const router = express.Router();

// Routes for organisers to manage games
router
  .route("/")
  .post(protect, authorize("organiser"), createGame);

router
  .route("/organiser")
  .get(protect, authorize("organiser"), getOrganiserGames);

router
  .route("/:id")
  .delete(protect, authorize("organiser"), deleteGame)
  .patch(protect, authorize("organiser"), updateGame);

module.exports = router;