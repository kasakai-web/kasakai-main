const express = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate.middleware");
const { loginRequiredFields } = require("../validations/auth.validation");

const router = express.Router();

router.post("/login", validate(loginRequiredFields), authController.login);

module.exports = router;
