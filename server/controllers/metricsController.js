const Metrics = require("../models/Metrics");
const Alert = require("../models/Alert");
const Server = require("../models/Server");

const INCIDENT_RULES = [
  {
    type: "CPU",
    sourceMetric: "cpuUsage",
    threshold: 80,
    severity: "critical",
    message: "CPU saturation breached the 80% incident threshold.",
  },
  {
    type: "Memory",
    sourceMetric: "memoryUsage",
    threshold: 90,
    severity: "critical",
    message: "RAM pressure breached the 90% incident threshold.",
  },
  {
    type: "Disk",
    sourceMetric: "diskUsage",
    threshold: 85,
    severity: "warning",
    message: "Disk occupancy crossed the 85% alert threshold.",
  },
];

const getRecentMetrics = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 24, 100);

    const metrics = await Metrics.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(metrics.reverse());
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const syncServerHeartbeat = async (metrics, io) => {
  if (!metrics.serverId) {
    return null;
  }

  const server = await Server.findById(metrics.serverId);

  if (!server) {
    return null;
  }

  const previousStatus = server.status;

  server.status = "online";
  server.lastHeartbeatAt = metrics.createdAt;
  server.lastMetricsAt = metrics.createdAt;
  server.offlineDetectedAt = undefined;

  await server.save();

  if (previousStatus !== server.status) {
    io.emit("serverStatusChanged", server);
  } else {
    io.emit("serverHeartbeat", server);
  }

  const offlineAlert = await Alert.findOne({
    serverId: metrics.serverId,
    sourceMetric: "heartbeat",
    status: "active",
  }).sort({ createdAt: -1 });

  if (offlineAlert) {
    offlineAlert.status = "resolved";
    offlineAlert.currentValue = 0;
    offlineAlert.resolvedAt = new Date();
    await offlineAlert.save();

    io.emit("alertResolved", offlineAlert);
  }

  return server;
};

const emitIncidentAlert = async ({ io, metrics, rule, currentValue }) => {
  const existingActiveAlert = await Alert.findOne({
    serverId: metrics.serverId,
    sourceMetric: rule.sourceMetric,
    status: "active",
  }).sort({ createdAt: -1 });

  if (existingActiveAlert) {
    existingActiveAlert.currentValue = currentValue;
    existingActiveAlert.updatedAt = new Date();
    await existingActiveAlert.save();

    io.emit("alertUpdated", existingActiveAlert);

    return;
  }

  const alert = await Alert.create({
    serverId: metrics.serverId,
    type: rule.type,
    message: rule.message,
    severity: rule.severity,
    sourceMetric: rule.sourceMetric,
    threshold: rule.threshold,
    currentValue,
    status: "active",
  });

  io.emit("newAlert", alert);
};

const resolveIncidentAlert = async ({ io, metrics, rule, currentValue }) => {
  const activeAlert = await Alert.findOne({
    serverId: metrics.serverId,
    sourceMetric: rule.sourceMetric,
    status: "active",
  }).sort({ createdAt: -1 });

  if (!activeAlert) {
    return;
  }

  activeAlert.status = "resolved";
  activeAlert.currentValue = currentValue;
  activeAlert.resolvedAt = new Date();

  await activeAlert.save();

  io.emit("alertResolved", activeAlert);
};

const createMetrics = async (req, res) => {
  try {
    const metrics = await Metrics.create(req.body);

    const io = req.app.get("io");

    io.emit("metricsUpdated", metrics);
    await syncServerHeartbeat(metrics, io);

    for (const rule of INCIDENT_RULES) {
      const currentValue = Number(metrics[rule.sourceMetric] ?? 0);

      if (currentValue >= rule.threshold) {
        await emitIncidentAlert({
          io,
          metrics,
          rule,
          currentValue,
        });
      } else {
        await resolveIncidentAlert({
          io,
          metrics,
          rule,
          currentValue,
        });
      }
    }

    res.status(201).json(metrics);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createMetrics,
  getRecentMetrics,
};
