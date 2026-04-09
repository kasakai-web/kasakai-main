const jwt   = require('jsonwebtoken');
const Admin = require('../../models/Admin');
const Player = require('../../models/Player');
const Organiser = require('../../models/Organiser');

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
