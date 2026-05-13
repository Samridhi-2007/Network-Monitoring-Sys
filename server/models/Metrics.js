const mongoose = require("mongoose");

const metricsSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
    },

    cpuUsage: Number,

    memoryUsage: Number,

    diskUsage: Number,

    uptime: Number,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Metrics", metricsSchema);
