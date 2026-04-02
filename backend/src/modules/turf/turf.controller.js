const Turf = require("../../models/Turf");

exports.getAllTurfs = async (req, res) => {
  try {
    const turfs = await Turf.find({ isActive: true });
    
    res.status(200).json({
      success: true,
      count: turfs.length,
      data: turfs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};