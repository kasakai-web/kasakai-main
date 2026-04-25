const jwt          = require('jsonwebtoken');
const Admin        = require('../../models/Admin');
const Player       = require('../../models/Player');
const Organiser    = require('../../models/Organiser');
const Game         = require('../../models/Game');
const Notification = require('../../models/Notification');
const Wallet            = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const GameFeedback      = require('../../models/GameFeedback');
const PlayerRating      = require('../../models/PlayerRating');

const formatJoinedAt = (value) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

const formatLocation = (location = {}) => {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const formatPlayer = (player, wallet = null) => ({
  id: player._id,
  name: player.name,
  phone: player.phone,
  email: player.email || null,
  role: 'player',
  isVerified: !!player.isVerified,
  gamesPlayed: player.totalGamesPlayed || 0,
  noShowCount: player.noShowCount || 0,
  backoutCount: player.backoutCount || 0,
  rating: player.rating || 0,
  totalSpentPaise: wallet?.totalSpentPaise || 0,
  walletBalancePaise: wallet?.balancePaise || 0,
  joinedAt: formatJoinedAt(player.createdAt),
  status: player.isVerified ? 'active' : 'pending',
  location: formatLocation(player.location),
});

const formatOrganiser = (organiser) => ({
  id: organiser._id,
  name: organiser.name,
  phone: organiser.phone,
  email: organiser.email || null,
  whatsappNumber: organiser.whatsappNumber || null,
  role: 'organiser',
  isVerified: !!organiser.isVerified,
  isActive: organiser.isActive,
  approvalStatus: organiser.approvalStatus,
  status: organiser.isActive ? organiser.approvalStatus : 'suspended',
  gamesHosted: organiser.totalGamesHosted || 0,
  totalPlayersManaged: organiser.totalPlayersManaged || 0,
  rating: organiser.averageRating || 0,
  totalRatingsReceived: organiser.totalRatingsReceived || 0,
  cancellationRate: organiser.cancellationRate || 0,
  earningsPaise: organiser.totalEarningsPaise || 0,
  pendingPayoutPaise: organiser.pendingPayoutPaise || 0,
  joinedAt: formatJoinedAt(organiser.createdAt),
  location: formatLocation(organiser.location),
  suspendReason: organiser.suspendReason || null,
});

const formatGamePlace = (turf) => {
  if (!turf) return null;

  const name = turf.name || null;
  const area = turf.address?.area || null;
  const city = turf.address?.city || turf.location?.city || null;

  return [name, area, city].filter(Boolean).join(', ') || null;
};

const formatGame = (game) => {
  const registrationCount = Array.isArray(game.registrations) ? game.registrations.length : 0;

  return {
    id: game._id,
    title: game.title || `${game.format || 'Match'} Game`,
    venue: formatGamePlace(game.turf),
    scheduledAt: game.scheduledAt ? new Date(game.scheduledAt).toISOString() : null,
    format: game.format || null,
    players: {
      registered: registrationCount,
      totalSlots: game.totalSlots || 0,
    },
    feeInPaise: game.feeInPaise || 0,
    organiserName: game.organiser?.name || 'Unknown organiser',
    status: game.status || 'draft',
  };
};

const mapPaymentStatus = (paymentStatus) => {
  if (paymentStatus === 'paid' || paymentStatus === 'wallet_locked') return 'success';
  if (paymentStatus === 'refunded') return 'refunded';
  if (paymentStatus === 'forfeited') return 'failed';
  return 'pending';
};

const mapPaymentMethod = (paymentStatus) => {
  if (paymentStatus === 'wallet_locked') return 'Wallet (Locked)';
  if (paymentStatus === 'paid') return 'Wallet';
  if (paymentStatus === 'refunded') return 'Wallet Refund';
  if (paymentStatus === 'forfeited') return 'Forfeit';
  return 'Pending';
};

// Optional allow-list gate for admin login. If empty, any valid admin account may log in.
const ALLOWED_ADMIN_EMAIL = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase() || null;

// ─────────────────────────────────────────────
// POST /api/v1/admin/login
// Body: { email, password }
// ─────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If an allow-list email is configured, require an exact match.
    if (ALLOWED_ADMIN_EMAIL && normalizedEmail !== ALLOWED_ADMIN_EMAIL) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Explicitly select password (field has select: false in schema)
    const admin = await Admin.findOne({ email: normalizedEmail }).select('+password');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: 'admin', adminRole: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id:          admin._id,
        name:        admin.name,
        email:       admin.email,
        role:        admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (err) {
    console.error('[adminLogin]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/admin/me   (protected)
// ─────────────────────────────────────────────
exports.adminMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    return res.status(200).json({
      success: true,
      admin: {
        id:          admin._id,
        name:        admin.name,
        email:       admin.email,
        role:        admin.role,
        permissions: admin.permissions,
        lastLogin:   admin.lastLogin,
      },
    });
  } catch (err) {
    console.error('[adminMe]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/admin/users   (protected)
// Returns a combined user directory with players and organisers.
// ─────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const [players, organisers, wallets, games] = await Promise.all([
      Player.find().sort({ createdAt: -1 }).lean(),
      Organiser.find().sort({ createdAt: -1 }).lean(),
      Wallet.find().select('user balancePaise totalSpentPaise totalTopUpPaise').lean(),
      Game.find({ status: { $in: ['completed', 'confirmed', 'open'] } })
        .select('organiser registrations.player status').lean(),
    ]);

    // Wallet map by player id
    const walletMap = {};
    for (const w of wallets) walletMap[w.user.toString()] = w;

    // Count games played per player from actual game registrations
    const gamesPlayedMap = {};
    for (const g of games) {
      for (const r of g.registrations || []) {
        const pid = r.player?.toString();
        if (pid) gamesPlayedMap[pid] = (gamesPlayedMap[pid] || 0) + 1;
      }
    }

    // Count games hosted per organiser
    const gamesHostedMap = {};
    for (const g of games) {
      const oid = g.organiser?.toString();
      if (oid) gamesHostedMap[oid] = (gamesHostedMap[oid] || 0) + 1;
    }

    const users = [
      ...players.map((p) => ({
        ...formatPlayer(p, walletMap[p._id.toString()] || null),
        gamesPlayed: gamesPlayedMap[p._id.toString()] || 0,
      })),
      ...organisers.map((o) => ({
        ...formatOrganiser(o),
        gamesHosted: gamesHostedMap[o._id.toString()] || o.totalGamesHosted || 0,
      })),
    ].sort((left, right) => new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime());

    return res.status(200).json({
      success: true,
      count: users.length,
      summary: {
        players: players.length,
        organisers: organisers.length,
      },
      data: users,
    });
  } catch (err) {
    console.error('[listUsers]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/admin/organisers   (protected)
// Returns organiser records only.
// ─────────────────────────────────────────────
exports.listOrganisers = async (req, res) => {
  try {
    const [organisers, games, feedbackAgg] = await Promise.all([
      Organiser.find().sort({ createdAt: -1 }).lean(),
      Game.find().select('organiser status feeInPaise registrations totalSlots').lean(),
      // avg organiser rating per organiser from feedback
      GameFeedback.aggregate([
        { $match: { organiserRating: { $ne: null } } },
        {
          $lookup: {
            from: 'games',
            localField: 'game',
            foreignField: '_id',
            as: 'gameDoc',
          },
        },
        { $unwind: '$gameDoc' },
        {
          $group: {
            _id: '$gameDoc.organiser',
            avgRating: { $avg: '$organiserRating' },
            ratingCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build live game-stats map per organiser
    const gameStats = {};
    for (const g of games) {
      const id = g.organiser?.toString();
      if (!id) continue;
      if (!gameStats[id]) gameStats[id] = { total: 0, cancelled: 0, completed: 0, revenuePaise: 0, players: 0, guests: 0 };
      gameStats[id].total++;
      if (g.status === 'cancelled') gameStats[id].cancelled++;
      if (g.status === 'completed') gameStats[id].completed++;
      for (const r of g.registrations || []) {
        if (r.paymentStatus === 'paid') gameStats[id].revenuePaise += r.amountPaidPaise || 0;
        if (r.plusOneName) gameStats[id].guests++;
        gameStats[id].players++;
      }
    }

    // Build feedback rating map per organiser
    const ratingMap = {};
    for (const row of feedbackAgg) {
      if (row._id) ratingMap[row._id.toString()] = { avg: Math.round(row.avgRating * 10) / 10, count: row.ratingCount };
    }

    const data = organisers.map((o) => {
      const id    = o._id.toString();
      const gs    = gameStats[id] || {};
      const fm    = ratingMap[id]  || {};
      const total = gs.total || 0;
      const cancelled = gs.cancelled || 0;
      const cancellationRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;

      return {
        ...formatOrganiser(o),
        gamesHosted:         total,
        totalPlayersManaged: gs.players || 0,
        cancellationRate,
        earningsPaise:       gs.revenuePaise || 0,
        rating:              fm.avg  ?? null,
        totalRatingsReceived: fm.count ?? 0,
      };
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[listOrganisers]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/admin/games   (protected)
// Returns all games for admin dashboard insights.
// ─────────────────────────────────────────────
exports.listGames = async (req, res) => {
  try {
    const games = await Game.find()
      .populate('organiser', 'name')
      .populate('turf', 'name address location.city')
      .sort({ scheduledAt: -1 })
      .lean();

    const data = games.map(formatGame);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('[listGames]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/v1/admin/payments   (protected)
// Uses WalletTransaction as the ground truth for all money movements.
// ─────────────────────────────────────────────
exports.listPayments = async (req, res) => {
  try {
    const txns = await WalletTransaction.find()
      .populate('user', 'name phone')
      .populate({ path: 'game', select: 'title format organiser', populate: { path: 'organiser', select: 'name phone' } })
      .sort({ createdAt: -1 })
      .lean();

    let totalTopUpPaise    = 0;
    let totalDebitPaise    = 0;
    let totalRefundedPaise = 0;
    let pendingCount       = 0;

    const data = txns.map((t) => {
      if (t.status === 'success') {
        if (t.type === 'topup')                               totalTopUpPaise    += t.amountPaise;
        if (['debit', 'lock', 'backout_fee'].includes(t.type)) totalDebitPaise   += t.amountPaise;
        if (t.type === 'refund')                              totalRefundedPaise += t.amountPaise;
      }
      if (t.status === 'pending') pendingCount++;

      return {
        id:                 t._id,
        playerName:         t.user?.name  || 'Unknown',
        playerPhone:        t.user?.phone || null,
        type:               t.type,
        amountPaise:        t.amountPaise,
        balanceAfterPaise:  t.balanceAfterPaise,
        gameTitle:          t.game ? (t.game.title || `${t.game.format || 'Match'} Game`) : null,
        organiserName:      t.game?.organiser?.name  || null,
        organiserPhone:     t.game?.organiser?.phone || null,
        description:        t.description || null,
        razorpayOrderId:    t.razorpayOrderId   || null,
        razorpayPaymentId:  t.razorpayPaymentId || null,
        paidAt:             t.createdAt ? new Date(t.createdAt).toISOString() : null,
        status:             t.status,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      summary: { totalTopUpPaise, totalDebitPaise, totalRefundedPaise, pendingCount },
      data,
    });
  } catch (err) {
    console.error('[listPayments]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/notifications
// Returns the most recent platform-wide notifications (last 50 across all users)
// ─────────────────────────────────────────────────────────────────────────────
exports.listNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip  = parseInt(req.query.skip) || 0;

    const [notifications, total] = await Promise.all([
      Notification.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({}),
    ]);

    // Collect recipient IDs by role so we can attach names
    const playerIds    = [];
    const organiserIds = [];
    for (const n of notifications) {
      if (n.recipientRole === 'player')    playerIds.push(n.recipient);
      if (n.recipientRole === 'organiser') organiserIds.push(n.recipient);
    }

    const [players, organisers] = await Promise.all([
      playerIds.length    ? Player.find({ _id: { $in: playerIds } }).select('name phone').lean()       : [],
      organiserIds.length ? Organiser.find({ _id: { $in: organiserIds } }).select('name phone').lean() : [],
    ]);

    const nameMap = {};
    for (const p of players)    nameMap[p._id.toString()] = { name: p.name, phone: p.phone };
    for (const o of organisers) nameMap[o._id.toString()] = { name: o.name, phone: o.phone };

    const enriched = notifications.map((n) => {
      const person = nameMap[n.recipient?.toString()];
      return { ...n, recipientName: person?.name || null, recipientPhone: person?.phone || null };
    });

    return res.status(200).json({
      success: true,
      data: { notifications: enriched, total },
    });
  } catch (err) {
    console.error('[listNotifications]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/stats
// Real-time platform stats for the dashboard overview.
// ─────────────────────────────────────────────────────────────────────────────
exports.getPlatformStats = async (req, res) => {
  try {
    const [playerCount, organiserCount, games, wallets] = await Promise.all([
      Player.countDocuments(),
      Organiser.countDocuments(),
      Game.find().select('status feeInPaise registrations').lean(),
      Wallet.find().select('balancePaise').lean(),
    ]);

    const activeGames    = games.filter((g) => ['open', 'confirmed', 'tentative'].includes(g.status)).length;
    const completedGames = games.filter((g) => g.status === 'completed').length;
    const cancelledGames = games.filter((g) => g.status === 'cancelled').length;

    let totalRevenuePaise  = 0;
    let totalRefundedPaise = 0;
    for (const g of games) {
      for (const r of g.registrations || []) {
        if (r.paymentStatus === 'paid')     totalRevenuePaise  += r.amountPaidPaise || 0;
        if (r.paymentStatus === 'refunded') totalRefundedPaise += r.amountPaidPaise || 0;
      }
    }

    const totalWalletBalancePaise = wallets.reduce((s, w) => s + (w.balancePaise || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        users:   { players: playerCount, organisers: organiserCount, total: playerCount + organiserCount },
        games:   { total: games.length, active: activeGames, completed: completedGames, cancelled: cancelledGames },
        finance: { totalRevenuePaise, totalRefundedPaise, netRevenuePaise: totalRevenuePaise - totalRefundedPaise, totalWalletBalancePaise },
      },
    });
  } catch (err) {
    console.error('[getPlatformStats]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/games/:id
// Full game detail with registrations, waitlist, organiser, turf.
// ─────────────────────────────────────────────────────────────────────────────
exports.getGameDetail = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('organiser', 'name phone email')
      .populate('turf',      'name address')
      .populate('registrations.player', 'name phone email')
      .populate('waitlist.player',      'name phone')
      .lean();

    if (!game) return res.status(404).json({ success: false, message: 'Game not found.' });

    return res.status(200).json({ success: true, data: game });
  } catch (err) {
    console.error('[getGameDetail]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/admin/organisers/:id/approve
// PATCH /api/v1/admin/organisers/:id/reject
// PATCH /api/v1/admin/organisers/:id/suspend   body: { reason }
// PATCH /api/v1/admin/organisers/:id/reactivate
// ─────────────────────────────────────────────────────────────────────────────
exports.approveOrganiser = async (req, res) => {
  try {
    const organiser = await Organiser.findById(req.params.id);
    if (!organiser) return res.status(404).json({ success: false, message: 'Organiser not found.' });

    organiser.approvalStatus = 'approved';
    organiser.isActive       = true;
    organiser.approvedBy     = req.user.id;
    organiser.approvedAt     = new Date();
    organiser.suspendReason  = undefined;
    await organiser.save();

    return res.status(200).json({ success: true, message: 'Organiser approved.' });
  } catch (err) {
    console.error('[approveOrganiser]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.rejectOrganiser = async (req, res) => {
  try {
    const organiser = await Organiser.findById(req.params.id);
    if (!organiser) return res.status(404).json({ success: false, message: 'Organiser not found.' });

    organiser.approvalStatus = 'rejected';
    organiser.isActive       = false;
    await organiser.save();

    return res.status(200).json({ success: true, message: 'Organiser rejected.' });
  } catch (err) {
    console.error('[rejectOrganiser]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.suspendOrganiser = async (req, res) => {
  try {
    const organiser = await Organiser.findById(req.params.id);
    if (!organiser) return res.status(404).json({ success: false, message: 'Organiser not found.' });

    organiser.isActive      = false;
    organiser.suspendReason = req.body?.reason || 'Suspended by admin.';
    organiser.suspendedAt   = new Date();
    await organiser.save();

    return res.status(200).json({ success: true, message: 'Organiser suspended.' });
  } catch (err) {
    console.error('[suspendOrganiser]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.reactivateOrganiser = async (req, res) => {
  try {
    const organiser = await Organiser.findById(req.params.id);
    if (!organiser) return res.status(404).json({ success: false, message: 'Organiser not found.' });

    organiser.isActive      = true;
    organiser.suspendReason = undefined;
    organiser.suspendedAt   = undefined;
    await organiser.save();

    return res.status(200).json({ success: true, message: 'Organiser reactivated.' });
  } catch (err) {
    console.error('[reactivateOrganiser]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/wallets
// All player wallets with balance, spend, and top-up totals.
// ─────────────────────────────────────────────────────────────────────────────
exports.listWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find()
      .populate('user', 'name phone email')
      .sort('-balancePaise')
      .lean();

    const summary = wallets.reduce(
      (acc, w) => {
        acc.totalBalancePaise   += w.balancePaise        || 0;
        acc.totalTopUpPaise     += w.totalTopUpPaise     || 0;
        acc.totalSpentPaise     += w.totalSpentPaise     || 0;
        acc.totalRefundedPaise  += w.totalRefundedPaise  || 0;
        return acc;
      },
      { totalBalancePaise: 0, totalTopUpPaise: 0, totalSpentPaise: 0, totalRefundedPaise: 0 }
    );

    return res.status(200).json({ success: true, count: wallets.length, summary, data: wallets });
  } catch (err) {
    console.error('[listWallets]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/feedback
// All game feedback across the platform.
// ─────────────────────────────────────────────────────────────────────────────
exports.listFeedback = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);

    const [feedback, total] = await Promise.all([
      GameFeedback.find()
        .populate({
          path: 'game',
          select: 'title format scheduledAt organiser turf',
          populate: [
            { path: 'organiser', select: 'name phone' },
            { path: 'turf',      select: 'name address' },
          ],
        })
        .populate('submittedBy', 'name phone')
        .sort('-createdAt')
        .limit(limit)
        .lean(),
      GameFeedback.countDocuments(),
    ]);

    const count   = feedback.length;
    const avgGame = count
      ? Math.round(feedback.reduce((s, f) => s + f.gameRating, 0) / count * 10) / 10
      : null;

    const tagCounts = {};
    for (const f of feedback) {
      for (const tag of f.tags || []) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    return res.status(200).json({
      success: true,
      count: total,
      summary: { avgGame, tagCounts },
      data: feedback,
    });
  } catch (err) {
    console.error('[listFeedback]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/organiser-earnings
// Per-organiser revenue breakdown from game registrations.
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrganiserEarnings = async (req, res) => {
  try {
    const games = await Game.find()
      .select('organiser feeInPaise registrations status')
      .populate('organiser', 'name phone email')
      .lean();

    const map = {};

    for (const game of games) {
      const orgId = game.organiser?._id?.toString();
      if (!orgId) continue;

      if (!map[orgId]) {
        map[orgId] = {
          id:                    orgId,
          name:                  game.organiser.name  || 'Unknown',
          phone:                 game.organiser.phone || null,
          email:                 game.organiser.email || null,
          totalGames:            0,
          completedGames:        0,
          cancelledGames:        0,
          totalRevenuePaise:     0,
          totalGuestSlots:       0,
          totalPaidRegistrations:0,
        };
      }

      map[orgId].totalGames++;
      if (game.status === 'completed') map[orgId].completedGames++;
      if (game.status === 'cancelled') map[orgId].cancelledGames++;

      for (const reg of game.registrations || []) {
        if (reg.paymentStatus === 'paid') {
          map[orgId].totalRevenuePaise      += reg.amountPaidPaise || 0;
          map[orgId].totalPaidRegistrations += 1;
        }
        if (reg.plusOneName) map[orgId].totalGuestSlots++;
      }
    }

    const data = Object.values(map).sort((a, b) => b.totalRevenuePaise - a.totalRevenuePaise);

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[getOrganiserEarnings]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/player-ratings
// All organiser-to-player ratings across the platform.
// ─────────────────────────────────────────────────────────────────────────────
exports.listPlayerRatings = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);

    const [ratings, total] = await Promise.all([
      PlayerRating.find()
        .populate('player',   'name phone')
        .populate('organiser', 'name phone')
        .populate('game',     'title format scheduledAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      PlayerRating.countDocuments(),
    ]);

    const data = ratings.map((r) => ({
      id:               r._id,
      playerName:       r.player?.name   || 'Unknown',
      playerPhone:      r.player?.phone  || null,
      organiserName:    r.organiser?.name  || 'Unknown',
      organiserPhone:   r.organiser?.phone || null,
      gameTitle:        r.game ? (r.game.title || `${r.game.format || 'Match'} Game`) : null,
      gameFormat:       r.game?.format   || null,
      gameDate:         r.game?.scheduledAt ? new Date(r.game.scheduledAt).toISOString() : null,
      conductRating:    r.conductRating,
      gameplayRating:   r.gameplayRating,
      avgRating:        Math.round(((r.conductRating + r.gameplayRating) / 2) * 10) / 10,
      preferredPosition: r.preferredPosition || null,
      gkAffinity:       r.gkAffinity || null,
      notes:            r.notes || null,
      ratedAt:          r.createdAt ? new Date(r.createdAt).toISOString() : null,
    }));

    return res.status(200).json({ success: true, count: total, data });
  } catch (err) {
    console.error('[listPlayerRatings]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
