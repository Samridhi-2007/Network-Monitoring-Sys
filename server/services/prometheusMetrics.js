const Alert = require("../models/Alert");
const Metrics = require("../models/Metrics");
const Server = require("../models/Server");

const escapeLabelValue = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');

const metricLine = (name, value, labels = {}) => {
  const labelEntries = Object.entries(labels).filter(([, labelValue]) => labelValue !== undefined);
  const serializedLabels = labelEntries.length
    ? `{${labelEntries
        .map(([key, labelValue]) => `${key}="${escapeLabelValue(labelValue)}"`)
        .join(",")}}`
    : "";

  return `${name}${serializedLabels} ${Number.isFinite(Number(value)) ? Number(value) : 0}`;
};

const buildLatestMetricsByServer = async () => {
  const latestMetrics = await Metrics.aggregate([
    { $sort: { serverId: 1, createdAt: -1 } },
    {
      $group: {
        _id: "$serverId",
        cpuUsage: { $first: "$cpuUsage" },
        memoryUsage: { $first: "$memoryUsage" },
        diskUsage: { $first: "$diskUsage" },
        uptime: { $first: "$uptime" },
        createdAt: { $first: "$createdAt" },
      },
    },
  ]);

  return new Map(latestMetrics.map((entry) => [String(entry._id), entry]));
};

const renderPrometheusMetrics = async () => {
  const [servers, latestMetricsByServer, activeAlerts, totalMetrics] = await Promise.all([
    Server.find().lean(),
    buildLatestMetricsByServer(),
    Alert.find({ status: "active" }).lean(),
    Metrics.countDocuments(),
  ]);

  const nowInSeconds = Date.now() / 1000;
  const lines = [
    "# HELP nms_up Network monitoring backend availability.",
    "# TYPE nms_up gauge",
    metricLine("nms_up", 1),
    "# HELP nms_process_uptime_seconds Backend process uptime in seconds.",
    "# TYPE nms_process_uptime_seconds gauge",
    metricLine("nms_process_uptime_seconds", process.uptime()),
    "# HELP nms_process_resident_memory_bytes Backend resident memory size in bytes.",
    "# TYPE nms_process_resident_memory_bytes gauge",
    metricLine("nms_process_resident_memory_bytes", process.memoryUsage().rss),
    "# HELP nms_metrics_ingested_total Total metric documents ingested by the backend.",
    "# TYPE nms_metrics_ingested_total counter",
    metricLine("nms_metrics_ingested_total", totalMetrics),
    "# HELP nms_active_alerts_total Active alerts grouped by severity and type.",
    "# TYPE nms_active_alerts_total gauge",
  ];

  const alertCounts = new Map();

  for (const alert of activeAlerts) {
    const key = `${alert.severity}:${alert.type}`;
    alertCounts.set(key, (alertCounts.get(key) || 0) + 1);
  }

  if (alertCounts.size === 0) {
    lines.push(metricLine("nms_active_alerts_total", 0, { severity: "none", type: "none" }));
  } else {
    for (const [key, count] of alertCounts.entries()) {
      const [severity, type] = key.split(":");
      lines.push(metricLine("nms_active_alerts_total", count, { severity, type }));
    }
  }

  lines.push(
    "# HELP nms_server_online_status Current server status where 1 means online and 0 means offline.",
    "# TYPE nms_server_online_status gauge",
    "# HELP nms_server_last_heartbeat_timestamp_seconds Last heartbeat timestamp for each server.",
    "# TYPE nms_server_last_heartbeat_timestamp_seconds gauge",
    "# HELP nms_server_last_metrics_timestamp_seconds Last metrics ingestion timestamp for each server.",
    "# TYPE nms_server_last_metrics_timestamp_seconds gauge",
    "# HELP nms_server_metrics_age_seconds Age of the latest metrics sample for each server.",
    "# TYPE nms_server_metrics_age_seconds gauge",
    "# HELP nms_server_cpu_usage_percent Latest CPU usage percent reported for each server.",
    "# TYPE nms_server_cpu_usage_percent gauge",
    "# HELP nms_server_memory_usage_percent Latest memory usage percent reported for each server.",
    "# TYPE nms_server_memory_usage_percent gauge",
    "# HELP nms_server_disk_usage_percent Latest disk usage percent reported for each server.",
    "# TYPE nms_server_disk_usage_percent gauge",
    "# HELP nms_server_uptime_seconds Latest uptime reported for each server.",
    "# TYPE nms_server_uptime_seconds gauge",
  );

  for (const server of servers) {
    const labels = {
      server_id: String(server._id),
      server_name: server.serverName,
      ip_address: server.ipAddress,
    };
    const latest = latestMetricsByServer.get(String(server._id));
    const lastMetricsAtMs = latest?.createdAt ? new Date(latest.createdAt).getTime() : 0;

    lines.push(metricLine("nms_server_online_status", server.status === "online" ? 1 : 0, labels));
    lines.push(
      metricLine(
        "nms_server_last_heartbeat_timestamp_seconds",
        server.lastHeartbeatAt ? new Date(server.lastHeartbeatAt).getTime() / 1000 : 0,
        labels,
      ),
    );
    lines.push(
      metricLine(
        "nms_server_last_metrics_timestamp_seconds",
        server.lastMetricsAt ? new Date(server.lastMetricsAt).getTime() / 1000 : 0,
        labels,
      ),
    );
    lines.push(
      metricLine(
        "nms_server_metrics_age_seconds",
        lastMetricsAtMs ? nowInSeconds - lastMetricsAtMs / 1000 : 0,
        labels,
      ),
    );
    lines.push(metricLine("nms_server_cpu_usage_percent", latest?.cpuUsage ?? 0, labels));
    lines.push(metricLine("nms_server_memory_usage_percent", latest?.memoryUsage ?? 0, labels));
    lines.push(metricLine("nms_server_disk_usage_percent", latest?.diskUsage ?? 0, labels));
    lines.push(metricLine("nms_server_uptime_seconds", latest?.uptime ?? 0, labels));
  }

  return `${lines.join("\n")}\n`;
};

const prometheusMetricsHandler = async (req, res, next) => {
  try {
    const payload = await renderPrometheusMetrics();

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  prometheusMetricsHandler,
};
