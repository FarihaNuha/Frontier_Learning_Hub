import React, { useState, useEffect } from "react";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import api from "../services/api";
import {
  FiArrowLeft,
  FiSun,
  FiMoon,
  FiCheck,
  FiShield,
  FiMail,
  FiSliders,
  FiEye,
  FiLock,
  FiSettings,
  FiBook,
  FiMessageSquare,
  FiBookOpen,
  FiLogOut,
  FiUser,
  FiCamera,
  FiX,
  FiUserCheck,
  FiSlash
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function SettingsPage() {
  const { user, setUser, logout, socket } = useAuth();
  const navigate = useNavigate();

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editStudentId, setEditStudentId] = useState(user?.studentId || "");
  const [editDept, setEditDept] = useState(user?.department || "EDTE");
  const [editPic, setEditPic] = useState(user?.profilePicture || "");
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Sync editing fields when user loads/changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditStudentId(user.studentId || "");
      setEditDept(user.department || "EDTE");
      setEditPic(user.profilePicture || "");
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "teacher") {
      fetchJoinRequests();
      fetchBlockedUsers();
    }
  }, [user]);

  const fetchJoinRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get("/courses/join-requests");
      setJoinRequests(res.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch join requests", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      const res = await api.post(`/courses/join-requests/${requestId}/action`, { action });
      toast.success(res.data.message);
      setJoinRequests((prev) => prev.filter((req) => req._id !== requestId));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process request.");
    }
  };

  const fetchBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const res = await api.get("/auth/blocked-users");
      setBlockedUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch blocked users", err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblockUser = async (userId, name) => {
    try {
      const res = await api.post(`/auth/users/${userId}/unblock`);
      toast.success(res.data.message);
      setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to unblock user ${name}.`);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Profile picture size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await api.put("/auth/profile", {
        name: editName,
        studentId: user?.role === "student" ? editStudentId : undefined,
        department: editDept,
        profilePicture: editPic
      });

      const updatedUser = {
        ...user,
        name: res.data.user.name,
        department: res.data.user.department,
        studentId: res.data.user.studentId,
        profilePicture: res.data.user.profilePicture
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Profile updated successfully!");
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Save profile error:", error);
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(
    document.body.classList.contains("dark-theme")
  );

  const [settings, setSettings] = useState({
    // General
    emailNotifications: user?.emailNotifications !== false,
    contactRequestEmailNotifications: user?.contactRequestEmailNotifications !== false,
    activeStatus: true,
    
    // Teacher specific
    autoApproveJoinRequests: false,
    autoReleaseMarks: true,
    allowStudentProfileViewing: true,

    // Student specific
    shareMarksheetWithClassmates: false,
    allowClassmatesToSeeEmail: true
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("theme") === "dark";
    setIsDarkMode(savedDarkMode);

    const savedSettings = localStorage.getItem("user_settings");
    let currentEmailNotif = user?.emailNotifications !== false;
    let currentContactNotif = user?.contactRequestEmailNotifications !== false;
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (typeof parsed.emailNotifications === "boolean") {
          currentEmailNotif = parsed.emailNotifications;
        }
        if (typeof parsed.contactRequestEmailNotifications === "boolean") {
          currentContactNotif = parsed.contactRequestEmailNotifications;
        }
        setSettings({
          ...parsed,
          emailNotifications: currentEmailNotif,
          contactRequestEmailNotifications: currentContactNotif
        });
        return;
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setSettings((prev) => ({
      ...prev,
      emailNotifications: currentEmailNotif,
      contactRequestEmailNotifications: currentContactNotif
    }));
  }, [user]);

  if (!user) return null;

  // Toggle Theme
  const handleThemeChange = (dark) => {
    setIsDarkMode(dark);
    if (dark) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
    toast.success(`${dark ? "Dark Mode" : "Light Mode"} activated!`);
  };

  // Toggle individual setting
  const handleToggle = async (key) => {
    const newValue = !settings[key];
    const updated = {
      ...settings,
      [key]: newValue
    };
    setSettings(updated);
    localStorage.setItem("user_settings", JSON.stringify(updated));

    if (key === "emailNotifications" || key === "contactRequestEmailNotifications") {
      try {
        const payload = {
          [key]: newValue
        };
        const res = await api.put("/auth/profile", payload);
        const updatedUser = {
          ...user,
          ...res.data.user
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        const label = key === "contactRequestEmailNotifications" ? "Contact request email alerts" : "Community & message email notifications";
        toast.success(`${label} turned ${newValue ? "ON" : "OFF"}`);
      } catch (err) {
        console.error("Failed to update notification preference", err);
      }
    }

    if (key === "activeStatus" && socket) {
      socket.emit("update_active_status", { activeStatus: newValue });
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      localStorage.setItem("user_settings", JSON.stringify(settings));

      // Persist to backend database
      const res = await api.put("/auth/profile", {
        emailNotifications: settings.emailNotifications
      });

      // Update AuthContext & LocalStorage User object
      const updatedUser = {
        ...user,
        emailNotifications: res.data.user.emailNotifications
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Settings saved successfully!");
    } catch (err) {
      console.error("Save settings error:", err);
      toast.error(err.response?.data?.error || "Failed to save settings on server.");
    }
  };

  return (
    <div className="dashboard-container">
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="settings" />
      ) : (
        <StudentSidebar currentPage="settings" />
      )}

      {/* Main settings area */}
      <div className="main-content" style={{ padding: "40px", overflowY: "auto" }}>
        <div style={{ marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
          <FiSettings size={28} color="var(--pastel-blue-deep)" />
          <h1 style={{ fontSize: "28px", color: "var(--text-dark)", margin: 0 }}>System Settings</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "30px", maxWidth: "1200px" }}>
          
          {/* Theme Switcher section */}
          <div className="dashboard-card" style={{ padding: "24px", borderRadius: "16px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiSun size={18} /> Appearance & Theme
            </h3>
            <p style={{ color: "var(--text-gray)", fontSize: "14px", marginBottom: "20px" }}>
              Choose how you want the website interface to look on your device.
            </p>

            <div style={{ display: "flex", gap: "16px" }}>
              {/* Light Mode Selector Card */}
              <div
                onClick={() => handleThemeChange(false)}
                style={{
                  flex: 1,
                  padding: "20px",
                  borderRadius: "12px",
                  border: `2px solid ${!isDarkMode ? "var(--pastel-blue-deep)" : "var(--border-light)"}`,
                  background: !isDarkMode ? "var(--pastel-blue-light)" : "var(--bg-white)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease"
                }}
              >
                <FiSun size={28} color={!isDarkMode ? "var(--pastel-blue-deep)" : "#64748b"} style={{ marginBottom: "10px" }} />
                <h4 style={{ color: "var(--text-dark)", margin: "0 0 4px 0" }}>Light Theme</h4>
                <span style={{ fontSize: "11px", color: "var(--text-gray)" }}>Default Bright Mode</span>
              </div>

              {/* Dark Mode Selector Card */}
              <div
                onClick={() => handleThemeChange(true)}
                style={{
                  flex: 1,
                  padding: "20px",
                  borderRadius: "12px",
                  border: `2px solid ${isDarkMode ? "var(--pastel-blue-primary)" : "var(--border-light)"}`,
                  background: isDarkMode ? "#1e293b" : "var(--bg-white)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease"
                }}
              >
                <FiMoon size={28} color={isDarkMode ? "var(--pastel-blue-primary)" : "#64748b"} style={{ marginBottom: "10px" }} />
                <h4 style={{ color: isDarkMode ? "#f8fafc" : "var(--text-dark)", margin: "0 0 4px 0" }}>Dark Theme</h4>
                <span style={{ fontSize: "11px", color: "var(--text-gray)" }}>Eye-Friendly Night Mode</span>
              </div>
            </div>
          </div>

          {/* Role-based Permissions & Privacy section */}
          <div className="dashboard-card" style={{ padding: "24px", borderRadius: "16px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiShield size={18} /> Privacy & Permissions
            </h3>
            <p style={{ color: "var(--text-gray)", fontSize: "14px", marginBottom: "20px" }}>
              Configure your sharing preferences and permission approvals.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Notification Toggles */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <strong style={{ color: "var(--text-dark)", display: "block" }}>Community & Direct Message Emails</strong>
                  <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>
                    Receive email notifications for community posts, announcements, and direct messages
                  </span>
                  {user?.role === "student" && (
                    <span style={{ fontSize: "11px", color: "#3B8DB3", display: "block", marginTop: "4px", fontWeight: 500 }}>
                      ℹ️ Note: Teacher contact request responses (Approvals / Declines) will always be sent to your email.
                    </span>
                  )}
                </div>
                <label className="toggle-switch-wrapper" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={() => handleToggle("emailNotifications")}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="toggle-switch-slider" style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: settings.emailNotifications ? "var(--success)" : "#cbd5e1",
                    transition: "0.4s",
                    borderRadius: "34px"
                  }}>
                    <span style={{
                      position: "absolute",
                      content: "",
                      height: "18px", width: "18px",
                      left: settings.emailNotifications ? "28px" : "4px",
                      bottom: "4px",
                      backgroundColor: "white",
                      transition: "0.4s",
                      borderRadius: "50%"
                    }} />
                  </span>
                </label>
              </div>

              {user?.role === "teacher" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <strong style={{ color: "var(--text-dark)", display: "block" }}>Student Contact Request Emails</strong>
                    <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>
                      Receive email alerts when students submit a 1-on-1 contact consultation request
                    </span>
                  </div>
                  <label className="toggle-switch-wrapper" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px", flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={settings.contactRequestEmailNotifications}
                      onChange={() => handleToggle("contactRequestEmailNotifications")}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className="toggle-switch-slider" style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: settings.contactRequestEmailNotifications ? "var(--success)" : "#cbd5e1",
                      transition: "0.4s",
                      borderRadius: "34px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: "",
                        height: "18px", width: "18px",
                        left: settings.contactRequestEmailNotifications ? "28px" : "4px",
                        bottom: "4px",
                        backgroundColor: "white",
                        transition: "0.4s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <strong style={{ color: "var(--text-dark)", display: "block" }}>Display Active Status</strong>
                  <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>Show other users when you are online in the community hub</span>
                </div>
                <label className="toggle-switch-wrapper" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px" }}>
                  <input
                    type="checkbox"
                    checked={settings.activeStatus}
                    onChange={() => handleToggle("activeStatus")}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="toggle-switch-slider" style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: settings.activeStatus ? "var(--success)" : "#cbd5e1",
                    transition: "0.4s",
                    borderRadius: "34px"
                  }}>
                    <span style={{
                      position: "absolute",
                      content: "",
                      height: "18px", width: "18px",
                      left: settings.activeStatus ? "28px" : "4px",
                      bottom: "4px",
                      backgroundColor: "white",
                      transition: "0.4s",
                      borderRadius: "50%"
                    }} />
                  </span>
                </label>
              </div>

              {/* Teacher Only Options */}
              {user?.role === "teacher" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <div>
                      <strong style={{ color: "var(--text-dark)", display: "block" }}>Auto-Approve Course Join Requests</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>Automatically approve students registering or enrolling in your courses</span>
                    </div>
                    <label className="toggle-switch-wrapper" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px" }}>
                      <input
                        type="checkbox"
                        checked={settings.autoApproveJoinRequests}
                        onChange={() => handleToggle("autoApproveJoinRequests")}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="toggle-switch-slider" style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: settings.autoApproveJoinRequests ? "var(--success)" : "#cbd5e1",
                        transition: "0.4s",
                        borderRadius: "34px"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: "",
                          height: "18px", width: "18px",
                          left: settings.autoApproveJoinRequests ? "28px" : "4px",
                          bottom: "4px",
                          backgroundColor: "white",
                          transition: "0.4s",
                          borderRadius: "50%"
                        }} />
                      </span>
                    </label>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <div>
                      <strong style={{ color: "var(--text-dark)", display: "block" }}>Auto-Release Exam Marks</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>Automatically publish students' MCQ exam marks immediately after deadline passes</span>
                    </div>
                    <label className="toggle-switch-wrapper" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px" }}>
                      <input
                        type="checkbox"
                        checked={settings.autoReleaseMarks}
                        onChange={() => handleToggle("autoReleaseMarks")}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="toggle-switch-slider" style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: settings.autoReleaseMarks ? "var(--success)" : "#cbd5e1",
                        transition: "0.4s",
                        borderRadius: "34px"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: "",
                          height: "18px", width: "18px",
                          left: settings.autoReleaseMarks ? "28px" : "4px",
                          bottom: "4px",
                          backgroundColor: "white",
                          transition: "0.4s",
                          borderRadius: "50%"
                        }} />
                      </span>
                    </label>
                  </div>
                </>
              )}

              {/* Student Only Options */}
              {user?.role === "student" && (
                <>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <div>
                      <strong style={{ color: "var(--text-dark)", display: "block" }}>Allow Peers to View Email</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-gray)" }}>Permit classmates to see your email address under chat search or class rosters</span>
                    </div>
                    <label className="toggle-switch-wrapper" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px" }}>
                      <input
                        type="checkbox"
                        checked={settings.allowClassmatesToSeeEmail}
                        onChange={() => handleToggle("allowClassmatesToSeeEmail")}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className="toggle-switch-slider" style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: settings.allowClassmatesToSeeEmail ? "var(--success)" : "#cbd5e1",
                        transition: "0.4s",
                        borderRadius: "34px"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: "",
                          height: "18px", width: "18px",
                          left: settings.allowClassmatesToSeeEmail ? "28px" : "4px",
                          bottom: "4px",
                          backgroundColor: "white",
                          transition: "0.4s",
                          borderRadius: "50%"
                        }} />
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-primary"
                onClick={handleSaveSettings}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                <FiCheck size={16} /> Save Preferences
              </button>
            </div>
          </div>

          {/* Join Requests section (Teacher only) */}
          {user?.role === "teacher" && (
            <div className="dashboard-card" style={{ padding: "24px", borderRadius: "16px" }}>
              <h3 style={{ marginBottom: "16px", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiUserCheck size={18} /> Pending Course Join Requests
              </h3>
              <p style={{ color: "var(--text-gray)", fontSize: "14px", marginBottom: "20px" }}>
                Review and approve students who requested to join your courses with non-institutional email domains.
              </p>

              {loadingRequests ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto" }}></div>
                </div>
              ) : joinRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", background: "var(--bg-light)", border: "1px dashed var(--border-light)", borderRadius: "12px", color: "var(--text-gray)" }}>
                  No pending join requests found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {joinRequests.map((req) => (
                    <div 
                      key={req._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        background: "var(--bg-light)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "12px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.01)"
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--text-dark)", fontSize: "15px", display: "block" }}>{req.student?.name}</strong>
                        <span style={{ fontSize: "12px", color: "var(--text-gray)", display: "block" }}>{req.student?.email} • ID: {req.student?.studentId || "N/A"} • {req.student?.department}</span>
                        <div style={{ marginTop: "6px", display: "inline-block", padding: "4px 8px", background: "var(--pastel-blue-light)", color: "var(--pastel-blue-deep)", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>
                          Course: {req.course?.name} ({req.course?.displayCode})
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleRequestAction(req._id, "approve")}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "background-color 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#059669"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#10b981"}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(req._id, "reject")}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "transparent",
                            color: "#ef4444",
                            border: "1px solid #ef4444",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suspended Students section (Teacher only) */}
          {user?.role === "teacher" && (
            <div className="dashboard-card" style={{ padding: "24px", borderRadius: "16px" }}>
              <h3 style={{ marginBottom: "16px", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiSlash size={18} color="#ef4444" /> Suspended Students
              </h3>
              <p style={{ color: "var(--text-gray)", fontSize: "14px", marginBottom: "20px" }}>
                Review and lift suspensions for students who were blocked from accessing Moodle.
              </p>

              {loadingBlocked ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto" }}></div>
                </div>
              ) : blockedUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", background: "var(--bg-light)", border: "1px dashed var(--border-light)", borderRadius: "12px", color: "var(--text-gray)" }}>
                  No suspended students found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {blockedUsers.map((u) => (
                    <div 
                      key={u._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px",
                        background: "var(--bg-light)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "12px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.01)"
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--text-dark)", fontSize: "15px", display: "block" }}>{u.name}</strong>
                        <span style={{ fontSize: "12px", color: "var(--text-gray)", display: "block" }}>{u.email} • ID: {u.studentId || "N/A"} • {u.department}</span>
                      </div>
                      <div>
                        <button
                          onClick={() => handleUnblockUser(u._id, u.name)}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--pastel-blue-deep)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "background-color 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--pastel-blue-hover, #2c7295)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--pastel-blue-deep)"}
                        >
                          Unblock User
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account Profile details */}
          <div className="dashboard-card" style={{ padding: "28px", borderRadius: "16px", boxShadow: "var(--shadow-md)" }}>
            <h3 style={{ marginBottom: "24px", color: "var(--text-dark)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "20px", fontWeight: "600" }}>
              <FiLock size={20} color="var(--pastel-blue-deep)" /> {isEditingProfile ? "Edit Profile" : "Account Details"}
            </h3>

            {isEditingProfile ? (
              // EDIT MODE
              <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
                
                {/* Photo Upload Section */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div style={{ position: "relative", cursor: "pointer" }} onClick={() => document.getElementById("profile-upload-input").click()}>
                    {editPic ? (
                      <img 
                        src={editPic} 
                        alt="Preview" 
                        style={{ width: "110px", height: "110px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--pastel-blue-deep)" }} 
                      />
                    ) : (
                      <div style={{ width: "110px", height: "110px", borderRadius: "50%", background: "var(--bg-light)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FiUser size={54} color="#6c8ba0" />
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "var(--pastel-blue-deep)", borderRadius: "50%", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                      <FiCamera size={14} color="#ffffff" />
                    </div>
                  </div>
                  <input 
                    id="profile-upload-input"
                    type="file" 
                    accept="image/*" 
                    onChange={handleProfilePictureChange} 
                    style={{ display: "none" }} 
                  />
                  <div style={{ fontSize: "12px", color: "var(--text-gray)" }}>Click camera icon to upload photo (Max 2MB)</div>
                  {editPic && (
                    <button 
                      onClick={() => setEditPic("")} 
                      style={{ padding: "4px 10px", borderRadius: "6px", background: "none", border: "1px solid var(--error)", color: "var(--error)", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <FiX size={12} /> Remove Photo
                    </button>
                  )}
                </div>

                {/* Grid Inputs */}
                <div className="profile-info-grid">
                  <div>
                    <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "6px", fontWeight: "600" }}>Full Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => user?.role !== "student" && setEditName(e.target.value)}
                      readOnly={user?.role === "student"}
                      disabled={user?.role === "student"}
                      placeholder="Enter full name"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid var(--border-light)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: user?.role === "student" ? "#f1f5f9" : "var(--bg-white)",
                        color: user?.role === "student" ? "#64748b" : "var(--text-dark)",
                        cursor: user?.role === "student" ? "not-allowed" : "auto",
                        outline: "none"
                      }}
                    />
                    {user?.role === "student" && <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}><FiLock size={11} /> Fixed by Admin</span>}
                  </div>

                  <div>
                    <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "6px", fontWeight: "600" }}>Department</label>
                    <select 
                      value={editDept}
                      onChange={(e) => user?.role !== "student" && setEditDept(e.target.value)}
                      disabled={user?.role === "student"}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid var(--border-light)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: user?.role === "student" ? "#f1f5f9" : "var(--bg-white)",
                        color: user?.role === "student" ? "#64748b" : "var(--text-dark)",
                        cursor: user?.role === "student" ? "not-allowed" : "auto",
                        outline: "none"
                      }}
                    >
                      <option value="EDTE">EDTE</option>
                      <option value="IRE">IRE</option>
                      <option value="Software">Software</option>
                      <option value="Cyber">Cyber</option>
                      <option value="DataScience">DataScience</option>
                      <option value="General">General</option>
                    </select>
                    {user?.role === "student" && <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}><FiLock size={11} /> Fixed by Admin</span>}
                  </div>

                  {user?.role === "student" && (
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "6px", fontWeight: "600" }}>Student ID</label>
                      <input 
                        type="text" 
                        value={editStudentId}
                        onChange={(e) => setEditStudentId(e.target.value)}
                        readOnly={true}
                        disabled={true}
                        placeholder="Enter student ID"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: "1px solid var(--border-light)",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: "#f1f5f9",
                          color: "#64748b",
                          cursor: "not-allowed",
                          outline: "none"
                        }}
                      />
                      <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}><FiLock size={11} /> Fixed by Admin</span>
                    </div>
                  )}
                </div>

                {/* Save and Cancel buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px" }}>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    style={{ 
                      padding: "10px 24px", 
                      borderRadius: "8px", 
                      background: "var(--pastel-blue-deep)", 
                      color: "#ffffff", 
                      border: "none", 
                      fontWeight: "600", 
                      cursor: "pointer", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      opacity: isSavingProfile ? 0.7 : 1
                    }}
                  >
                    <FiCheck size={16} /> {isSavingProfile ? "Saving..." : "Save Profile"}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingProfile(false);
                      // Reset to current user values
                      setEditName(user?.name || "");
                      setEditStudentId(user?.studentId || "");
                      setEditDept(user?.department || "EDTE");
                      setEditPic(user?.profilePicture || "");
                    }}
                    style={{ 
                      padding: "10px 24px", 
                      borderRadius: "8px", 
                      background: "none", 
                      color: "var(--text-gray)", 
                      border: "1px solid var(--border-light)", 
                      fontWeight: "600", 
                      cursor: "pointer" 
                    }}
                  >
                    Cancel
                  </button>
                </div>

              </div>
            ) : (
              // READ-ONLY VIEW
              <>
                {/* Centered Photo & ID Header */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
                  {user?.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt="Profile" 
                      style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--pastel-blue-deep)", boxShadow: "var(--shadow-md)", marginBottom: "12px" }} 
                    />
                  ) : (
                    <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "var(--bg-light)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                      <FiUser size={48} color="#6c8ba0" />
                    </div>
                  )}
                  {user?.studentId && (
                    <div style={{ fontSize: "14px", color: "var(--pastel-blue-deep)", fontWeight: "600", background: "var(--pastel-blue-soft)", padding: "4px 12px", borderRadius: "12px" }}>
                      Student ID: {user.studentId}
                    </div>
                  )}
                </div>

                <div className="profile-info-grid" style={{ fontSize: "14px" }}>
                  
                  {/* Full Name */}
                  <div 
                    style={{ 
                      transition: "all 0.3s ease",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "var(--bg-info-card)",
                      border: "1px solid var(--border-info-card)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "var(--pastel-blue-deep)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(59, 141, 179, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "var(--border-info-card)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                    }}
                  >
                    <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "8px", textAlign: "center", fontWeight: "600" }}>Full Name</label>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "10px", 
                      padding: "10px 14px", 
                      background: "var(--gradient-card-box)", 
                      border: "1px solid var(--border-card-box)", 
                      borderRadius: "8px", 
                      color: "var(--text-dark)", 
                      fontWeight: "500",
                      textAlign: "center" 
                    }}>
                      <FiUser size={16} color="var(--pastel-blue-deep)" />
                      <span>{user?.name}</span>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div 
                    style={{ 
                      transition: "all 0.3s ease",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "var(--bg-info-card)",
                      border: "1px solid var(--border-info-card)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "var(--pastel-blue-deep)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(59, 141, 179, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "var(--border-info-card)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                    }}
                  >
                    <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "8px", textAlign: "center", fontWeight: "600" }}>Email Address</label>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "10px", 
                      padding: "10px 14px", 
                      background: "var(--gradient-card-box)", 
                      border: "1px solid var(--border-card-box)", 
                      borderRadius: "8px", 
                      color: "var(--text-dark)", 
                      fontWeight: "500",
                      textAlign: "center" 
                    }}>
                      <FiMail size={16} color="var(--pastel-blue-deep)" />
                      <span>{user?.email}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <div 
                    style={{ 
                      transition: "all 0.3s ease",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "var(--bg-info-card)",
                      border: "1px solid var(--border-info-card)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "var(--pastel-blue-deep)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(59, 141, 179, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "var(--border-info-card)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                    }}
                  >
                    <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "8px", textAlign: "center", fontWeight: "600" }}>Role</label>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "10px", 
                      padding: "10px 14px", 
                      background: "var(--gradient-card-box)", 
                      border: "1px solid var(--border-card-box)", 
                      borderRadius: "8px", 
                      color: "var(--text-dark)", 
                      fontWeight: "500",
                      textTransform: "capitalize",
                      textAlign: "center" 
                    }}>
                      <FiShield size={16} color="var(--pastel-blue-deep)" />
                      <span>{user?.role}</span>
                    </div>
                  </div>

                  {/* Department */}
                  <div 
                    style={{ 
                      transition: "all 0.3s ease",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "var(--bg-info-card)",
                      border: "1px solid var(--border-info-card)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "var(--pastel-blue-deep)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(59, 141, 179, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "var(--border-info-card)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                    }}
                  >
                    <label style={{ display: "block", color: "var(--text-gray)", marginBottom: "8px", textAlign: "center", fontWeight: "600" }}>Department</label>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "10px", 
                      padding: "10px 14px", 
                      background: "var(--gradient-card-box)", 
                      border: "1px solid var(--border-card-box)", 
                      borderRadius: "8px", 
                      color: "var(--text-dark)", 
                      fontWeight: "500",
                      textAlign: "center" 
                    }}>
                      <FiBookOpen size={16} color="var(--pastel-blue-deep)" />
                      <span>{user?.department}</span>
                    </div>
                  </div>

                </div>

                <button 
                  onClick={() => setIsEditingProfile(true)}
                  style={{ 
                    padding: "10px 24px", 
                    borderRadius: "8px", 
                    border: "1px solid var(--pastel-blue-deep)", 
                    background: "none", 
                    color: "var(--pastel-blue-deep)", 
                    cursor: "pointer", 
                    display: "block", 
                    margin: "24px auto 0 auto", 
                    fontWeight: "600", 
                    transition: "all 0.2s" 
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pastel-blue-light)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
