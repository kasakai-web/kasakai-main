const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const authService = require("../services/auth.service");

const login = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const data = authService.buildAuthPayload(email);
  return sendSuccess(res, data, "Login successful");
});

module.exports = {
  login
};
