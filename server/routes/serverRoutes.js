const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createServer,
  getServerOverview,
} = require("../controllers/serverController");

router.get("/", getServerOverview);

router.post("/", protect, createServer);

module.exports = router;
