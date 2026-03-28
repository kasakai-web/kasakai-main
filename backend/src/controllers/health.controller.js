const { sendSuccess } = require("../utils/response");

function getHealth(_req, res) {
  return sendSuccess(
    res,
    {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    "Service is healthy"
  );
}

module.exports = {
  getHealth
};
