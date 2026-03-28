function buildAuthPayload(email) {
  return {
    token: `demo-token-for-${email}`,
    expiresIn: "1h"
  };
}

module.exports = {
  buildAuthPayload
};
