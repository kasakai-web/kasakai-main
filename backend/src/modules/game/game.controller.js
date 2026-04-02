const Game = require("../../models/Game");

// @desc    Create new game
// @route   POST /api/v1/games
// @access  Private (Organiser only)
exports.createGame = async (req, res) => {
  try {
    // Add user as organiser
    req.body.organiser = req.user._id;
    
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
    const games = await Game.find({ organiser: req.user._id })
                            .populate('turf', 'name location.city address')
                            .populate('organiser', 'name phone')
                            .populate('registrations.player', 'name phone email role')
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

// @desc    Delete a game (cancel event)
// @route   DELETE /api/v1/games/:id
// @access  Private (Organiser only)
exports.deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    // Check if the organiser owns this game
    if (game.organiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this game",
      });
    }

    // Check if game is already cancelled or completed
    if (game.status === 'cancelled' || game.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a ${game.status} game`,
      });
    }

    await Game.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Game cancelled and removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update a game
// @route   PATCH /api/v1/games/:id
// @access  Private (Organiser only)
exports.updateGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    // Check if the organiser owns this game
    if (game.organiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this game",
      });
    }

    // Check if game is already completed
    if (game.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: "Cannot update a completed game",
      });
    }

    // Update allowed fields
    const allowedFields = ['title', 'format', 'totalSlots', 'feeInPaise', 'feeInRs', 'durationMins', 'minPlayers'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'feeInRs') {
          updateData.feeInPaise = req.body[field] * 100;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    const updatedGame = await Game.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Game updated successfully",
      data: updatedGame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};