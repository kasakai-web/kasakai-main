const Game = require("../../models/Game");
const { sendGameCreatedEmail, sendGameRegistrationEmail } = require("../../utils/email");

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

    // Set status to 'open' by default so players can immediately register
    if (!req.body.status) {
        req.body.status = 'open';
    }

    const game = await Game.create(req.body);

    if (req.user?.email) {
      sendGameCreatedEmail({
        to: req.user.email,
        organiserName: req.user.name,
        gameTitle: game.title,
        scheduledAt: game.scheduledAt,
        format: game.format,
      }).catch((emailError) => {
        console.error("[EMAIL] Failed to send game created email:", emailError?.message || emailError);
      });
    }

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

// @desc    Open game for registration
// @route   PATCH /api/v1/games/organisers/:id/open
// @access  Private (Organiser only)
exports.openGameForRegistration = async (req, res) => {
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
        message: "Not authorized to modify this game",
      });
    }

    if (game.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Game is already ${game.status}. Cannot open a game that is not in draft status.`,
      });
    }

    // Transition game to 'open' status
    game.status = 'open';
    await game.save();

    res.status(200).json({
      success: true,
      message: "Game opened for registration",
      data: game,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get games for the specific organiser
// @route   GET /api/v1/games/organisers/my-games
// @access  Private (Organiser)
exports.getOrganiserGames = async (req, res) => {
  try {
    console.log('[DEBUG] getOrganiserGames - User ID:', req.user?._id, 'Role:', req.user?.role);
    
    if (!req.user || !req.user._id) {
      console.error('[ERROR] req.user or req.user._id is missing');
      return res.status(401).json({
        success: false,
        message: "User not properly authenticated",
      });
    }

    const games = await Game.find({ organiser: req.user._id })
      .populate('turf', 'name location.city address')
      .populate('organiser', 'name phone')
      .populate({
        path: 'registrations.player',
        select: 'name phone email role'
      })
      .sort('-scheduledAt')
      .lean();

    console.log('[DEBUG] Found', games.length, 'games for organiser');

    res.status(200).json({
      success: true,
      count: games.length,
      data: games,
    });
  } catch (error) {
    console.error('[ERROR] getOrganiserGames:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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

    // Preserve history by soft-cancelling the game instead of deleting it
    if (game.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Game is already cancelled',
      });
    }

    if (game.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed game',
      });
    }

    game.status = 'cancelled';
    game.cancelledAt = new Date();
    await game.save();

    res.status(200).json({
      success: true,
      message: "Game cancelled successfully",
      data: game,
    });
  } catch (error) {
    console.error('[ERROR] deleteGame error:', error.message);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
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
    const updateData = {};

    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.format !== undefined) updateData.format = req.body.format;
    if (req.body.totalSlots !== undefined) updateData.totalSlots = Number(req.body.totalSlots);
    if (req.body.durationMins !== undefined) updateData.durationMins = Number(req.body.durationMins);
    if (req.body.minPlayers !== undefined) updateData.minPlayers = Number(req.body.minPlayers);
    if (req.body.feeInRs !== undefined) updateData.feeInPaise = Number(req.body.feeInRs) * 100;
    if (req.body.feeInPaise !== undefined) updateData.feeInPaise = Number(req.body.feeInPaise);
    if (req.body.turf !== undefined) updateData.turf = req.body.turf;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.scheduledAt !== undefined) updateData.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.cutoffAt !== undefined) updateData.cutoffAt = new Date(req.body.cutoffAt);

    // If schedule changes and cutoff is not explicitly provided, keep it sensible.
    if (updateData.scheduledAt && !updateData.cutoffAt) {
      updateData.cutoffAt = new Date(new Date(updateData.scheduledAt).getTime() - 2 * 60 * 60 * 1000);
    }

    // Recompute minPlayers if omitted but totalSlots changed.
    if (updateData.totalSlots !== undefined && updateData.minPlayers === undefined) {
      updateData.minPlayers = Math.floor(updateData.totalSlots * 0.7);
    }

    const updatedGame = await Game.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedGame) {
      return res.status(404).json({
        success: false,
        message: "Game not found after update",
      });
    }

    res.status(200).json({
      success: true,
      message: "Game updated successfully",
      data: updatedGame,
    });
  } catch (error) {
    console.error('[ERROR] updateGame error:', error.message);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get all available games for players
// @route   GET /api/v1/games
// @access  Private (Player)
exports.getAllGames = async (req, res) => {
  try {
    console.log('[DEBUG] getAllGames called by user:', req.user?.role, req.user?._id);
    
    // First try to get future, open/confirmed games
    let games = await Game.find({ 
      status: { $in: ['open', 'confirmed'] },
      scheduledAt: { $gt: new Date() } 
    })
    .populate('turf', 'name location.city')
    .populate('organiser', 'name')
    .sort('scheduledAt')
    .lean()
    .exec();

    console.log('[DEBUG] Found open/confirmed future games:', games?.length || 0);

    // If no games found, try to get ALL future games for debugging
    if (!games || games.length === 0) {
      console.log('[DEBUG] No open games found, fetching all future games...');
      games = await Game.find({ 
        scheduledAt: { $gt: new Date() } 
      })
      .populate('turf', 'name location.city')
      .populate('organiser', 'name')
      .sort('scheduledAt')
      .lean()
      .exec();
      
      console.log('[DEBUG] Found total future games:', games?.length || 0);
      if (games && games.length > 0) {
        console.log('[DEBUG] Game statuses:', games.slice(0, 5).map(g => ({ title: g.title, status: g.status })));
      }
    }

    res.status(200).json({
      success: true,
      count: games ? games.length : 0,
      data: games || [],
    });
  } catch (error) {
    console.error('[ERROR] getAllGames error:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get a single game by ID
// @route   GET /api/v1/games/:id
// @access  Private (Player/Organiser)
exports.getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('turf')
      .populate('organiser', 'name')
      .populate('registrations.player', 'name');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.status(200).json({
      success: true,
      data: game,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get all games a player is registered for
// @route   GET /api/v1/games/my-games
// @access  Private (Player)
exports.getMyGames = async (req, res) => {
  try {
    console.log('[DEBUG] getMyGames called by player:', req.user._id);
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const games = await Game.find({ 'registrations.player': req.user._id })
      .populate('turf', 'name location.city')
      .populate('organiser', 'name')
      .sort('-scheduledAt')
      .lean()
      .exec();

    console.log('[DEBUG] Found my games:', games?.length || 0);

    res.status(200).json({
      success: true,
      count: games ? games.length : 0,
      data: games || [],
    });
  } catch (error) {
    console.error('[ERROR] getMyGames error:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message
    });
  }
};

// @desc    Register for a game
// @route   POST /api/v1/games/:id/register
// @access  Private (Player)
exports.registerForGame = async (req, res) => {
  try {
    console.log('[DEBUG] registerForGame called by player:', req.user._id, 'for game:', req.params.id);
    
    const game = await Game.findById(req.params.id);

    if (!game) {
      console.error('[ERROR] Game not found:', req.params.id);
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    if (game.status !== 'open' && game.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: "Game is not open for registration" });
    }

    if (game.registrations.some(reg => reg.player.toString() === req.user._id.toString())) {
      return res.status(400).json({ success: false, message: "Already registered for this game" });
    }
    
    if (game.spotsRemaining <= 0) {
        return res.status(400).json({ success: false, message: "No spots remaining" });
    }

    const registration = {
      player: req.user._id,
      paymentStatus: 'pending',
      signedUpAt: new Date(),
    };

    game.registrations.push(registration);
    await game.save();

    if (req.user?.email) {
      sendGameRegistrationEmail({
        to: req.user.email,
        playerName: req.user.name,
        gameTitle: game.title,
        scheduledAt: game.scheduledAt,
        format: game.format,
      }).catch((emailError) => {
        console.error("[EMAIL] Failed to send registration confirmation email:", emailError?.message || emailError);
      });
    }

    console.log('[DEBUG] Player registered successfully for game');

    res.status(200).json({
      success: true,
      message: "Registered for game successfully",
      data: game,
    });
  } catch (error) {
    console.error('[ERROR] registerForGame error:', error);
    res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
};

// @desc    Backout from a game
// @route   POST /api/v1/games/:id/backout
// @access  Private (Player)
exports.backoutFromGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    const registrationIndex = game.registrations.findIndex(reg => reg.player.toString() === req.user._id.toString());

    if (registrationIndex === -1) {
      return res.status(400).json({ success: false, message: "Not registered for this game" });
    }

    // Handle backout logic, e.g., check cutoff time, apply fees
    // For now, just remove the registration
    game.registrations.splice(registrationIndex, 1);
    await game.save();

    res.status(200).json({
      success: true,
      message: "Backed out from game successfully",
      data: game,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
};