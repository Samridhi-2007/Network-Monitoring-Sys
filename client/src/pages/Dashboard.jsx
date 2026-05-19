import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiAlertTriangle,
  FiBell,
  FiClock,
  FiCpu,
  FiDatabase,
  FiEye,
  FiGitBranch,
  FiHardDrive,
  FiPauseCircle,
  FiPlayCircle,
  FiRadio,
  FiRepeat,
  FiServer,
  FiShield,
  FiTrendingUp,
  FiWifi,
  FiWifiOff,
  FiZap,
} from "react-icons/fi";

import socket from "../socket/socket";
import { API_BASE_URL } from "../config";
const METRICS_HISTORY_LIMIT = 24;
const ALERT_HISTORY_LIMIT = 10;
const DEMO_TICK_MS = 1800;

const DEMO_AGENT_TEMPLATES = [
  {
    id: "agent-edge-01",
    name: "Edge Agent 01",
    serverName: "api-node-01",
    role: "API workload",
    cpu: 34,
    memory: 48,
    disk: 58,
    state: "healthy",
  },
  {
    id: "agent-edge-02",
    name: "Edge Agent 02",
    serverName: "worker-node-02",
    role: "Queue worker",
    cpu: 56,
    memory: 62,
    disk: 51,
    state: "healthy",
  },
  {
    id: "agent-edge-03",
    name: "Edge Agent 03",
    serverName: "db-node-03",
    role: "Storage tier",
    cpu: 42,
    memory: 72,
    disk: 69,
    state: "warning",
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatPercent = (value = 0) => `${value.toFixed(1)}%`;

const formatUptime = (seconds = 0) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return [days ? `${days}d` : null, `${hours}h`, `${minutes}m`]
    .filter(Boolean)
    .join(" ");
};

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "No heartbeat";

const formatRelativeAge = (value) => {
  if (!value) {
    return "No heartbeat yet";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ago`;
};

const getStatusTone = (value = 0) => {
  if (value >= 85) {
    return "text-rose-300";
  }

  if (value >= 65) {
    return "text-amber-300";
  }

  return "text-emerald-300";
};

const severityBadgeClass = {
  critical: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-200",
};

const statusBadgeClass = {
  online: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  offline: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

const demoStateClass = {
  healthy: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  incident: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

const signalColorClass = {
  telemetry: "from-cyan-400 to-sky-500",
  incident: "from-rose-400 to-orange-500",
  heartbeat: "from-emerald-400 to-cyan-500",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur">
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>

      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-6 text-sm text-slate-100"
        >
          <span className="font-medium">{entry.name}</span>
          <span style={{ color: entry.color }}>{formatPercent(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, hint, accent, tone }) => (
  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20">
    <div
      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent} opacity-80`}
    />

    <div className="mb-5 flex items-center justify-between">
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-slate-100">
        <Icon size={20} />
      </div>

      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300">
        Live
      </span>
    </div>

    <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{label}</p>
    <p className={`mt-3 text-4xl font-semibold ${tone}`}>{value}</p>
    <p className="mt-3 text-sm text-slate-400">{hint}</p>
  </div>
);

const SignalCard = ({ icon: Icon, title, subtitle, accent }) => (
  <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
    <div
      className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${accent} p-3 text-white shadow-lg`}
    >
      <Icon size={18} />
    </div>

    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{title}</p>
    <h3 className="mt-2 text-xl font-semibold text-white">{subtitle}</h3>
  </div>
);

const ChartPanel = ({ title, subtitle, accent, children }) => (
  <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 p-5 shadow-[0_24px_100px_rgba(2,6,23,0.55)] backdrop-blur-xl">
    <div
      className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-3xl`}
    />

    <div className="relative mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{subtitle}</h2>
      </div>

      <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
        Streaming
      </div>
    </div>

    <div className="relative h-80">{children}</div>
  </section>
);

const NotificationItem = ({ alert }) => {
  const isActive = alert.status === "active";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{alert.type} alarm</p>
          <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
            severityBadgeClass[alert.severity] ?? severityBadgeClass.warning
          }`}
        >
          {alert.severity}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
        <span>{isActive ? "Active incident" : "Resolved incident"}</span>
        <span>{formatTime(alert.updatedAt || alert.createdAt)}</span>
      </div>

      {typeof alert.currentValue === "number" && typeof alert.threshold === "number" ? (
        <p className="mt-3 text-sm text-slate-300">
          Signal{" "}
          {alert.sourceMetric === "heartbeat"
            ? `${alert.currentValue.toFixed(0)}s`
            : formatPercent(alert.currentValue)}{" "}
          against threshold{" "}
          {alert.sourceMetric === "heartbeat"
            ? `${alert.threshold.toFixed(0)}s`
            : formatPercent(alert.threshold)}
          .
        </p>
      ) : null}
    </div>
  );
};

const ServerHeartbeatCard = ({ server }) => {
  const isOnline = server.status === "online";

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">
            {server.serverName || "Unnamed server"}
          </p>
          <p className="mt-1 text-sm text-slate-400">{server.ipAddress}</p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
            statusBadgeClass[server.status] ?? statusBadgeClass.offline
          }`}
        >
          {server.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Last heartbeat
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatTime(server.lastHeartbeatAt)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {formatRelativeAge(server.lastHeartbeatAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Heartbeat interval
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {server.heartbeatIntervalSeconds || 5}s
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Cron-style health checks compare this to recent telemetry arrival.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        {isOnline ? (
          <FiWifi className="text-emerald-300" />
        ) : (
          <FiWifiOff className="text-rose-300" />
        )}
        <span>
          {isOnline
            ? "Heartbeat stream is healthy and the node is online."
            : "Heartbeat timeout exceeded and the node has been marked offline."}
        </span>
      </div>
    </div>
  );
};

const DemoAgentCard = ({ agent }) => (
  <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">
          {agent.name}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">{agent.serverName}</h3>
        <p className="mt-1 text-sm text-slate-400">{agent.role}</p>
      </div>

      <span
        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
          demoStateClass[agent.state] ?? demoStateClass.healthy
        }`}
      >
        {agent.state}
      </span>
    </div>

    <div className="mt-5 grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">CPU</p>
        <p className={`mt-2 text-lg font-semibold ${getStatusTone(agent.cpu)}`}>
          {formatPercent(agent.cpu)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">RAM</p>
        <p className={`mt-2 text-lg font-semibold ${getStatusTone(agent.memory)}`}>
          {formatPercent(agent.memory)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Disk</p>
        <p className={`mt-2 text-lg font-semibold ${getStatusTone(agent.disk)}`}>
          {formatPercent(agent.disk)}
        </p>
      </div>
    </div>
  </div>
);

const DemoEventItem = ({ event }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-white">{event.title}</p>
      <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {event.time}
      </span>
    </div>
    <p className="mt-2 text-sm text-slate-400">{event.detail}</p>
  </div>
);

const Dashboard = () => {
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [servers, setServers] = useState([]);
  const [demoRunning, setDemoRunning] = useState(true);
  const [demoCycle, setDemoCycle] = useState(0);
  const [demoAgents, setDemoAgents] = useState(DEMO_AGENT_TEMPLATES);
  const [demoEvents, setDemoEvents] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [metricsResponse, alertsResponse, serversResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/metrics?limit=${METRICS_HISTORY_LIMIT}`),
          axios.get(`${API_BASE_URL}/alerts?limit=${ALERT_HISTORY_LIMIT}`),
          axios.get(`${API_BASE_URL}/servers`),
        ]);

        setMetrics(metricsResponse.data ?? []);
        setAlerts(alertsResponse.data ?? []);
        setServers(serversResponse.data ?? []);
      } catch (error) {
        console.error("Failed to load observability data", error);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const handleMetricsUpdated = (data) => {
      setMetrics((prev) => [...prev.slice(-(METRICS_HISTORY_LIMIT - 1)), data]);
    };

    const prependAlert = (alert) => {
      setAlerts((prev) => {
        const next = [alert, ...prev.filter((item) => item._id !== alert._id)];

        return next.slice(0, ALERT_HISTORY_LIMIT);
      });
    };

    const upsertServer = (server) => {
      setServers((prev) => [server, ...prev.filter((item) => item._id !== server._id)]);
    };

    socket.on("metricsUpdated", handleMetricsUpdated);
    socket.on("newAlert", prependAlert);
    socket.on("alertUpdated", prependAlert);
    socket.on("alertResolved", prependAlert);
    socket.on("serverStatusChanged", upsertServer);
    socket.on("serverHeartbeat", upsertServer);

    return () => {
      socket.off("metricsUpdated", handleMetricsUpdated);
      socket.off("newAlert", prependAlert);
      socket.off("alertUpdated", prependAlert);
      socket.off("alertResolved", prependAlert);
      socket.off("serverStatusChanged", upsertServer);
      socket.off("serverHeartbeat", upsertServer);
    };
  }, []);

  useEffect(() => {
    if (!demoRunning) {
      return undefined;
    }

    const timer = setInterval(() => {
      setDemoCycle((prev) => prev + 1);

      setDemoAgents((prev) =>
        prev.map((agent, index) => {
          const nextCpu = clamp(
            agent.cpu + ((index + 1) * 7 + demoCycle * 3) % 11 - 5,
            18,
            96,
          );
          const nextMemory = clamp(
            agent.memory + ((index + 3) * 5 + demoCycle * 2) % 9 - 4,
            30,
            96,
          );
          const nextDisk = clamp(agent.disk + (index === 2 ? 1 : 0), 40, 91);

          let state = "healthy";

          if (nextCpu > 80 || nextMemory > 90) {
            state = "incident";
          } else if (nextCpu > 65 || nextMemory > 75 || nextDisk > 80) {
            state = "warning";
          }

          return {
            ...agent,
            cpu: nextCpu,
            memory: nextMemory,
            disk: nextDisk,
            state,
          };
        }),
      );

      setDemoEvents((prev) => {
        const sampleAgent =
          DEMO_AGENT_TEMPLATES[(demoCycle + 1) % DEMO_AGENT_TEMPLATES.length];
        const step = demoCycle % 4;

        const event =
          step === 0
            ? {
                title: `${sampleAgent.name} emits telemetry`,
                detail:
                  "Agent samples CPU, RAM, disk, and uptime before posting to /api/metrics.",
              }
            : step === 1
              ? {
                  title: "Backend ingests metric payload",
                  detail:
                    "Metrics are stored, heartbeat freshness is updated, and live socket events are emitted.",
                }
              : step === 2
                ? {
                    title: "Incident rules evaluate thresholds",
                    detail:
                      "CPU, memory, disk, and heartbeat thresholds are checked for alert promotion or resolution.",
                  }
                : {
                    title: "Frontend refreshes operators view",
                    detail:
                      "Charts, alert center, and fleet health cards update instantly without polling.",
                  };

        const withTime = {
          ...event,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };

        return [withTime, ...prev].slice(0, 5);
      });
    }, DEMO_TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, [demoCycle, demoRunning]);

  const latest = metrics[metrics.length - 1];

  const chartData = useMemo(
    () =>
      metrics.map((metric, index) => ({
        time: metric.createdAt ? formatTime(metric.createdAt) : `Sample ${index + 1}`,
        cpuUsage: Number(metric.cpuUsage ?? 0),
        memoryUsage: Number(metric.memoryUsage ?? 0),
        diskUsage: Number(metric.diskUsage ?? 0),
      })),
    [metrics],
  );

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "active"),
    [alerts],
  );

  const criticalAlerts = useMemo(
    () => activeAlerts.filter((alert) => alert.severity === "critical"),
    [activeAlerts],
  );

  const offlineServers = useMemo(
    () => servers.filter((server) => server.status === "offline"),
    [servers],
  );

  const demoIncidentCount = useMemo(
    () => demoAgents.filter((agent) => agent.state === "incident").length,
    [demoAgents],
  );

  const stats = useMemo(() => {
    if (!chartData.length) {
      return {
        cpuAverage: 0,
        memoryPeak: 0,
        diskPeak: 0,
      };
    }

    const cpuAverage =
      chartData.reduce((sum, point) => sum + point.cpuUsage, 0) / chartData.length;

    return {
      cpuAverage,
      memoryPeak: Math.max(...chartData.map((point) => point.memoryUsage)),
      diskPeak: Math.max(...chartData.map((point) => point.diskUsage)),
    };
  }, [chartData]);

  const systemHealth = offlineServers.length
    ? "Offline nodes"
    : criticalAlerts.length
      ? "Critical"
      : activeAlerts.length
        ? "Degraded"
        : latest
          ? "Healthy"
          : "Waiting";

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#17325c_0%,#08111f_42%,#020617_100%)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6rem] top-16 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute right-[-4rem] top-0 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-white/10 bg-white/6 px-6 py-7 shadow-[0_30px_120px_rgba(15,23,42,0.65)] backdrop-blur-2xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                <FiTrendingUp />
                Observability Control Plane
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Heartbeat monitoring, live observability, and demo-ready multi-agent flow.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                The dashboard now shows both the real monitoring system and a guided
                multi-agent simulation so viewers can understand the project goal at a glance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:w-[28rem]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Health
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{systemHealth}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Servers
                </p>
                <p className="mt-3 text-3xl font-semibold text-cyan-200">
                  {servers.length}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Offline
                </p>
                <p className="mt-3 text-3xl font-semibold text-rose-200">
                  {offlineServers.length}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Alerts
                </p>
                <p className="mt-3 text-3xl font-semibold text-amber-200">
                  {activeAlerts.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SignalCard
            icon={FiEye}
            title="Observability"
            subtitle="Unified visibility into node health, telemetry, and incidents."
            accent={signalColorClass.telemetry}
          />
          <SignalCard
            icon={FiRadio}
            title="Heartbeat Monitoring"
            subtitle="Scheduled health checks detect silent nodes after telemetry stops."
            accent={signalColorClass.heartbeat}
          />
          <SignalCard
            icon={FiShield}
            title="Distributed Systems Thinking"
            subtitle="Server liveness is inferred from heartbeat freshness, not manual status."
            accent={signalColorClass.incident}
          />
        </section>

        <section className="mt-6 rounded-[32px] border border-white/10 bg-slate-950/50 p-6 shadow-[0_24px_100px_rgba(2,6,23,0.55)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-200">
                <FiGitBranch />
                Multi-Agent Simulation
              </div>

              <h2 className="mt-4 text-3xl font-semibold text-white">
                Demo the system goal without waiting for real incidents.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                This view simulates several monitoring agents streaming telemetry into
                the backend, triggering incident rules, and updating the operator UI.
                It is designed for demos, interviews, and quick architecture explanation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setDemoRunning((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {demoRunning ? <FiPauseCircle /> : <FiPlayCircle />}
                {demoRunning ? "Pause Demo" : "Resume Demo"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDemoCycle(0);
                  setDemoAgents(DEMO_AGENT_TEMPLATES);
                  setDemoEvents([]);
                  setDemoRunning(true);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                <FiRepeat />
                Reset Demo
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              icon={FiServer}
              label="Simulated Agents"
              value={String(demoAgents.length)}
              hint="Multiple monitored nodes feed telemetry concurrently."
              accent="from-fuchsia-400 via-violet-400 to-indigo-500"
              tone="text-fuchsia-200"
            />

            <MetricCard
              icon={FiRadio}
              label="Demo State"
              value={demoRunning ? "Running" : "Paused"}
              hint="Replay the project architecture live during demos."
              accent="from-cyan-400 via-sky-400 to-blue-500"
              tone="text-cyan-200"
            />

            <MetricCard
              icon={FiAlertTriangle}
              label="Demo Incidents"
              value={String(demoIncidentCount)}
              hint="Shows how threshold breaches appear in the system."
              accent="from-rose-400 via-orange-400 to-amber-500"
              tone={demoIncidentCount ? "text-rose-200" : "text-emerald-200"}
            />

            <MetricCard
              icon={FiBell}
              label="Event Steps"
              value={String(demoEvents.length)}
              hint="Recent simulated lifecycle events for teaching the flow."
              accent="from-emerald-400 via-teal-400 to-cyan-500"
              tone="text-emerald-200"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100">
                  <FiServer size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Demo Agents
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">
                    Simulated fleet
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {demoAgents.map((agent) => (
                  <DemoAgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100">
                  <FiZap size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Demo Flow
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">
                    Architecture event stream
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {demoEvents.length ? (
                  demoEvents.map((event, index) => (
                    <DemoEventItem key={`${event.time}-${index}`} event={event} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-slate-400">
                    Start the simulation to animate agent, backend, and frontend flow.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {offlineServers.length > 0 ? (
          <section className="mt-6 overflow-hidden rounded-[28px] border border-rose-400/25 bg-rose-500/10 px-6 py-5 shadow-[0_20px_90px_rgba(244,63,94,0.18)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative mt-1">
                  <div className="absolute inset-0 animate-ping rounded-full bg-rose-400/60" />
                  <div className="relative rounded-full bg-rose-400 p-3 text-slate-950">
                    <FiAlertTriangle size={22} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-100">
                    Server Offline Alarm
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Heartbeat timeout detected one or more offline servers.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100/85">
                    The scheduler is marking stale nodes offline when their heartbeat stops.
                    Realtime alarming remains active until telemetry resumes.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-rose-300/20 bg-slate-950/35 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.28em] text-rose-100/70">
                  Offline nodes
                </p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  {offlineServers.length}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {!latest ? (
          <section className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-slate-950/40 px-6 py-14 text-center shadow-[0_24px_80px_rgba(15,23,42,0.4)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <FiActivity size={26} />
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-white">
              Waiting for live telemetry
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Start the backend and the agent to stream metrics into the dashboard.
              Heartbeat checks, offline detection, and incident alarms will appear automatically.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={FiCpu}
                label="CPU Usage"
                value={formatPercent(latest.cpuUsage)}
                hint="Processor pressure for realtime compute observability."
                accent="from-cyan-400 via-sky-400 to-blue-500"
                tone={getStatusTone(latest.cpuUsage)}
              />

              <MetricCard
                icon={FiDatabase}
                label="RAM Usage"
                value={formatPercent(latest.memoryUsage)}
                hint="Memory pressure used in incident detection and alarms."
                accent="from-emerald-400 via-teal-400 to-cyan-500"
                tone={getStatusTone(latest.memoryUsage)}
              />

              <MetricCard
                icon={FiHardDrive}
                label="Disk Usage"
                value={formatPercent(latest.diskUsage)}
                hint="Storage saturation monitored for early warning alerts."
                accent="from-fuchsia-400 via-violet-400 to-indigo-500"
                tone={getStatusTone(latest.diskUsage)}
              />

              <MetricCard
                icon={FiClock}
                label="System Uptime"
                value={formatUptime(latest.uptime)}
                hint="Runtime heartbeat reported by the monitoring agent."
                accent="from-amber-400 via-orange-400 to-rose-500"
                tone="text-amber-200"
              />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="grid grid-cols-1 gap-6">
                <ChartPanel
                  title="Live Charts"
                  subtitle="CPU usage timeline"
                  accent="from-cyan-400 to-blue-500"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={18}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={formatPercent}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cpuUsage"
                        name="CPU"
                        stroke="#38bdf8"
                        strokeWidth={3}
                        fill="url(#cpuFill)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#e0f2fe", stroke: "#38bdf8" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel
                  title="Live Charts"
                  subtitle="RAM usage timeline"
                  accent="from-emerald-400 to-teal-500"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={18}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={formatPercent}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="memoryUsage"
                        name="RAM"
                        stroke="#34d399"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5, fill: "#d1fae5", stroke: "#34d399" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <section className="rounded-[28px] border border-white/10 bg-slate-950/50 p-5 shadow-[0_24px_100px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Heartbeat Monitoring
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Server health management
                      </h2>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      Cron scheduler
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Heartbeat source</span>
                        <span className="text-sm font-semibold text-white">
                          Metrics ingress
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Offline threshold</span>
                        <span className="text-sm font-semibold text-white">15s</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Managed nodes</span>
                        <span className="text-sm font-semibold text-white">
                          {servers.length}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-cyan-400/15 p-2 text-cyan-200">
                          <FiZap size={18} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-white">
                            Scheduled health checks are armed
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            A background monitor scans heartbeat freshness and raises offline incidents automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-slate-950/50 p-5 shadow-[0_24px_100px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Realtime Notifications
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        Alert center
                      </h2>
                    </div>

                    <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
                      <FiBell className="inline-block" /> {alerts.length}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {alerts.length ? (
                      alerts.map((alert) => <NotificationItem key={alert._id} alert={alert} />)
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-slate-400">
                        Alerts will appear here when telemetry or heartbeat health crosses a threshold.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </section>

            <section className="mt-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100">
                  <FiServer size={18} />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Server Liveness
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Heartbeat fleet view
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {servers.length ? (
                  servers.map((server) => (
                    <ServerHeartbeatCard key={server._id} server={server} />
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/40 px-6 py-12 text-center text-slate-400">
                    Create a server and start the agent to populate heartbeat health.
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              <MetricCard
                icon={FiTrendingUp}
                label="CPU Average"
                value={formatPercent(stats.cpuAverage)}
                hint="Rolling average across the active telemetry window."
                accent="from-cyan-400 via-sky-400 to-blue-500"
                tone="text-cyan-200"
              />

              <MetricCard
                icon={FiDatabase}
                label="RAM Peak"
                value={formatPercent(stats.memoryPeak)}
                hint="Highest observed memory pressure in the current window."
                accent="from-emerald-400 via-teal-400 to-cyan-500"
                tone="text-emerald-200"
              />

              <MetricCard
                icon={FiHardDrive}
                label="Disk Peak"
                value={formatPercent(stats.diskPeak)}
                hint="Peak storage occupancy across recent metric samples."
                accent="from-fuchsia-400 via-violet-400 to-indigo-500"
                tone="text-fuchsia-200"
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default Dashboard;
