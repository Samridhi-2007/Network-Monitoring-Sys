const express = require("express");

const router = express.Router();

const {
  createMetrics,
  getRecentMetrics,
} = require("../controllers/metricsController");

router.get("/", getRecentMetrics);

router.post("/", createMetrics);

module.exports = router;
