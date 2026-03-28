const express = require("express");
const userController = require("../controllers/user.controller");
const validate = require("../middlewares/validate.middleware");
const { createUserRequiredFields } = require("../validations/user.validation");

const router = express.Router();

router.get("/", userController.listUsers);
router.post("/", validate(createUserRequiredFields), userController.createUser);

module.exports = router;
