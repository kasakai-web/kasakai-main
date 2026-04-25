const logger = require("../config/logger");

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error(message, {
    statusCode,
    stack: err.stack,
    details: err.details || null
  });

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || null
  });
}

module.exports = errorHandler;
