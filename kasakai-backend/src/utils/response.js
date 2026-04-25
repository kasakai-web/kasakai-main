function sendSuccess(res, data, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function sendError(res, message = "Error", statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    details
  });
}

module.exports = {
  sendSuccess,
  sendError
};
