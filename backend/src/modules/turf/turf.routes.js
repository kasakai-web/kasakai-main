const express = require("express");
const { getAllTurfs } = require("./turf.controller");

const router = express.Router();

router.get("/", getAllTurfs);

module.exports = router;