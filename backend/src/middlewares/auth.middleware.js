const jwt = require("jsonwebtoken");
const Player = require("../models/Player");
const Organiser = require("../models/Organiser"); // Added for organiser

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.role === "organiser") {
      user = await Organiser.findById(decoded.id);
    } else {
      user = await Player.findById(decoded.id);
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    req.user.role = decoded.role;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = authMiddleware;
