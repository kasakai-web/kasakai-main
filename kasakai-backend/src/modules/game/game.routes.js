const Game = require("../../models/Game"); // keep if this path works
const TeamDistributor = require("../../utils/teamDistributor");
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
  approveWaitlist,
  getAllGames,
  getGameById,
  getMyGames,
  getMyWaitlist,
  registerForGame,
  backoutFromGame,
  joinWaitlist,
  leaveWaitlist,
  // Post-game
  completeGame,
  markAttendance,
  savePlayerRatings,
  getPlayerRatings,
  submitFeedback,
  getMyFeedback,
  getPendingFeedback,
  getMyRatings,
  getGameFeedback,
  getMyFeedbackSummary,
  getMyRatingsGiven,
  getFinancialSummary,
} = require("./game.controller");
const { protect, authorize } = require("../auth/auth.middleware");

const router = express.Router();

// ── Organiser-facing routes (must come BEFORE catch-all routes) ──────────────
router.route("/organisers/create")
  .post(protect, authorize("organiser"), createGame);

router.route("/organisers/my-games")
  .get(protect, authorize("organiser"), getOrganiserGames);

router.route("/organisers/:id/open")
  .patch(protect, authorize("organiser"), openGameForRegistration);

router.route("/organisers/:id/confirm")
  .patch(protect, authorize("organiser"), confirmGame);

// ✅ ADD DISTRIBUTE HERE (NOT AT BOTTOM)
router.post(
  "/organisers/:id/distribute",
  protect,
  authorize("organiser"),
  async (req, res) => {
    try {
      console.log("🚀 USING REAL ALGO");

      const gameId = req.params.id;

const game = await Game.findById(gameId)
  .populate("registrations.player");

if (!game) {
  return res.status(404).json({
    success: false,
    message: "Game not found",
  });
}

const validRegs = (game.registrations || []).filter(
  (r) => !['refunded','forfeited'].includes(r.paymentStatus)
);
const positionMap = {
  goalkeeper: "G",
  defender: "D",
  midfielder: "M",
  forward: "F",
  any: "Any"
};
const players = validRegs.map((reg) => {
  const p = reg.player;

  return {
    id: p?._id,
    name: p?.name || "Unknown",

    rating: p?.rating || 5,

    position: positionMap[reg.preferredPosition] || "Any",

    gkQuotient: reg.preferredPosition === "goalkeeper" ? 1 : 0,

    playWith: [],
    playAgainst: [],
  };
});

// ➕ Add organiser if playing
if (game.organiserIsPlaying) {
  players.push({
    id: game.organiser,
    name: "Organiser",
    rating: 5,
    position: "Any",
    gkQuotient: 0,
    playWith: [],
    playAgainst: [],
  });
}

console.log("Players from DB:", players.length);

      if (players.length < game.minPlayers) {
        return res.status(400).json({
          success: false,
          message: "Not enough players",
        });
      }

      const distributor = new TeamDistributor(players);
      const result = distributor.generateTeams();

      return res.json({
        success: true,
        data: {
          teamA: result.teams.teamA.players,
          teamB: result.teams.teamB.players,
          statsA: result.teams.teamA.stats,
          statsB: result.teams.teamB.stats,
          isBalanced: result.isBalanced,
          skillDifference: result.skillDifference
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

router.route("/organisers/:id/complete")
  .patch(protect, authorize("organiser"), completeGame);

router.route("/organisers/:id/complete")
  .patch(protect, authorize("organiser"), completeGame);

router.route("/organisers/:id/attendance")
  .post(protect, authorize("organiser"), markAttendance);

router.route("/organisers/:id/player-ratings")
  .get(protect, authorize("organiser"), getPlayerRatings)
  .post(protect, authorize("organiser"), savePlayerRatings);

router.route("/organisers/:id/game-feedback")
  .get(protect, authorize("organiser"), getGameFeedback);

router.route("/organisers/my-feedback-summary")
  .get(protect, authorize("organiser"), getMyFeedbackSummary);

router.route("/organisers/my-ratings-given")
  .get(protect, authorize("organiser"), getMyRatingsGiven);

router.route("/organisers/financial-summary")
  .get(protect, authorize("organiser"), getFinancialSummary);

router.route("/organisers/:id/add-player")
  .post(protect, authorize("organiser"), addPlayerByOrganiser);

router.route("/organisers/:id/withdraw")
  .post(protect, authorize("organiser"), organiserWithdraw);

router.route("/organisers/:id/registrations/:regId")
  .delete(protect, authorize("organiser"), removeRegistration);

router.route("/organisers/:id/waitlist/:waitlistId/approve")
  .post(protect, authorize("organiser"), approveWaitlist);

router.route("/organisers/:id")
  .delete(protect, authorize("organiser"), deleteGame)
  .patch(protect, authorize("organiser"), updateGame);

// ── Player-facing routes (more specific to less specific) ────────────────────
router.route("/my-games")
  .get(protect, authorize("player"), getMyGames);

router.route("/my-waitlist")
  .get(protect, authorize("player"), getMyWaitlist);

router.route("/my-ratings")
  .get(protect, authorize("player"), getMyRatings);

router.route("/pending-feedback")
  .get(protect, authorize("player"), getPendingFeedback);

router.route("/:id/register")
  .post(protect, authorize("player"), registerForGame);

router.route("/:id/backout")
  .post(protect, authorize("player"), backoutFromGame);

router.route("/:id/waitlist")
  .post(protect, authorize("player"), joinWaitlist);

router.route("/:id/leave-waitlist")
  .post(protect, authorize("player"), leaveWaitlist);

router.route("/:id/feedback")
  .post(protect, authorize("player"), submitFeedback)
  .get(protect, authorize("player"), getMyFeedback);

router.route("/:id")
  .get(protect, authorize("player", "organiser"), getGameById);

// Catch-all route for listing games (must come LAST)
router.route("/")
  .get(protect, authorize("player"), getAllGames);

module.exports = router;