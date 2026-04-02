const jwt = require("jsonwebtoken");
const Player = require("../../models/Player");
const Organiser = require("../../models/Organiser");
const Admin = require("../../models/Admin");

// Protect route to only logged-in users
exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Depending on the role, fetch the user and attach to req.user
    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === "organiser") {
      user = await Organiser.findById(decoded.id);
    } else {
      user = await Player.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    user.role = decoded.role; // explicitly attach role
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user ? req.user.role : ""} is not authorized to access this route`,
      });
    }
    next();
  };
};