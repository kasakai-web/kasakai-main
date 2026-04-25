const userModel = require("../models/user.model");

function registerUser(payload) {
  return userModel.createUser(payload);
}

function getUsers() {
  return userModel.listUsers();
}

module.exports = {
  registerUser,
  getUsers
};
