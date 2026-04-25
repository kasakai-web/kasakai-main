const crypto = require("node:crypto");

const users = [];

function createUser(payload) {
  const user = {
    id: crypto.randomUUID(),
    email: payload.email,
    name: payload.name,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  return user;
}

function listUsers() {
  return users;
}

module.exports = {
  createUser,
  listUsers
};
