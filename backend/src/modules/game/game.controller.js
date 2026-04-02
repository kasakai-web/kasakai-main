const Game = require("../../models/Game");

// @desc    Create new game
// @route   POST /api/v1/games
// @access  Private (Organiser only)
exports.createGame = async (req, res) => {
  try {
    // Add user as organiser
    req.body.organiser = req.user.id;
    
    // Convert fee from Rs to Paise
    if (req.body.feeInRs) {
        req.body.feeInPaise = req.body.feeInRs * 100;
    }

    // Attempt to compute total slots from format (e.g. 5v5 -> 10 slots)
    // format looks like "XvY"
    if (req.body.format && !req.body.totalSlots) {
        const parts = req.body.format.split('v');
        if (parts.length === 2) {
            req.body.totalSlots = parseInt(parts[0]) + parseInt(parts[1]);
        }
    }
    
    // Set a default minPlayers if not provided
    if (!req.body.minPlayers && req.body.totalSlots) {
        req.body.minPlayers = Math.floor(req.body.totalSlots * 0.7); // e.g. 10 -> 7
    }

    const game = await Game.create(req.body);

    res.status(201).json({
      success: true,
      data: game,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get games for the specific organiser
// @route   GET /api/v1/games/organiser
// @access  Private (Organiser)
exports.getOrganiserGames = async (req, res) => {
  try {
    const games = await Game.find({ organiser: req.user.id })
                            .populate('turf', 'name location.city address')
                            .sort('-scheduledAt');

    res.status(200).json({
      success: true,
      count: games.length,
      data: games,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};