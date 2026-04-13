const express = require("express");
const {
  createGame,
  getOrganiserGames,
  deleteGame,
  updateGame,
  openGameForRegistration,
  confirmGame,
  addPlayerByOrganiser,
  organiserWithdraw,
  removeRegistration,
  getAllGames,
  getGameById,
  getMyGames,
  getMyWaitlist,
  registerForGame,
  backoutFromGame,
  joinWaitlist,
  leaveWaitlist,
} = require("./game.controller");
const { protect, authorize } = require("../auth/auth.middleware");

const router = express.Router();

// Organiser-facing routes (must come BEFORE catch-all routes)
router.route("/organisers/create")
  .post(protect, authorize("organiser"), createGame);

router.route("/organisers/my-games")
  .get(protect, authorize("organiser"), getOrganiserGames);

router.route("/organisers/:id/open")
  .patch(protect, authorize("organiser"), openGameForRegistration);

router.route("/organisers/:id/confirm")
  .patch(protect, authorize("organiser"), confirmGame);

router.route("/organisers/:id/add-player")
  .post(protect, authorize("organiser"), addPlayerByOrganiser);

router.route("/organisers/:id/withdraw")
  .post(protect, authorize("organiser"), organiserWithdraw);

router.route("/organisers/:id/registrations/:regId")
  .delete(protect, authorize("organiser"), removeRegistration);

router.route("/organisers/:id")
  .delete(protect, authorize("organiser"), deleteGame)
  .patch(protect, authorize("organiser"), updateGame);

// Player-facing routes (more specific to less specific)
router.route("/my-games")
  .get(protect, authorize("player"), getMyGames);

router.route("/my-waitlist")
  .get(protect, authorize("player"), getMyWaitlist);

router.route("/:id/register")
  .post(protect, authorize("player"), registerForGame);

router.route("/:id/backout")
  .post(protect, authorize("player"), backoutFromGame);

router.route("/:id/waitlist")
  .post(protect, authorize("player"), joinWaitlist);

router.route("/:id/leave-waitlist")
  .post(protect, authorize("player"), leaveWaitlist);

router.route("/:id")
  .get(protect, authorize("player", "organiser"), getGameById);

// Catch-all route for listing games (must come LAST)
router.route("/")
  .get(protect, authorize("player"), getAllGames);

module.exports = router;