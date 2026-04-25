import express from "express";
import TeamDistributor from "../utils/teamDistributor.js";

const router = express.Router();

router.post("/:gameId/distribute", async (req, res) => {
  try {
    const { players } = req.body;

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
    console.error(err);
    res.status(500).json({ success: false });
  }
});

export default router;