const express = require("express");

const router = express.Router();

const { getRecentAlerts } = require("../controllers/alertController");

router.get("/", getRecentAlerts);

module.exports = router;
