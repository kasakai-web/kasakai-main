const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const userService = require("../services/user.service");

const createUser = asyncHandler(async (req, res) => {
  const user = userService.registerUser(req.body);
  return sendSuccess(res, user, "User created", 201);
});

const listUsers = asyncHandler(async (_req, res) => {
  const users = userService.getUsers();
  return sendSuccess(res, users, "Users fetched");
});

module.exports = {
  createUser,
  listUsers
};
