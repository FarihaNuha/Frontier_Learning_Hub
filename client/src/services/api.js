import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

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

// Response interceptor - DON'T auto logout on 401
api.interceptors.response.use(
  (response) => response,
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
