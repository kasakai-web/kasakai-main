const jwt   = require('jsonwebtoken');
const Admin = require('../../models/Admin');
const Player = require('../../models/Player');
const Organiser = require('../../models/Organiser');
const Game = require('../../models/Game');
const Notification = require('../../models/Notification');

const formatJoinedAt = (value) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

const formatLocation = (location = {}) => {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const formatPlayer = (player) => ({
  id: player._id,
  name: player.name,
  phone: player.phone,
  email: player.email || null,
  role: 'player',
  gamesPlayed: player.totalGamesPlayed || 0,
  rating: player.rating || 0,
  joinedAt: formatJoinedAt(player.createdAt),
  status: player.isVerified ? 'active' : 'pending',
  location: formatLocation(player.location),
});

const formatOrganiser = (organiser) => ({
  id: organiser._id,
  name: organiser.name,
  phone: organiser.phone,
  email: organiser.email || null,
  role: 'organiser',
  gamesHosted: organiser.totalGamesHosted || 0,
  rating: organiser.averageRating || 0,
  earningsPaise: organiser.totalEarningsPaise || 0,
  joinedAt: formatJoinedAt(organiser.createdAt),
  status: organiser.isActive ? organiser.approvalStatus : 'suspended',
  location: formatLocation(organiser.location),
  approvalStatus: organiser.approvalStatus,
  isActive: organiser.isActive,
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
    const [players, organisers] = await Promise.all([
      Player.find().sort({ createdAt: -1 }).lean(),
      Organiser.find().sort({ createdAt: -1 }).lean(),
    ]);

    const users = [
      ...players.map(formatPlayer),
      ...organisers.map(formatOrganiser),
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
    const organisers = await Organiser.find().sort({ createdAt: -1 }).lean();

    const data = organisers.map(formatOrganiser);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
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
// Derives payment records from game registrations.
// ─────────────────────────────────────────────
exports.listPayments = async (req, res) => {
  try {
    const games = await Game.find()
      .select('title feeInPaise scheduledAt registrations')
      .populate('registrations.player', 'name')
      .sort({ scheduledAt: -1 })
      .lean();

    const payments = [];
    let totalProcessedPaise = 0;
    let totalRefundedPaise = 0;
    let pendingCount = 0;

    games.forEach((game) => {
      const registrations = Array.isArray(game.registrations) ? game.registrations : [];

      registrations.forEach((registration) => {
        const amountPaise =
          typeof registration.amountPaidPaise === 'number' && registration.amountPaidPaise > 0
            ? registration.amountPaidPaise
            : game.feeInPaise || 0;

        const paymentStatus = mapPaymentStatus(registration.paymentStatus);

        if (paymentStatus === 'success') totalProcessedPaise += amountPaise;
        if (paymentStatus === 'refunded') totalRefundedPaise += amountPaise;
        if (paymentStatus === 'pending') pendingCount += 1;

        payments.push({
          id: registration._id,
          playerName: registration.player?.name || 'Unknown player',
          type: 'Registration',
          amountPaise,
          gameTitle: game.title || `${game.format || 'Match'} Game`,
          method: mapPaymentMethod(registration.paymentStatus),
          paidAt: registration.signedUpAt ? new Date(registration.signedUpAt).toISOString() : null,
          status: paymentStatus,
        });
      });
    });

    return res.status(200).json({
      success: true,
      count: payments.length,
      summary: {
        totalProcessedPaise,
        totalRefundedPaise,
        pendingCount,
      },
      data: payments,
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

    return res.status(200).json({
      success: true,
      data: { notifications, total },
    });
  } catch (err) {
    console.error('[listNotifications]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
