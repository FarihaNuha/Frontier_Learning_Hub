import { createContext, useContext, useState, useEffect } from "react";
import api, { BACKEND_URL } from "../services/api";
import { clearAllCache } from "../services/apiCache";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const AuthContext = createContext();

const getSocketUrl = () => {
  return BACKEND_URL;
};

const getActiveStatusSetting = () => {
  const storedSettings = localStorage.getItem("user_settings");
  if (storedSettings) {
    try {
      return JSON.parse(storedSettings).activeStatus !== false;
    } catch (e) {}
  }
  return true;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    let u = null;

    if (storedUser) {
      try {
        u = JSON.parse(storedUser);
        setUser(u);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      if (u && (u.id || u._id)) {
        const newSocket = io(getSocketUrl(), {
          query: { 
            userId: u.id || u._id,
            activeStatus: getActiveStatusSetting()
          },
        });
        setSocket(newSocket);
      }

      // Fresh user profile fetch to sync edits
      api.get("/auth/me")
        .then((res) => {
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        })
        .catch((err) => {
          console.error("Error fetching fresh user profile:", err);
        });
    }

    setLoading(false);

    // Cross-tab profile sync listener
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch (err) {}
      }
      if (e.key === "token" && !e.newValue) {
        setUser(null);
        if (socket) socket.close();
        setSocket(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (socket) socket.close();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      clearAllCache();
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Connect socket on login
      const newSocket = io(getSocketUrl(), {
        query: { 
          userId: user.id || user._id,
          activeStatus: getActiveStatusSetting()
        },
      });
      setSocket(newSocket);

      toast.success(`Welcome back, ${user.name}!`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const res = await api.post("/auth/register", data);
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Connect socket on register
      const newSocket = io(getSocketUrl(), {
        query: { 
          userId: user.id || user._id,
          activeStatus: getActiveStatusSetting()
        },
      });
      setSocket(newSocket);

      toast.success("Account created successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed");
      throw error;
    }
  };

  const logout = () => {
    clearAllCache();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);

    // Disconnect socket on logout
    if (socket) {
      socket.close();
      setSocket(null);
    }

    toast.success("Logged out successfully");
    window.location.href = "/auth";
  };

  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!socket) {
      setOnlineUsers([]);
      return;
    }

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("force_logout", () => {
      logout();
      toast.error("Your account has been suspended by a moderator.");
    });

    return () => {
      socket.off("online_users");
      socket.off("force_logout");
    };
  }, [socket, logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, socket, onlineUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
