const Alert = require("../models/Alert");
const Server = require("../models/Server");

const HEARTBEAT_TIMEOUT_MS = Number(process.env.HEARTBEAT_TIMEOUT_MS || 15000);
const HEARTBEAT_SCAN_INTERVAL_MS = Number(
  process.env.HEARTBEAT_SCAN_INTERVAL_MS || 5000,
);

const createOfflineAlertIfNeeded = async ({ server }) => {
  const existingActiveAlert = await Alert.findOne({
    serverId: server._id,
    sourceMetric: "heartbeat",
    status: "active",
  }).sort({ createdAt: -1 });

  if (existingActiveAlert) {
    existingActiveAlert.currentValue = HEARTBEAT_TIMEOUT_MS / 1000;
    await existingActiveAlert.save();

    return { 
      alert: existingActiveAlert,
      isNew: false,
    };
  }

  const alert = await Alert.create({
    serverId: server._id,
    type: "Server Offline",
    message: "Heartbeat timeout exceeded. Server is considered offline.",
    severity: "critical",
    status: "active",
    sourceMetric: "heartbeat",
    threshold: HEARTBEAT_TIMEOUT_MS / 1000,
    currentValue: HEARTBEAT_TIMEOUT_MS / 1000,
  });

  return {
    alert,
    isNew: true,
  };
};

const markOfflineServers = async (io) => {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

  const staleServers = await Server.find({
    status: { $ne: "offline" },
    lastHeartbeatAt: { $ne: null, $lt: cutoff },
  });

  for (const server of staleServers) {
    server.status = "offline";
    server.offlineDetectedAt = new Date();

    await server.save();

    io.emit("serverStatusChanged", server);

    const { alert, isNew } = await createOfflineAlertIfNeeded({ server });

    io.emit(isNew ? "newAlert" : "alertUpdated", alert);
  }
};

const startHeartbeatMonitor = (io) => {
  const timer = setInterval(() => {
    markOfflineServers(io).catch((error) => {
      console.error("Heartbeat monitor error:", error.message);
    });
  }, HEARTBEAT_SCAN_INTERVAL_MS);

  return timer;
};

module.exports = {
  HEARTBEAT_TIMEOUT_MS,
  HEARTBEAT_SCAN_INTERVAL_MS,
  startHeartbeatMonitor,
};
