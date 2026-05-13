require("dotenv").config();

const axios = require("axios");

const si = require("systeminformation");

const BACKEND_URL = process.env.BACKEND_URL;

const SERVER_ID = process.env.SERVER_ID;

const sendMetrics = async () => {
  try {
    // cpu
    const cpu = await si.currentLoad();

    // memory
    const memory = await si.mem();

    // disk
    const disk = await si.fsSize();

    // uptime
    const uptime = await si.time();

    const metricsData = {
      serverId: SERVER_ID,

      cpuUsage: cpu.currentLoad,

      memoryUsage: (memory.used / memory.total) * 100,

      diskUsage: disk[0].use,

      uptime: uptime.uptime,
    };

    await axios.post(`${BACKEND_URL}/api/metrics`, metricsData);

    console.log("Metrics sent:", metricsData);
  } catch (error) {
    console.log(error.message);
  }
};

// send every 5 seconds
sendMetrics();
setInterval(sendMetrics, 5000);
