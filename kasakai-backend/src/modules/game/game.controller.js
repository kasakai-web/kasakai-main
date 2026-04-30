const Game         = require("../../models/Game");
const Organiser    = require("../../models/Organiser");
const Player       = require("../../models/Player");
const PlayerRating = require("../../models/PlayerRating");
const GameFeedback = require("../../models/GameFeedback");
const walletService = require("../wallet/wallet.service");
const { notify } = require("../../services/notificationService");
const {
  sendGameCreatedEmail,
  sendGameRegistrationEmail,
  sendGameCancelledOrganizerEmail,
  sendGameCancelledPlayerEmail,
  sendGameBackoutPlayerEmail,
  sendGameBackoutOrganizerEmail,
  sendWaitlistJoinedEmail,
  sendWaitlistSpotAvailableEmail,
  sendWaitlistApprovedEmail,
  sendRemovedFromGameEmail,
  formatGamePlace,
} = require("../../utils/email");

// ── Helper: notify all active waitlist players that a spot just opened ──────
const notifyWaitlistedPlayers = async (game) => {
  const activeWaitlist = game.waitlist.filter(
    (w) => ['waiting', 'notified'].includes(w.status)
  );
  if (activeWaitlist.length === 0) return;

  const gameLink = `${process.env.PLAYER_FRONTEND_URL || 'http://localhost:3000'}/join/${game._id}`;

  for (const entry of activeWaitlist) {
    const playerDoc = await Player.findById(entry.player).select('name email').lean();
    if (!playerDoc?.email) continue;
    sendWaitlistSpotAvailableEmail({
      to:          playerDoc.email,
      playerName:  playerDoc.name,
      gameTitle:   game.title,
      scheduledAt: game.scheduledAt,
      format:      game.format,
      place:       formatGamePlace(game.turf),
      gameLink,
    }).catch((err) => console.error('[EMAIL] waitlist-spot-available failed:', err.message));

    notify(entry.player, 'player', {
      type:      'waitlist_spot',
      title:     '🔔 Spot Available!',
      body:      `A spot just opened in "${game.title}". Register now before it's gone!`,
      game:      game._id,
    }).catch(() => {});
  }
};

// @desc    Create new game
// @route   POST /api/v1/games
// @access  Private (Organiser only)
// Helper: compute totalSlots from format string e.g. "5v5" → 10
const slotsFromFormat = (fmt) => {
  if (!fmt) return null;
  const parts = fmt.split('v');
  if (parts.length === 2) {
    const n = parseInt(parts[0]) + parseInt(parts[1]);
    return isNaN(n) ? null : n;
  }
  return null;
};

exports.createGame = async (req, res) => {
  try {
    const body = { ...req.body };
    body.organiser = req.user._id;

    // Reject past games
    if (body.scheduledAt && new Date(body.scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Game must be scheduled in the future.' });
    }

    // Fee conversion
    if (body.feeInRs !== undefined) {
      body.feeInPaise = Math.round(Number(body.feeInRs) * 100);
      delete body.feeInRs;
    }

    // Convert alternate format fees
    if (Array.isArray(body.alternateFormats)) {
      body.alternateFormats = body.alternateFormats.map((af) => ({
        ...af,
        feeInPaise: af.feeInRs !== undefined
          ? Math.round(Number(af.feeInRs) * 100)
          : (af.feeInPaise || 0),
      }));
    }

    // Auto-compute totalSlots from format if not provided
    if (!body.totalSlots && body.format) {
      body.totalSlots = slotsFromFormat(body.format);
    }

    // Auto-compute minPlayers if not provided
    if (!body.minPlayers && body.totalSlots) {
      body.minPlayers = Math.floor(body.totalSlots * 0.7);
    }

    // Auto-compute endsAt from scheduledAt + durationMins
    if (body.scheduledAt && body.durationMins) {
      const start = new Date(body.scheduledAt);
      body.endsAt = new Date(start.getTime() + Number(body.durationMins) * 60 * 1000);
    }

    // Default status
    if (!body.status) body.status = 'open';

    // Extract organiserGuestCount before create (not a schema field)
    const organiserGuestCount = Math.min(parseInt(body.organiserGuestCount) || 0, 10);
    delete body.organiserGuestCount;

    // Enforce hard cap: organiser slot + guest slots must not exceed totalSlots
    const organiserSlot = body.organiserIsPlaying ? 1 : 0;
    const totalReserved = organiserSlot + organiserGuestCount;
    if (body.totalSlots && totalReserved > body.totalSlots) {
      return res.status(400).json({
        success: false,
        message: `Total participants (organiser + ${organiserGuestCount} guest${organiserGuestCount !== 1 ? 's' : ''}) exceeds the max player limit of ${body.totalSlots}.`,
      });
    }

    const game = await Game.create(body);

    // Auto-register organiser's guests as placeholder registrations
    if (organiserGuestCount > 0) {
      for (let i = 1; i <= organiserGuestCount; i++) {
        game.registrations.push({
          player:        req.user._id,
          plusOneName:   `${(req.user.name || 'Organiser').trim().split(/\s+/)[0]} + ${i}`,
          paymentStatus: 'pending',
          signedUpAt:    new Date(),
        });
      }
      await game.save({ validateModifiedOnly: true });
    }

    await game.populate({ path: 'turf', select: 'name address' });

    if (req.user?.email) {
      sendGameCreatedEmail({
        to: req.user.email,
        organiserName: req.user.name,
        gameTitle: game.title,
        scheduledAt: game.scheduledAt,
        format: game.format,
        place: formatGamePlace(game.turf),
      }).catch((err) => {
        console.error('[EMAIL] Failed to send game created email:', err?.message || err);
      });
    }

    notify(req.user._id, 'organiser', {
      type:      'game_created',
      title:     '🏟️ Game Created',
      body:      `"${game.title}" is live and ready to accept registrations.`,
      actionUrl: `/dashboard/organizer/${req.user._id}`,
      game:      game._id,
    }).catch(() => {});

    res.status(201).json({ success: true, data: game });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    await game.save({ validateModifiedOnly: true });

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
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not properly authenticated",
      });
    }

    const games = await Game.find({ organiser: req.user._id })
      .populate('turf', 'name location.city address')
      .populate('organiser', 'name phone')
      .populate({ path: 'registrations.player', select: 'name phone email profileImage' })
      .populate({ path: 'waitlist.player', select: 'name phone email' })
      .sort('-scheduledAt')
      .lean();

    res.status(200).json({
      success: true,
      count: games.length,
      data: games,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
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

    const cancelMessage = (req.body?.cancelMessage || '').trim();

    game.status = 'cancelled';
    game.cancelledAt = new Date();
    if (cancelMessage) {
      game.cancelReason = cancelMessage;
    }
    await game.save({ validateModifiedOnly: true });

    // Reload the game fresh with all needed populations to guarantee data integrity
    const populatedGame = await Game.findById(game._id)
      .populate({ path: 'turf', select: 'name address' })
      .populate({ path: 'registrations.player', select: 'name email' })
      .populate({ path: 'organiser', select: 'name email' })
      .lean();

    const placeText = formatGamePlace(populatedGame.turf);
    const gameTitle = populatedGame.title;
    const scheduledAt = populatedGame.scheduledAt;
    const gameFormat = populatedGame.format;

    console.log(`[CANCEL] "${gameTitle}" cancelled. Registrations: ${populatedGame.registrations.length}`);

    // ── Email: organiser confirmation ────────────────────────
    const organiser = populatedGame.organiser;
    if (organiser && organiser.email) {
      sendGameCancelledOrganizerEmail({
        to: organiser.email,
        organiserName: organiser.name,
        gameTitle,
        scheduledAt,
        format: gameFormat,
        place: placeText,
        cancelMessage,
      }).catch((err) => {
        console.error('[EMAIL] Organiser cancel email failed:', err?.message || err);
      });
      console.log(`[CANCEL] Organiser email → ${organiser.email}`);
    }

    // ── Email: every unique registered player ────────────────
    const seenPlayerIds = new Set();
    for (const reg of populatedGame.registrations) {
      const player = reg.player;

      // player may be an ObjectId (unpopulated) or a full object — handle both
      if (!player) continue;
      const playerId = player._id ? player._id.toString() : player.toString();

      if (seenPlayerIds.has(playerId)) continue;
      seenPlayerIds.add(playerId);

      // If populate worked, player is an object with email; otherwise fetch manually
      let email = player.email || null;
      let name  = player.name  || 'Player';

      if (!email) {
        try {
          const fetched = await Player.findById(playerId).select('name email').lean();
          if (fetched) { email = fetched.email; name = fetched.name; }
        } catch (_) {}
      }

      if (!email) {
        console.warn(`[CANCEL] No email for player ${playerId} — skipping`);
        continue;
      }

      console.log(`[CANCEL] Player email → ${email}`);
      sendGameCancelledPlayerEmail({
        to: email,
        playerName: name,
        gameTitle,
        scheduledAt,
        format: gameFormat,
        place: placeText,
        cancelMessage,
      }).catch((err) => {
        console.error(`[EMAIL] Player cancel email failed (${email}):`, err?.message || err);
      });

      // In-app notification for each player
      notify(playerId, 'player', {
        type:      'game_cancelled',
        title:     '⛔ Game Cancelled',
        body:      `"${gameTitle}" has been cancelled by the organiser.${cancelMessage ? ` Reason: ${cancelMessage}` : ''}`,
        game:      populatedGame._id,
      }).catch(() => {});
    }

    // In-app notification for organiser
    if (organiser?._id) {
      notify(organiser._id, 'organiser', {
        type:      'game_cancelled',
        title:     '⛔ Game Cancelled',
        body:      `You cancelled "${gameTitle}". ${seenPlayerIds.size} player(s) have been notified.`,
        game:      populatedGame._id,
      }).catch(() => {});
    }

    // ── Wallet refunds: group amountPaidPaise by player ──────
    // Do this BEFORE final notification so we can include refund amount in message
    const refundByPlayer = {};
    for (const reg of populatedGame.registrations) {
      if (!reg.player) continue;
      const pid = reg.player._id ? reg.player._id.toString() : reg.player.toString();
      if (!refundByPlayer[pid]) refundByPlayer[pid] = 0;
      refundByPlayer[pid] += reg.amountPaidPaise || 0;
    }

    console.log(`[CANCEL] Done. Notified ${seenPlayerIds.size} unique player(s)`);

    // ── Send refund notifications with amount ─────────────────
    for (const [pid, amount] of Object.entries(refundByPlayer)) {
      if (amount <= 0) continue;

      // Send in-app notification with refund amount
      const refundRupees = (amount / 100).toFixed(0);
      notify(pid, 'player', {
        type:      'refund_credited',
        title:     '💰 Refund Credited',
        body:      `₹${refundRupees} has been credited to your wallet for "${gameTitle}" cancellation.`,
        game:      populatedGame._id,
        actionUrl: `/dashboard/player/${pid}/wallet`,
      }).catch(() => {});

      // Process the wallet refund
      walletService.refund(
        pid,
        amount,
        `Refund – game cancelled (${gameTitle})`,
        populatedGame._id
      ).catch((err) => console.error(`[WALLET] Cancellation refund for ${pid} failed:`, err.message));
    }

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
    const b = req.body;

    if (b.title        !== undefined) updateData.title        = b.title;
    if (b.format       !== undefined) updateData.format       = b.format;
    if (b.turf         !== undefined) updateData.turf         = b.turf;
    if (b.status       !== undefined) updateData.status       = b.status;
    if (b.totalSlots   !== undefined) updateData.totalSlots   = Number(b.totalSlots);
    if (b.durationMins !== undefined) updateData.durationMins = Number(b.durationMins);
    if (b.minPlayers   !== undefined) updateData.minPlayers   = Number(b.minPlayers);
    if (b.feeInRs      !== undefined) updateData.feeInPaise   = Math.round(Number(b.feeInRs) * 100);
    if (b.feeInPaise   !== undefined) updateData.feeInPaise   = Number(b.feeInPaise);
    if (b.scheduledAt  !== undefined) updateData.scheduledAt  = new Date(b.scheduledAt);
    if (b.cutoffAt     !== undefined) updateData.cutoffAt     = new Date(b.cutoffAt);
    if (b.reportingMinsBeforeGame !== undefined) updateData.reportingMinsBeforeGame = Number(b.reportingMinsBeforeGame);
    if (b.allowSizeChange         !== undefined) updateData.allowSizeChange         = Boolean(b.allowSizeChange);
    if (b.organiserIsPlaying      !== undefined) updateData.organiserIsPlaying      = Boolean(b.organiserIsPlaying);

    // Alternate formats
    if (Array.isArray(b.alternateFormats)) {
      updateData.alternateFormats = b.alternateFormats.map((af) => ({
        ...af,
        feeInPaise: af.feeInRs !== undefined
          ? Math.round(Number(af.feeInRs) * 100)
          : (af.feeInPaise || 0),
      }));
    }

    // Auto-recompute cutoffAt if scheduledAt changed but cutoffAt was not provided
    if (updateData.scheduledAt && !updateData.cutoffAt) {
      updateData.cutoffAt = new Date(updateData.scheduledAt.getTime() - 2 * 60 * 60 * 1000);
    }

    // Auto-recompute endsAt whenever scheduledAt or durationMins changes
    const newScheduled = updateData.scheduledAt || game.scheduledAt;
    const newDuration  = updateData.durationMins !== undefined ? updateData.durationMins : game.durationMins;
    updateData.endsAt  = new Date(new Date(newScheduled).getTime() + Number(newDuration) * 60 * 1000);

    // Recompute minPlayers if totalSlots changed and minPlayers not explicitly provided
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

// @desc    Confirm a game (open/tentative → confirmed)
// @route   PATCH /api/v1/games/organisers/:id/confirm
// @access  Private (Organiser only)
exports.confirmGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!['open','tentative'].includes(game.status))
      return res.status(400).json({ success: false, message: `Cannot confirm a game with status "${game.status}"` });

    const organiserCount = game.organiserIsPlaying ? 1 : 0;
    const activePlayers = game.registrations.length + organiserCount;
    if (activePlayers < game.minPlayers)
      return res.status(400).json({
        success: false,
        message: `Need at least ${game.minPlayers} players to confirm. Currently ${activePlayers} registered.`,
      });

    game.status      = 'confirmed';
    game.confirmedAt = new Date();
    await game.save({ validateModifiedOnly: true });

    res.status(200).json({ success: true, message: 'Game confirmed', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Organiser adds a player to fill a spot
// @route   POST /api/v1/games/organisers/:id/add-player
// @access  Private (Organiser only)
exports.addPlayerByOrganiser = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (['completed','cancelled'].includes(game.status))
      return res.status(400).json({ success: false, message: 'Cannot add players to this game' });

    const { playerId, plusOneName, preferredPosition, teamPreference } = req.body;

    if (!playerId && !plusOneName)
      return res.status(400).json({ success: false, message: 'Provide playerId or plusOneName' });

    if (game.spotsRemaining < 1)
      return res.status(400).json({ success: false, message: 'No spots remaining' });

    // If adding by player ID, check not already registered
    if (playerId) {
      const Player = require('../../models/Player');
      const player = await Player.findById(playerId);
      if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

      const alreadyIn = game.registrations.some(
        (r) => r.player.toString() === playerId && !r.plusOneName
      );
      if (alreadyIn)
        return res.status(400).json({ success: false, message: 'Player is already registered' });

      game.registrations.push({
        player:            playerId,
        preferredPosition: preferredPosition || 'any',
        teamPreference:    teamPreference    || 'none',
        paymentStatus:     'pending',
        signedUpAt:        new Date(),
      });
    } else {
      // Adding as a named guest without a player account
      // Use organiser's own ID as the player ref (placeholder)
      game.registrations.push({
        player:            req.user._id,
        plusOneName:       plusOneName.trim(),
        preferredPosition: preferredPosition || 'any',
        teamPreference:    teamPreference    || 'none',
        paymentStatus:     'pending',
        signedUpAt:        new Date(),
      });
    }

    await game.save({ validateModifiedOnly: true });
    res.status(200).json({ success: true, message: 'Player added successfully', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Organiser removes a specific registration slot (e.g. a guest they added)
// @route   DELETE /api/v1/games/organisers/:id/registrations/:regId
// @access  Private (Organiser only)
exports.removeRegistration = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate({ path: 'turf', select: 'name address location' });
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const regIndex = game.registrations.findIndex(
      (r) => r._id.toString() === req.params.regId
    );
    if (regIndex === -1)
      return res.status(404).json({ success: false, message: 'Registration not found' });

    const removedReg = game.registrations[regIndex];
    game.registrations.splice(regIndex, 1);
    await game.save({ validateModifiedOnly: true });

    // Notify waitlisted players that a slot opened (fire-and-forget)
    notifyWaitlistedPlayers(game).catch((err) =>
      console.error('[WAITLIST] Notify after remove-registration failed:', err.message)
    );

    await game.populate({ path: 'registrations.player', select: 'name phone email profileImage' });
    await game.populate({ path: 'waitlist.player',       select: 'name phone email' });

    // Notify the removed player (fire-and-forget) — only for real players, not organiser guests
    if (!removedReg.plusOneName && removedReg.player) {
      const playerDoc = await Player.findById(removedReg.player).select('name email').lean();
      if (playerDoc?.email) {
        sendRemovedFromGameEmail({
          to:          playerDoc.email,
          playerName:  playerDoc.name,
          gameTitle:   game.title,
          scheduledAt: game.scheduledAt,
          format:      game.format,
          place:       formatGamePlace(game.turf),
        }).catch((err) => console.error('[EMAIL] removed-from-game failed:', err.message));
      }

      notify(removedReg.player, 'player', {
        type:      'player_removed',
        title:     '❌ Removed from Game',
        body:      `You've been removed from "${game.title}" by the organiser. Your payment will be refunded.`,
        game:      game._id,
      }).catch(() => {});
    }

    res.status(200).json({ success: true, message: 'Registration removed', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Organiser approves a waitlisted player (moves them into registrations)
// @route   POST /api/v1/games/organisers/:id/waitlist/:waitlistId/approve
// @access  Private (Organiser only)
exports.approveWaitlist = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate({ path: 'turf', select: 'name address location' });
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const waitlistEntry = game.waitlist.find(
      (w) => w._id.toString() === req.params.waitlistId
    );
    if (!waitlistEntry)
      return res.status(404).json({ success: false, message: 'Waitlist entry not found' });

    if (waitlistEntry.status === 'approved')
      return res.status(400).json({ success: false, message: 'Player is already approved' });

    // Mark as approved — does NOT consume a slot (stays in waitlist array)
    waitlistEntry.status      = 'approved';
    waitlistEntry.notifiedAt  = new Date();

    await game.save({ validateModifiedOnly: true });

    // Populate for response + email
    await game.populate({ path: 'registrations.player', select: 'name phone email profileImage' });
    await game.populate({ path: 'waitlist.player',       select: 'name phone email' });

    // Send approval email to player (fire-and-forget)
    const playerDoc = await Player.findById(waitlistEntry.player).select('name email').lean();
    if (playerDoc?.email) {
      sendWaitlistApprovedEmail({
        to:          playerDoc.email,
        playerName:  playerDoc.name,
        gameTitle:   game.title,
        scheduledAt: game.scheduledAt,
        format:      game.format,
        place:       formatGamePlace(game.turf),
      }).catch((err) => console.error('[EMAIL] waitlist-approved failed:', err.message));
    }

    if (waitlistEntry.player) {
      notify(waitlistEntry.player, 'player', {
        type:      'waitlist_approved',
        title:     '✅ Waitlist Approved!',
        body:      `The organiser has approved your spot in "${game.title}". You're in!`,
        game:      game._id,
      }).catch(() => {});
    }

    res.status(200).json({ success: true, message: 'Player approved from waitlist', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Organiser withdraws themselves from a game they signed up for
// @route   POST /api/v1/games/organisers/:id/withdraw
// @access  Private (Organiser only)
exports.organiserWithdraw = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate({ path: 'turf', select: 'name address' });
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!game.organiserIsPlaying)
      return res.status(400).json({ success: false, message: 'You are not signed up to play in this game' });

    game.organiserIsPlaying = false;
    await game.save({ validateModifiedOnly: true });

    // Notify waitlisted players that a slot opened
    notifyWaitlistedPlayers(game).catch((err) =>
      console.error('[WAITLIST] Notify after organiser-withdraw failed:', err.message)
    );

    res.status(200).json({ success: true, message: 'Withdrawn from game successfully', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Get upcoming open/confirmed games — public, no auth required
// @route   GET /api/v1/games/public
// @access  Public
exports.getPublicGames = async (req, res) => {
  try {
    const games = await Game.find({
      status: { $nin: ['cancelled', 'completed'] },
    })
      .populate('turf', 'name location.city')
      .populate('organiser', 'name')
      .select('title scheduledAt format maxPlayers registrations feeInPaise status turf organiser')
      .sort({ scheduledAt: 1 })
      .limit(12)
      .lean();

    const data = games.map(g => {
      const active = (g.registrations || []).filter(
        r => !['refunded', 'forfeited'].includes(r.paymentStatus)
      ).length;
      return {
        _id:        g._id,
        title:      g.title,
        scheduledAt: g.scheduledAt,
        format:     g.format,
        maxPlayers: g.maxPlayers,
        spotsLeft:  Math.max(0, g.maxPlayers - active),
        fee:        (g.feeInPaise || 0) / 100,
        status:     g.status,
        venue:      g.turf?.name || 'TBA',
        city:       g.turf?.location?.city || '',
        organiser:  g.organiser?.name || '',
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all available games for players
// @route   GET /api/v1/games
// @access  Private (Player)
exports.getAllGames = async (req, res) => {
  try {
    let games = await Game.find({
      status: { $in: ['open', 'confirmed'] },
      scheduledAt: { $gt: new Date() } 
    })
    .populate('turf', 'name location.city')
    .populate('organiser', 'name')
    .populate({ path: 'registrations.player', select: 'name' })
    .sort('scheduledAt')
    .lean()
    .exec();

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
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const games = await Game.find({
      'registrations': {
        $elemMatch: { player: req.user._id, plusOneName: null }
      }
    })
      .populate('turf', 'name location.city')
      .populate('organiser', 'name')
      .populate({ path: 'registrations.player', select: 'name' })
      .sort('-scheduledAt')
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      count: games ? games.length : 0,
      data: games || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ── helpers ──────────────────────────────────────────────
const POSITION_MAP = {
  GK:  'goalkeeper',
  DEF: 'defender',
  MID: 'midfielder',
  FWD: 'forward',
  Any: 'any',
};

const TEAM_MAP = {
  'Red Team':      'red',
  'Blue Team':     'blue',
  'No Preference': 'none',
};

// @desc    Register for a game (player + optional guests)
// @route   POST /api/v1/games/:id/register
// @access  Private (Player)
exports.registerForGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    if (game.status !== 'open' && game.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: "Game is not open for registration" });
    }

    // Block if the player themselves (not a guest) is already registered
    const alreadyRegistered = game.registrations.some(
      reg => reg.player && reg.player.toString() === req.user._id.toString() && !reg.plusOneName
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: "Already registered for this game" });
    }

    // Parse guests from body (array of { position, teamPreference })
    const guestInput = Array.isArray(req.body.guests) ? req.body.guests.slice(0, 4) : [];
    const totalNeeded = 1 + guestInput.length;

    if (game.spotsRemaining < totalNeeded) {
      return res.status(400).json({
        success: false,
        message: `Only ${game.spotsRemaining} spot${game.spotsRemaining !== 1 ? 's' : ''} remaining — cannot register ${totalNeeded} player${totalNeeded !== 1 ? 's' : ''}`,
      });
    }

    const playerPositions = Array.isArray(req.body.positions) ? req.body.positions : [];
    const playerTeam = TEAM_MAP[req.body.teamPreference] || 'none';
    const playerPosition = playerPositions.length > 0
      ? (POSITION_MAP[playerPositions[0]] || 'any')
      : 'any';

    const willingIfFormatChange = req.body.willingIfFormatChange !== false; // default true

    // If player was on the waitlist, remove their entry before registering.
    // Use filter (not splice) — Mongoose reliably tracks array reassignment.
    const playerIdStr = req.user._id.toString();
    const hadWaitlistEntry = game.waitlist.some(
      (w) => w.player.toString() === playerIdStr
    );
    if (hadWaitlistEntry) {
      game.waitlist = game.waitlist.filter(
        (w) => w.player.toString() !== playerIdStr
      );
      console.log(`[WAITLIST] Removed waitlist entry for player ${playerIdStr} on registration`);
    }

    // ── Wallet deduction ──────────────────────────────────
    const feePerSlot  = game.feeInPaise || 0;
    const totalFee    = feePerSlot * totalNeeded;
    let walletTxId              = null;
    let walletBalanceAfterPaise = null;

    if (totalFee > 0) {
      try {
        const scheduledDate = new Date(game.scheduledAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
        });
        const { wallet, transaction } = await walletService.debit(
          req.user._id,
          totalFee,
          `Game signup – ${game.title || scheduledDate}`,
          game._id
        );
        walletTxId = transaction._id;
        walletBalanceAfterPaise = wallet.balancePaise - wallet.lockedPaise; // availablePaise
      } catch (walletErr) {
        if (walletErr.code === 'INSUFFICIENT_BALANCE') {
          return res.status(402).json({
            success:   false,
            code:      'INSUFFICIENT_BALANCE',
            message:   'Insufficient wallet balance. Please recharge your wallet to sign up.',
            required:  walletErr.required,
            available: walletErr.available,
          });
        }
        throw walletErr;
      }
    }

    const payStatus = totalFee > 0 ? 'paid' : 'pending';
    const playerName = req.user.name || 'Player';

    // Build the new registration entries
    const playWith    = Array.isArray(req.body.playWith)    ? req.body.playWith.filter(Boolean)    : [];
    const playAgainst = Array.isArray(req.body.playAgainst) ? req.body.playAgainst.filter(Boolean) : [];

    const newRegistrations = [
      {
        player:                req.user._id,
        preferredPosition:     playerPosition,
        teamPreference:        playerTeam,
        paymentStatus:         payStatus,
        amountPaidPaise:       feePerSlot,
        walletLockId:          walletTxId,
        willingIfFormatChange,
        playWith,
        playAgainst,
        signedUpAt:            new Date(),
      },
      ...guestInput.map((guest, idx) => ({
        player:            req.user._id,
        plusOneName:       (guest?.name || '').trim() || `${(req.user.name || 'Player').trim().split(/\s+/)[0]} + ${idx + 1}`,
        preferredPosition: POSITION_MAP[guest?.position] || 'any',
        teamPreference:    TEAM_MAP[guest?.teamPreference] || 'none',
        paymentStatus:     payStatus,
        amountPaidPaise:   feePerSlot,
        walletLockId:      walletTxId,
        signedUpAt:        new Date(),
      })),
    ];

    // Use $push via findByIdAndUpdate so Mongoose never re-validates existing
    // subdocuments that may have legacy null-player entries in older games.
    try {
      const updateOps = { $push: { registrations: { $each: newRegistrations } } };
      if (hadWaitlistEntry) {
        updateOps.$pull = { waitlist: { player: req.user._id } };
      }
      const updated = await Game.findByIdAndUpdate(
        game._id,
        updateOps,
        { new: true, runValidators: false }
      ).populate({ path: 'turf', select: 'name address' });

      if (!updated) throw new Error('Game not found after update');

      // Swap in the freshly-updated document for the rest of the handler
      Object.assign(game, updated.toObject());
    } catch (saveErr) {
      // Refund wallet if the DB write fails so the player is not charged
      if (walletTxId && totalFee > 0) {
        walletService.refund(
          req.user._id,
          totalFee,
          `Refund – registration failed (${game.title || game._id})`,
          game._id
        ).catch((e) => console.error('[WALLET] Refund on save-fail failed:', e.message));
      }
      throw saveErr;
    }

    if (req.user?.email) {
      const placeText = formatGamePlace(game.turf);

      sendGameRegistrationEmail({
        to: req.user.email,
        playerName,
        gameTitle:              game.title,
        scheduledAt:            game.scheduledAt,
        format:                 game.format,
        place:                  placeText,
        amountPaidPaise:        totalFee,
        walletBalanceAfterPaise,
      }).catch((err) => {
        console.error("[EMAIL] Registration email failed:", err?.message || err);
      });
    }

    notify(req.user._id, 'player', {
      type:      'game_registered',
      title:     '✅ You\'re In!',
      body:      `You've registered for "${game.title}". See you on the field!`,
      actionUrl: `/dashboard/player/${req.user._id}`,
      game:      game._id,
    }).catch(() => {});

    const guestCount = guestInput.length;
    res.status(200).json({
      success: true,
      message: `Registered successfully${guestCount > 0 ? ` with ${guestCount} guest${guestCount > 1 ? 's' : ''}` : ''}`,
      totalRegistered: totalNeeded,
      data: game,
    });
  } catch (error) {
    console.error('[ERROR] registerForGame error:', error);
    res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
};

// @desc    Join the waitlist for a full game (no payment)
// @route   POST /api/v1/games/:id/waitlist
// @access  Private (Player)
exports.joinWaitlist = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

    if (!['open', 'confirmed'].includes(game.status)) {
      return res.status(400).json({ success: false, message: 'Game is not open for registration' });
    }

    if (game.spotsRemaining > 0) {
      return res.status(400).json({ success: false, message: 'Spots are still available — please register normally' });
    }

    const alreadyRegistered = game.registrations.some(
      (r) => r.player.toString() === req.user._id.toString() && !r.plusOneName
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'You are already registered for this game' });
    }

    const alreadyWaiting = game.waitlist.some(
      (w) => w.player.toString() === req.user._id.toString() && ['waiting', 'notified'].includes(w.status)
    );
    if (alreadyWaiting) {
      return res.status(400).json({ success: false, message: 'You are already on the waitlist for this game' });
    }

    const playerPositions = Array.isArray(req.body.positions) ? req.body.positions : [];
    const playerPosition = playerPositions.length > 0 ? (POSITION_MAP[playerPositions[0]] || 'any') : 'any';
    const playerTeam = TEAM_MAP[req.body.teamPreference] || 'none';

    game.waitlist.push({
      player: req.user._id,
      joinedAt: new Date(),
      status: 'waiting',
      preferredPosition: playerPosition,
      teamPreference: playerTeam,
      willingIfFormatChange: req.body.willingIfFormatChange !== false,
    });

    await game.save({ validateModifiedOnly: true });
    await game.populate({ path: 'turf', select: 'name address' });

    if (req.user?.email) {
      sendWaitlistJoinedEmail({
        to: req.user.email,
        playerName: req.user.name,
        gameTitle: game.title,
        scheduledAt: game.scheduledAt,
        format: game.format,
        place: formatGamePlace(game.turf),
      }).catch((err) => console.error('[EMAIL] Waitlist join email failed:', err?.message || err));
    }

    notify(req.user._id, 'player', {
      type:      'waitlist_joined',
      title:     '⏳ Added to Waitlist',
      body:      `You're on the waitlist for "${game.title}". We'll notify you when a spot opens.`,
      game:      game._id,
    }).catch(() => {});

    const activeWaitlist = game.waitlist.filter((w) => ['waiting', 'notified'].includes(w.status));
    res.status(200).json({
      success: true,
      message: "You've been added to the waitlist",
      waitlistPosition: activeWaitlist.length,
      data: game,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Leave the waitlist for a game
// @route   POST /api/v1/games/:id/leave-waitlist
// @access  Private (Player)
exports.leaveWaitlist = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

    const hadEntry = game.waitlist.some(
      (w) => w.player.toString() === req.user._id.toString()
    );
    if (!hadEntry) {
      return res.status(400).json({ success: false, message: 'You are not on the waitlist for this game' });
    }

    game.waitlist = game.waitlist.filter(
      (w) => w.player.toString() !== req.user._id.toString()
    );
    await game.save({ validateModifiedOnly: true });

    res.status(200).json({ success: true, message: 'Removed from waitlist successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Get all games where the current player is on the waitlist
// @route   GET /api/v1/games/my-waitlist
// @access  Private (Player)
exports.getMyWaitlist = async (req, res) => {
  try {
    const games = await Game.find({
      waitlist: { $elemMatch: { player: req.user._id, status: { $in: ['waiting', 'notified', 'approved'] } } },
      scheduledAt: { $gt: new Date() },
    })
      .populate('turf', 'name location.city')
      .populate('organiser', 'name')
      .populate({ path: 'registrations.player', select: 'name' })
      .sort('scheduledAt')
      .lean();

    // Attach the player's own waitlist entry status to each game object
    const playerId = req.user._id.toString();
    const result = games.map((game) => {
      const myEntry = game.waitlist.find((w) => w.player.toString() === playerId);
      return { ...game, _myWaitlistStatus: myEntry?.status || 'waiting' };
    });

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// @desc    Backout from a game
// @route   POST /api/v1/games/:id/backout
// @access  Private (Player)
exports.backoutFromGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate({ path: "organiser", select: "name email" })
      .populate({ path: "turf",     select: "name address" })
      .populate({ path: "registrations.player", select: "name email" });

    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    const playerId = req.user._id.toString();
    // reg.player may be a populated Document or a raw ObjectId — handle both
    const regPlayerId = (reg) => String(reg.player?._id || reg.player);

    const playerRegistrations = game.registrations.filter((reg) => regPlayerId(reg) === playerId);

    if (playerRegistrations.length === 0) {
      return res.status(400).json({ success: false, message: "Not registered for this game" });
    }

    const guestCount    = playerRegistrations.filter((reg) => reg.plusOneName).length;
    const removedCount  = playerRegistrations.length;

    // ── Wallet refund ─────────────────────────────────────
    const refundAmountPaise = playerRegistrations.reduce(
      (sum, reg) => sum + (reg.amountPaidPaise || 0),
      0
    );

    // Use $pull directly to avoid re-validating legacy null-player subdocuments
    await Game.findByIdAndUpdate(
      game._id,
      { $pull: { registrations: { player: req.user._id } } },
      { runValidators: false }
    );

    if (refundAmountPaise > 0) {
      const scheduledDate = new Date(game.scheduledAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short',
      });
      walletService.refund(
        req.user._id,
        refundAmountPaise,
        `Refund – backout from ${game.title || scheduledDate}`,
        game._id
      ).catch((err) => console.error('[WALLET] Refund after backout failed:', err.message));
    }

    // Notify waitlisted players that a slot opened (fire-and-forget)
    notifyWaitlistedPlayers(game).catch((err) =>
      console.error('[WAITLIST] Notify after backout failed:', err.message)
    );

    const playerName = req.user?.name || playerRegistrations.find((reg) => !reg.plusOneName)?.player?.name || "Player";
    const playerEmail = req.user?.email || playerRegistrations.find((reg) => !reg.plusOneName)?.player?.email || null;
    const organiserEmail = game.organiser?.email || null;
    const organiserName = game.organiser?.name || "Organiser";
    const placeText = formatGamePlace(game.turf);

    const emailJobs = [];
    if (playerEmail) {
      emailJobs.push(
        sendGameBackoutPlayerEmail({
          to: playerEmail,
          playerName,
          gameTitle: game.title,
          scheduledAt: game.scheduledAt,
          format: game.format,
          place: placeText,
          guestCount,
        }).catch((err) => {
          console.error("[EMAIL] Backout player email failed:", err?.message || err);
        })
      );
    }

    if (organiserEmail) {
      emailJobs.push(
        sendGameBackoutOrganizerEmail({
          to: organiserEmail,
          organiserName,
          playerName,
          gameTitle: game.title,
          scheduledAt: game.scheduledAt,
          format: game.format,
          place: placeText,
          guestCount,
        }).catch((err) => {
          console.error("[EMAIL] Backout organiser email failed:", err?.message || err);
        })
      );
    }

    await Promise.allSettled(emailJobs);

    // In-app notifications - FIRST: refund credit notification
    if (refundAmountPaise > 0) {
      notify(req.user._id, 'player', {
        type:      'refund_credited',
        title:     '💰 Refund Credited',
        body:      `₹${(refundAmountPaise / 100).toFixed(0)} has been credited to your wallet for "${game.title}" cancellation.`,
        game:      game._id,
        actionUrl: `/dashboard/player/${req.user._id}/wallet`,
      }).catch(() => {});
    }

    // SECOND: backout confirmation notification
    notify(req.user._id, 'player', {
      type:      'game_backout_player',
      title:     '↩ Backout Confirmed',
      body:      `You've successfully backed out of "${game.title}".${refundAmountPaise > 0 ? ` ₹${(refundAmountPaise / 100).toFixed(0)} will be in your wallet shortly.` : ''}`,
      game:      game._id,
    }).catch(() => {});

    if (game.organiser?._id) {
      notify(game.organiser._id, 'organiser', {
        type:      'game_backout_organiser',
        title:     '📢 Player Backed Out',
        body:      `${playerName} has backed out of "${game.title}". A spot is now available.`,
        game:      game._id,
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: removedCount > 1
        ? `Backed out successfully (you + ${removedCount - 1} guest${removedCount > 2 ? 's' : ''})`
        : "Backed out from game successfully",
      removedCount,
      data: game,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark game as completed
// @route   PATCH /api/v1/games/organisers/:id/complete
// @access  Private (Organiser)
// ─────────────────────────────────────────────────────────────────────────────
exports.completeGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (game.status === 'completed')
      return res.status(400).json({ success: false, message: 'Game is already completed' });
    if (game.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Cannot complete a cancelled game' });

    game.status      = 'completed';
    game.completedAt = new Date();
    await game.save({ validateModifiedOnly: true });

    res.status(200).json({ success: true, message: 'Game marked as completed', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Save attendance for all registrations
// @route   POST /api/v1/games/organisers/:id/attendance
// @access  Private (Organiser)
// Body: { attendance: [{ regId, status }] }
//   status: 'present' | 'absent' | 'no_show'
// ─────────────────────────────────────────────────────────────────────────────
exports.markAttendance = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (game.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Complete the game before marking attendance' });

    const attendance = Array.isArray(req.body.attendance) ? req.body.attendance : [];
    const validStatuses = ['present', 'absent', 'no_show', 'not_marked'];

    for (const item of attendance) {
      const reg = game.registrations.id(item.regId);
      if (!reg) continue;
      if (validStatuses.includes(item.status)) reg.attended = item.status;
    }

    game.attendanceMarked   = true;
    game.attendanceMarkedAt = new Date();
    await game.save({ validateModifiedOnly: true });

    // Notify no-shows
    for (const reg of game.registrations) {
      if (reg.attended === 'no_show' && reg.player && !reg.plusOneName) {
        notify(reg.player, 'player', {
          type:  'system',
          title: '⚠️ No-Show Recorded',
          body:  `You were marked as a no-show for "${game.title}". This may affect your account standing.`,
          game:  game._id,
        }).catch(() => {});
      }
    }

    await game.populate({ path: 'registrations.player', select: 'name phone email profileImage' });
    res.status(200).json({ success: true, message: 'Attendance saved', data: game });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Save organiser ratings for attended players (bulk upsert)
// @route   POST /api/v1/games/organisers/:id/player-ratings
// @access  Private (Organiser)
// Body: { ratings: [{ playerId, conductRating, gameplayRating, preferredPosition,
//                     gkAffinity, playWith, playAgainst, notes }] }
// ─────────────────────────────────────────────────────────────────────────────
exports.savePlayerRatings = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).lean();
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (game.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Game must be completed first' });

    const ratings = Array.isArray(req.body.ratings) ? req.body.ratings : [];
    if (ratings.length === 0)
      return res.status(400).json({ success: false, message: 'No ratings provided' });

    const ops = ratings.map((r) => ({
      updateOne: {
        filter: { game: game._id, player: r.playerId },
        update: {
          $set: {
            organiser:         req.user._id,
            conductRating:     Math.min(5, Math.max(1, Number(r.conductRating)  || 3)),
            gameplayRating:    Math.min(5, Math.max(1, Number(r.gameplayRating) || 3)),
            preferredPosition: r.preferredPosition || 'any',
            gkAffinity:        r.gkAffinity != null ? Number(r.gkAffinity) : null,
            playWith:          Array.isArray(r.playWith)    ? r.playWith    : [],
            playAgainst:       Array.isArray(r.playAgainst) ? r.playAgainst : [],
            notes:             r.notes || null,
          },
        },
        upsert: true,
      },
    }));

    await PlayerRating.bulkWrite(ops);

    // Update each player's aggregate conduct + gameplay ratings
    for (const r of ratings) {
      const allRatings = await PlayerRating.find({ player: r.playerId }).lean();
      if (allRatings.length === 0) continue;
      const avgConduct  = allRatings.reduce((s, x) => s + x.conductRating,  0) / allRatings.length;
      const avgGameplay = allRatings.reduce((s, x) => s + x.gameplayRating, 0) / allRatings.length;
      const combined = Math.round(((avgConduct + avgGameplay) / 2) * 10) / 10;
      await Player.findByIdAndUpdate(r.playerId, { rating: combined });

      // Notify the player their rating was saved
      notify(r.playerId, 'player', {
        type:  'system',
        title: '⭐ Post-Game Rating Received',
        body:  `Your performance in "${game.title}" has been rated by the organiser.`,
        game:  game._id,
      }).catch(() => {});
    }

    res.status(200).json({ success: true, message: 'Ratings saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get existing player ratings for a game (organiser view)
// @route   GET /api/v1/games/organisers/:id/player-ratings
// @access  Private (Organiser)
// ─────────────────────────────────────────────────────────────────────────────
exports.getPlayerRatings = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).lean();
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const ratings = await PlayerRating.find({ game: req.params.id })
      .populate('player', 'name phone')
      .lean();

    res.status(200).json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Player submits feedback for a completed game
// @route   POST /api/v1/games/:id/feedback
// @access  Private (Player)
// ─────────────────────────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).lean();
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Game is not completed yet' });

    // Player must have been marked as attended
    const reg = game.registrations.find(
      (r) => r.player && r.player.toString() === req.user._id.toString() && !r.plusOneName
    );
    if (!reg)
      return res.status(403).json({ success: false, message: 'You were not registered for this game' });
    if (reg.attended !== 'present')
      return res.status(400).json({ success: false, message: 'Feedback is only available for players who attended' });

    const { gameRating, organiserRating, venueRating, tags, comment, peerRatings } = req.body;
    if (!gameRating || gameRating < 1 || gameRating > 5)
      return res.status(400).json({ success: false, message: 'gameRating must be between 1 and 5' });

    const feedback = await GameFeedback.findOneAndUpdate(
      { game: game._id, submittedBy: req.user._id },
      {
        game:             game._id,
        submittedBy:      req.user._id,
        gameRating:       Number(gameRating),
        organiserRating:  organiserRating  ? Number(organiserRating)  : null,
        venueRating:      venueRating      ? Number(venueRating)      : null,
        tags:             Array.isArray(tags) ? tags : [],
        comment:          comment || null,
        peerRatings:      Array.isArray(peerRatings) ? peerRatings : [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: 'Feedback submitted', data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Player gets their own feedback for a game
// @route   GET /api/v1/games/:id/my-feedback
// @access  Private (Player)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyFeedback = async (req, res) => {
  try {
    const feedback = await GameFeedback.findOne({
      game: req.params.id,
      submittedBy: req.user._id,
    }).lean();
    res.status(200).json({ success: true, data: feedback || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get games where player was attended but hasn't submitted feedback
// @route   GET /api/v1/games/pending-feedback
// @access  Private (Player)
// ─────────────────────────────────────────────────────────────────────────────
exports.getPendingFeedback = async (req, res) => {
  try {
    // Find completed games where this player was marked present
    const games = await Game.find({
      status: 'completed',
      attendanceMarked: true,
      registrations: {
        $elemMatch: {
          player:   req.user._id,
          plusOneName: null,
          attended: 'present',
        },
      },
    })
      .populate('turf', 'name location.city')
      .select('title scheduledAt format turf attendanceMarkedAt')
      .lean();

    if (games.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Filter out games where feedback was already submitted
    const gameIds = games.map((g) => g._id);
    const submitted = await GameFeedback.find({
      game:        { $in: gameIds },
      submittedBy: req.user._id,
    }).select('game').lean();

    const submittedSet = new Set(submitted.map((f) => f.game.toString()));
    const pending = games.filter((g) => !submittedSet.has(g._id.toString()));

    res.status(200).json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Player gets their own received ratings (from organisers)
// @route   GET /api/v1/games/my-ratings
// @access  Private (Player)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyRatings = async (req, res) => {
  try {
    const ratings = await PlayerRating.find({ player: req.user._id })
      .populate('game', 'title scheduledAt format turf')
      .populate('organiser', 'name')
      .sort('-createdAt')
      .lean();

    res.status(200).json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Organiser views all player feedback for their game
// @route   GET /api/v1/games/organisers/:id/game-feedback
// @access  Private (Organiser)
// ─────────────────────────────────────────────────────────────────────────────
exports.getGameFeedback = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).lean();
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    if (game.organiser.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const feedback = await GameFeedback.find({ game: req.params.id })
      .populate('submittedBy', 'name')
      .sort('-createdAt')
      .lean();

    // Aggregate averages
    const count = feedback.length;
    const avgGame      = count ? feedback.reduce((s, f) => s + f.gameRating, 0) / count : null;
    const avgOrganiser = (() => {
      const rated = feedback.filter((f) => f.organiserRating);
      return rated.length ? rated.reduce((s, f) => s + f.organiserRating, 0) / rated.length : null;
    })();
    const avgVenue = (() => {
      const rated = feedback.filter((f) => f.venueRating);
      return rated.length ? rated.reduce((s, f) => s + f.venueRating, 0) / rated.length : null;
    })();

    // Tag frequency
    const tagCounts = {};
    for (const f of feedback) {
      for (const tag of f.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        feedback,
        summary: {
          count,
          avgGame:       avgGame      ? Math.round(avgGame      * 10) / 10 : null,
          avgOrganiser:  avgOrganiser ? Math.round(avgOrganiser * 10) / 10 : null,
          avgVenue:      avgVenue     ? Math.round(avgVenue     * 10) / 10 : null,
          tagCounts,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Organiser gets all player feedback received across ALL their games
// @route   GET /api/v1/games/organisers/my-feedback-summary
// @access  Private (Organiser)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyFeedbackSummary = async (req, res) => {
  try {
    const games = await Game.find({ organiser: req.user._id })
      .select('_id title format scheduledAt turf')
      .populate('turf', 'name location.city')
      .lean();

    const gameIds = games.map((g) => g._id);
    if (gameIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { feedback: [], summary: { count: 0, avgGame: null, avgOrganiser: null, avgVenue: null, tagCounts: {} } },
      });
    }

    const gameMap = {};
    for (const g of games) gameMap[g._id.toString()] = g;

    const feedback = await GameFeedback.find({ game: { $in: gameIds } })
      .populate('submittedBy', 'name')
      .sort('-createdAt')
      .lean();

    const enriched = feedback.map((f) => ({
      ...f,
      gameInfo: gameMap[f.game.toString()] || null,
    }));

    const count = feedback.length;
    const avgGame = count ? Math.round(feedback.reduce((s, f) => s + f.gameRating, 0) / count * 10) / 10 : null;
    const withOrg = feedback.filter((f) => f.organiserRating);
    const avgOrganiser = withOrg.length
      ? Math.round(withOrg.reduce((s, f) => s + f.organiserRating, 0) / withOrg.length * 10) / 10 : null;
    const withVenue = feedback.filter((f) => f.venueRating);
    const avgVenue = withVenue.length
      ? Math.round(withVenue.reduce((s, f) => s + f.venueRating, 0) / withVenue.length * 10) / 10 : null;
    const tagCounts = {};
    for (const f of feedback) {
      for (const tag of f.tags || []) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    res.status(200).json({
      success: true,
      data: { feedback: enriched, summary: { count, avgGame, avgOrganiser, avgVenue, tagCounts } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Organiser gets all player ratings they have given across ALL games
// @route   GET /api/v1/games/organisers/my-ratings-given
// @access  Private (Organiser)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyRatingsGiven = async (req, res) => {
  try {
    const ratings = await PlayerRating.find({ organiser: req.user._id })
      .populate('player', 'name phone')
      .populate('game',   'title format scheduledAt')
      .sort('-createdAt')
      .lean();

    res.status(200).json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// @desc    Organiser gets comprehensive financial summary across all their games
// @route   GET /api/v1/games/organisers/financial-summary
// @access  Private (Organiser)
// ─────────────────────────────────────────────────────────────────────────────
exports.getFinancialSummary = async (req, res) => {
  try {
    const organiserIdStr = req.user._id.toString();

    const games = await Game.find({ organiser: req.user._id })
      .select('_id title format scheduledAt status feeInPaise registrations turf')
      .populate('turf', 'name')
      .populate('registrations.player', 'name phone')
      .sort('-scheduledAt')
      .lean();

    let totalRevenuePaise  = 0;
    let totalRefundedPaise = 0;
    let totalPaidPlayers   = 0;
    let totalPaidGuests    = 0;
    let totalOrgFreeSlots  = 0;
    let totalOrgFreeGuests = 0;

    const perGame = [];

    for (const game of games) {
      const paidPlayers   = [];
      const paidGuests    = [];
      const orgFreeSlots  = [];
      const orgFreeGuests = [];
      let revenuePaise  = 0;
      let refundedPaise = 0;

      for (const reg of game.registrations || []) {
        const isOrgRef = (reg.player?._id?.toString() || reg.player?.toString()) === organiserIdStr;
        const hasGuest = !!reg.plusOneName;

        if (reg.paymentStatus === 'paid') {
          revenuePaise += reg.amountPaidPaise || 0;
          if (!hasGuest) {
            paidPlayers.push({ name: reg.player?.name || 'Player', amountPaise: reg.amountPaidPaise || 0 });
            totalPaidPlayers++;
          } else {
            paidGuests.push({ name: reg.plusOneName, amountPaise: reg.amountPaidPaise || 0 });
            totalPaidGuests++;
          }
        } else if (reg.paymentStatus === 'refunded') {
          refundedPaise += reg.amountPaidPaise || 0;
        } else if (isOrgRef && hasGuest) {
          orgFreeGuests.push({ name: reg.plusOneName });
          totalOrgFreeGuests++;
        } else if (!isOrgRef && (reg.amountPaidPaise || 0) === 0 && reg.paymentStatus === 'pending' && (game.feeInPaise || 0) > 0) {
          orgFreeSlots.push({ name: reg.player?.name || 'Player' });
          totalOrgFreeSlots++;
        }
      }

      totalRevenuePaise  += revenuePaise;
      totalRefundedPaise += refundedPaise;

      perGame.push({
        _id:          game._id,
        title:        game.title,
        format:       game.format,
        scheduledAt:  game.scheduledAt,
        status:       game.status,
        feeInPaise:   game.feeInPaise || 0,
        turfName:     game.turf?.name || null,
        revenuePaise,
        refundedPaise,
        paidPlayers,
        paidGuests,
        orgFreeSlots,
        orgFreeGuests,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenuePaise,
          totalRefundedPaise,
          netRevenuePaise: totalRevenuePaise - totalRefundedPaise,
          totalPaidPlayers,
          totalPaidGuests,
          totalOrgFreeSlots,
          totalOrgFreeGuests,
        },
        games: perGame,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};
