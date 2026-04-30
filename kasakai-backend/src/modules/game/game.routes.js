const Game = require("../../models/Game");
const PlayerRating = require("../../models/PlayerRating");
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
  getPublicGames,
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

router.post(
  "/organisers/:id/distribute",
  protect,
  authorize("organiser"),
  async (req, res) => {
    try {
      const gameId = req.params.id;
      const game   = await Game.findById(gameId).populate("registrations.player");

      if (!game) {
        return res.status(404).json({ success: false, message: "Game not found" });
      }

      // Ownership check — only the game's organiser may distribute
      if (game.organiser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to distribute this game" });
      }

      const validRegs = (game.registrations || []).filter(
        r => !['refunded', 'forfeited'].includes(r.paymentStatus)
      );

      if (validRegs.length < 2) {
        return res.status(400).json({ success: false, message: "Need at least 2 players to distribute" });
      }

      // Fetch the most-recent organiser rating for every registered player to get
      // gkAffinity, playWith, and playAgainst (stored as ObjectId refs — populate names).
      const playerIds = validRegs.map(r => r.player?._id).filter(Boolean);
      const allRatings = await PlayerRating.find({ player: { $in: playerIds } })
        .populate("playWith",    "name")
        .populate("playAgainst", "name")
        .sort({ createdAt: -1 })
        .lean();

      // Keep only the most recent rating per player (array is already sorted desc)
      const ratingMap = {};
      for (const r of allRatings) {
        const pid = r.player.toString();
        if (!ratingMap[pid]) ratingMap[pid] = r;
      }

      const positionMap = {
        goalkeeper: "G",
        defender:   "D",
        midfielder: "M",
        forward:    "F",
        any:        "Any",
      };

      const players = validRegs.map(reg => {
        const p   = reg.player;
        const pid = p?._id?.toString();
        const pr  = pid ? ratingMap[pid] : null;

        // Dedicated GK → gkQuotient 3; gkAffinity ≥ 2 from organiser rating → use that value.
        let gkQuotient = 0;
        if (reg.preferredPosition === "goalkeeper") {
          gkQuotient = 3;
        } else if (pr?.gkAffinity != null && pr.gkAffinity >= 2) {
          gkQuotient = pr.gkAffinity;
        }

        return {
          id:          p?._id,
          name:        p?.name   || "Unknown",
          // Use 2.5 (mid-range) for unrated players so they don't appear max-skilled.
          rating:      (p?.rating > 0) ? p.rating : 2.5,
          position:    positionMap[reg.preferredPosition] || "Any",
          gkQuotient,
          // Merge PlayerRating history with per-game registration preferences (deduplicated).
          playWith:    [...new Set([
            ...(pr?.playWith?.map(p => p.name).filter(Boolean) ?? []),
            ...(reg.playWith ?? []),
          ])],
          playAgainst: [...new Set([
            ...(pr?.playAgainst?.map(p => p.name).filter(Boolean) ?? []),
            ...(reg.playAgainst ?? []),
          ])],
          signedUpAt:  reg.signedUpAt,
        };
      });

      // Include the organiser as a player if they are playing
      if (game.organiserIsPlaying) {
        players.push({
          id:          game.organiser,
          name:        "Organiser",
          rating:      2.5,
          position:    "Any",
          gkQuotient:  0,
          playWith:    [],
          playAgainst: [],
          signedUpAt:  game.createdAt,
        });
      }

      if (players.length < (game.minPlayers || 2)) {
        return res.status(400).json({ success: false, message: "Not enough players to distribute" });
      }

      const distributor = new TeamDistributor(players);
      const result      = distributor.generateTeams();

      return res.json({
        success: true,
        data: {
          teamA:           result.teams.teamA.players,
          teamB:           result.teams.teamB.players,
          statsA:          result.teams.teamA.stats,
          statsB:          result.teams.teamB.stats,
          isBalanced:      result.isBalanced,
          skillDifference: result.skillDifference,
          reasoningLog:    result.reasoningLog,
        },
      });
    } catch (err) {
      console.error("[DISTRIBUTE]", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

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

// ── Public route (no auth) ───────────────────────────────────────────────────
router.route("/public").get(getPublicGames);

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