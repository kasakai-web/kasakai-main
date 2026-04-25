const TeamDistributor = require("../../utils/teamDistributor");
const GameDecisionEngine = require("../../utils/gameDecisionEngine");
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


// ================= ORGANISER ROUTES =================

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


// ================= PLAYER ROUTES =================

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


// ================= CUSTOM LOGIC ROUTES =================

// ✅ TEAM DISTRIBUTION
router.post("/:id/distribute", async (req, res) => {
  try {
    const { players } = req.body;

    console.log("Players received:", players);

    if (!players || players.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Not enough players",
      });
    }

    const distributor = new TeamDistributor(players);
    const result = distributor.generateTeams();

    return res.json({
      success: true,
      teams: result.teams,
    });

  } catch (err) {
    console.error("Distribution error:", err);
    res.status(500).json({ success: false });
  }
});


// ✅ GAME DECISION ENGINE
router.post("/:id/evaluate", async (req, res) => {
  try {
    const { players, time } = req.body;

    console.log("Evaluate called:", time, players?.length);

    if (!players) {
      return res.status(400).json({
        success: false,
        message: "Players missing",
      });
    }

    const engine = new GameDecisionEngine(players.length);
    let result;

    if (time === "8PM") {
      result = engine.evaluateAt8PM();
    } 
    else if (time === "10PM") {
      result = engine.evaluateAt10PM();

      // 🔥 AUTO DISTRIBUTE WHEN CONFIRMED
      if (result.action === "CONFIRM" && players.length >= 2) {
        const distributor = new TeamDistributor(players);
        const teamResult = distributor.generateTeams();

        return res.json({
          success: true,
          decision: result,
          teams: teamResult.teams
        });
      }
    } 
    else if (time === "BEFORE_GAME") {
      result = engine.evaluateBeforeGame();
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid time",
      });
    }

    console.log("Decision:", result);

    return res.json({
      success: true,
      decision: result,
    });

  } catch (err) {
    console.error("Decision error:", err);
    res.status(500).json({ success: false });
  }
});


// ================= GAME FETCH =================

router.route("/:id")
  .get(protect, authorize("player", "organiser"), getGameById);


// ================= ALL GAMES =================

router.route("/")
  .get(protect, authorize("player"), getAllGames);


module.exports = router;