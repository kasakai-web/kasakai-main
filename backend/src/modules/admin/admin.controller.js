const jwt   = require('jsonwebtoken');
const Admin = require('../../models/Admin');

// Only this email is permitted to access the admin portal
const ALLOWED_ADMIN_EMAIL = 'adminkasakai@123';

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

    // Block any email that isn't the authorised admin email
    if (email.trim().toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Explicitly select password (field has select: false in schema)
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+password');

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
