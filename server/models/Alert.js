const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    serverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
    },

    type: {
      type: String,
    },

    message: {
      type: String,
    },

    severity: {
      type: String,
      enum: ["warning", "critical"],
    },

    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
    },

    sourceMetric: {
      type: String,
      enum: ["cpuUsage", "memoryUsage", "diskUsage", "heartbeat"],
    },

    threshold: {
      type: Number,
    },

    currentValue: {
      type: Number,
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Alert", alertSchema);
