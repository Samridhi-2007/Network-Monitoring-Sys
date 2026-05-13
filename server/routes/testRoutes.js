const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

router.get("/protected", protect, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

module.exports = router;
