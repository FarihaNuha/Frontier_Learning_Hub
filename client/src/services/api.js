import { createReadCache } from "./requestCache";
import axios from "axios";
import { Capacitor } from "@capacitor/core";

const getBackendUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 1. In native mobile app (Capacitor Android/iOS), ALWAYS point to the live Render cloud backend
  try {
    if (Capacitor.isNativePlatform()) {
      return "https://frontier-learning-academy.onrender.com";
    }
  } catch (e) {}

  // 2. If running inside WebView on localhost without a dev port (Capacitor WebView)
  if (
    typeof window !== "undefined" &&
    (window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === "capacitor:" ||
      (window.location.hostname === "localhost" && window.location.port === "") ||
      (window.location.hostname === "127.0.0.1" && window.location.port === ""))
  ) {
    return "https://frontier-learning-academy.onrender.com";
  }

  // 3. Local desktop development with explicit port 3000/3001
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.port === "3000" ||
      window.location.port === "3001" ||
      window.location.hostname.startsWith("192.168."));

  if (isLocalDev) {
    return "http://localhost:5000";
  }

  return "https://frontier-learning-academy.onrender.com";
};

export const BACKEND_URL = getBackendUrl();

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 60000,
});

const readOwner = () => {
  try { const user = JSON.parse(localStorage.getItem("user") || "null"); return localStorage.getItem("token") && (user?.id || user?._id) ? `${user.id || user._id}:${user.role}` : "anonymous"; } catch { return "anonymous"; }
};
const reads = createReadCache(axios.getAdapter(api.defaults.adapter), readOwner, Date.now, {
  storage: window.localStorage,
  onAuthError: error => {
    if (error.response?.status === 401) { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth"; }
  },
});
api.defaults.adapter = reads.request;
api.clearReadCache = reads.clear;
api.invalidateReadCache = reads.invalidate;
api.peekReadCache = (url, params) => reads.peek({ baseURL: api.defaults.baseURL, url, params });
api.subscribeReads = reads.subscribe;
api.readOwner = readOwner;

// Request interceptor - add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - DON'T auto logout on 401 & auto-invalidate cache on mutations
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Just log the error, don't redirect to login
    console.error("API Error:", error.response?.status, error.config?.url);

    // Only redirect if it's a 401 AND we're not already on auth page
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes("/auth")
    ) {
      console.log("Session expired - clearing storage");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  },
);

export default api;
