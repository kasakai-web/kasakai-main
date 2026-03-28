const ApiError = require("../utils/ApiError");

function validate(requiredFields = []) {
  return function validateBody(req, _res, next) {
    const missing = requiredFields.filter((field) => req.body[field] == null);
    if (missing.length > 0) {
      return next(new ApiError(400, "Validation failed", { missing }));
    }
    return next();
  };
}

module.exports = validate;
