const Server = require("../models/Server");

const createServer = async (req, res) => {
  try {
    const { serverName, ipAddress } = req.body;

    const server = await Server.create({
      serverName,
      ipAddress,
      owner: req.user.id,
    });

    res.status(201).json(server);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getServerOverview = async (req, res) => {
  try {
    const servers = await Server.find().sort({ updatedAt: -1 });

    res.json(servers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createServer,
  getServerOverview,
};
