const currentOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:5000";

const isLocalViteSession =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  window.location.port === "5173";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalViteSession ? "http://localhost:5000/api" : "/api");

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (isLocalViteSession ? "http://localhost:5000" : currentOrigin);
