const mongoose = require("mongoose");

const serverSchema = new mongoose.Schema(
  {
    serverName: {
      type: String,
      required: true,
    },

    ipAddress: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },

    heartbeatIntervalSeconds: {
      type: Number,
      default: 5,
    },

    lastHeartbeatAt: {
      type: Date,
    },

    lastMetricsAt: {
      type: Date,
    },

    offlineDetectedAt: {
      type: Date,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Server", serverSchema);
