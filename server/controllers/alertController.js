const Alert = require("../models/Alert");

const getRecentAlerts = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 12, 50);

    const alerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(alerts);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getRecentAlerts,
};
