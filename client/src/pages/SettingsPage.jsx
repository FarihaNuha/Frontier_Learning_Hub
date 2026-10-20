import React, { useState, useEffect } from "react";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import api from "../services/api";
import AppNotificationSettings from "../components/AppNotificationSettings";
import { AboutUniCore } from "../components/DeveloperCredits";
import AppUpdates from "../components/AppUpdates";
import { SettingsCard, SettingToggle } from "../components/SettingsPrimitives";
import {
  FiSun,
  FiMoon,
  FiCheck,
  FiShield,
  FiBell,
  FiMail,
  FiInfo,
  FiLock,
  FiSettings,
  FiBookOpen,
  FiUser,
  FiCamera,
  FiUserCheck,
  FiSlash
} from "react-icons/fi";
import "../styles/dashboard.css";
import "../styles/settings.css";

export default function SettingsPage() {
  const { user, setUser, socket } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = [
    { id: "account", title: "Account", icon: FiUser },
    { id: "preferences", title: "Preferences", icon: FiSettings },
    { id: "notifications", title: "Notifications", icon: FiBell },
    ...(user?.role === "teacher" ? [{ id: "teaching", title: "Teaching", icon: FiBookOpen }] : []),
    { id: "about", title: "About", icon: FiInfo },
  ];
  const requested = searchParams.get("section") || (window.location.hash === "#about-unicore" ? "about" : "account");
  const section = categories.some(item => item.id === requested) ? requested : "account";

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
    if (user?.role === "teacher" && section === "teaching") {
      fetchJoinRequests();
      fetchBlockedUsers();
    }
  }, [user?.id, user?._id, user?.role, section]);

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
        setSettings(previous => ({
          ...previous,
          ...parsed,
          emailNotifications: currentEmailNotif,
          contactRequestEmailNotifications: currentContactNotif
        }));
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
    <div className="dashboard-container settings-page">
      {user.role === "teacher" ? <TeacherSidebar currentPage="settings" /> : <StudentSidebar currentPage="settings" />}
      <main className="main-content settings-main">
        <div className="settings-shell">
          <header className="settings-page-heading">
            <span className="settings-eyebrow">YOUR WORKSPACE</span>
            <h1>Settings</h1>
            <p>Manage your account, preferences and app experience.</p>
          </header>
          <div className="settings-layout">
            <nav className="settings-navigation" aria-label="Settings categories">
              {categories.map(({ id, title, icon: Icon }) => <button type="button" key={id} aria-current={section === id ? "page" : undefined} onClick={() => setSearchParams({ section: id }, { replace: true })}><Icon aria-hidden="true" /><span>{title}</span></button>)}
            </nav>
            <div className="settings-panels" key={section}>
              {section === "account" && <SettingsCard title="Your profile" description="Your identity and academic account details." icon={FiUser}>
                <div className="settings-profile-summary">
                  {user.profilePicture ? <img className="settings-avatar" src={user.profilePicture} alt="Your profile" /> : <span className="settings-avatar">{user.name?.trim().charAt(0) || <FiUser />}</span>}
                  <div><h3>{user.name}</h3><p>{user.email}</p><span className="settings-role">{user.role}</span></div>
                  {!isEditingProfile && <button type="button" className="settings-button settings-button-secondary" onClick={() => setIsEditingProfile(true)}>Edit profile</button>}
                </div>
                {isEditingProfile ? <form className="settings-profile-form" onSubmit={event => { event.preventDefault(); handleSaveProfile(); }}>
                  <div className="settings-photo-editor">
                    {editPic && <img className="settings-avatar" src={editPic} alt="Profile preview" />}
                    <div><label className="settings-button settings-button-secondary" htmlFor="profile-upload-input"><FiCamera aria-hidden="true" /> Change photo</label><input className="settings-file-input" id="profile-upload-input" type="file" accept="image/*" onChange={handleProfilePictureChange} /><p>Image files, up to 2 MB.</p></div>
                    {editPic && <button type="button" className="settings-text-button" onClick={() => setEditPic("")}>Remove photo</button>}
                  </div>
                  <div className="settings-form-grid">
                    <div><label htmlFor="settings-name">Full name</label><input id="settings-name" value={editName} disabled={user.role === "student"} onChange={event => setEditName(event.target.value)} required /></div>
                    <div><label htmlFor="settings-department">Department</label><select id="settings-department" value={editDept} disabled={user.role === "student"} onChange={event => setEditDept(event.target.value)}>{["EDTE", "IRE", "Software", "Cyber", "DataScience", "General"].map(dept => <option key={dept}>{dept}</option>)}</select></div>
                    {user.role === "student" && <div><label htmlFor="settings-student-id">Student ID</label><input id="settings-student-id" value={editStudentId} disabled /></div>}
                  </div>
                  {user.role === "student" && <p className="settings-help"><FiLock aria-hidden="true" /> Your name, student ID and department are managed by the administrator.</p>}
                  <div className="settings-actions"><button className="settings-button settings-button-primary" type="submit" disabled={isSavingProfile}>{isSavingProfile ? "Saving…" : "Save profile"}</button><button className="settings-button settings-button-secondary" type="button" disabled={isSavingProfile} onClick={() => { setIsEditingProfile(false); setEditName(user.name || ""); setEditStudentId(user.studentId || ""); setEditDept(user.department || "EDTE"); setEditPic(user.profilePicture || ""); }}>Cancel</button></div>
                </form> : <dl className="settings-account-details">
                  <div><dt>Email address</dt><dd>{user.email || "Not provided"}</dd></div>
                  {user.role === "student" && <div><dt>Student ID</dt><dd>{user.studentId || "Not provided"}</dd></div>}
                  <div><dt>Department</dt><dd>{user.department || "Not provided"}</dd></div>
                  <div><dt>Account type</dt><dd className="settings-capitalize">{user.role}</dd></div>
                </dl>}
              </SettingsCard>}

              {section === "preferences" && <>
                <SettingsCard title="Appearance" description="Choose a comfortable look for this device." icon={FiSun}>
                  <div className="settings-theme-options" role="group" aria-label="App theme">
                    {[{ dark: false, title: "Light", description: "Bright and clear", icon: FiSun }, { dark: true, title: "Dark", description: "Easy on the eyes", icon: FiMoon }].map(({ dark, title, description, icon: Icon }) => <button type="button" key={title} className={`settings-theme-option ${isDarkMode === dark ? "is-selected" : ""}`} aria-pressed={isDarkMode === dark} onClick={() => handleThemeChange(dark)}><span className={`settings-theme-preview ${dark ? "is-dark" : ""}`}><i /><i /><i /></span><span className="settings-theme-label"><Icon aria-hidden="true" /><strong>{title}</strong>{isDarkMode === dark && <FiCheck aria-label="Selected" />}</span><span>{description}</span></button>)}
                  </div>
                </SettingsCard>
                <SettingsCard title="Privacy & visibility" description="Control how you appear in your community." icon={FiShield}>
                  <SettingToggle title="Show active status" description="Let people see when you are online." checked={settings.activeStatus} onChange={() => handleToggle("activeStatus")} />
                  {user.role === "student" && <SettingToggle title="Show email to classmates" description="Allow classmates to see your email in chat and class lists." checked={settings.allowClassmatesToSeeEmail} onChange={() => handleToggle("allowClassmatesToSeeEmail")} />}
                  <div className="settings-card-footer"><button type="button" className="settings-button settings-button-primary" onClick={handleSaveSettings}>Save preferences</button></div>
                </SettingsCard>
              </>}

              {section === "notifications" && <>
                <SettingsCard title="Email notifications" description="Choose which updates arrive in your inbox." icon={FiMail}>
                  <SettingToggle title="Community & message emails" description="Posts, announcements and direct messages." checked={settings.emailNotifications} onChange={() => handleToggle("emailNotifications")} />
                  {user.role === "teacher" && <SettingToggle title="Student contact requests" description="Email alerts when a student requests a meeting or consultation." checked={settings.contactRequestEmailNotifications} onChange={() => handleToggle("contactRequestEmailNotifications")} />}
                  {user.role === "student" && <p className="settings-help">Teacher contact-request responses are always sent to your email.</p>}
                </SettingsCard>
                <AppNotificationSettings />
              </>}

              {section === "teaching" && user.role === "teacher" && <>
                <SettingsCard title="Teaching preferences" description="Manage your course approval and assessment preferences." icon={FiBookOpen}>
                  <SettingToggle title="Auto-approve course join requests" description="Automatically approve students joining your courses." checked={settings.autoApproveJoinRequests} onChange={() => handleToggle("autoApproveJoinRequests")} />
                  <SettingToggle title="Auto-release exam marks" description="Publish MCQ marks after the exam deadline." checked={settings.autoReleaseMarks} onChange={() => handleToggle("autoReleaseMarks")} />
                  <div className="settings-card-footer"><button type="button" className="settings-button settings-button-primary" onClick={handleSaveSettings}>Save preferences</button></div>
                </SettingsCard>
                <SettingsCard title="Course join requests" description="Review requests from students using non-institutional email addresses." icon={FiUserCheck}>
                  {loadingRequests ? <p className="settings-empty" role="status">Loading requests…</p> : !joinRequests.length ? <p className="settings-empty"><FiCheck aria-hidden="true" /> No pending join requests.</p> : <ul className="settings-people-list">{joinRequests.map(req => <li key={req._id}><div><strong>{req.student?.name}</strong><p>{req.student?.email}</p><small>{req.student?.studentId || "No student ID"} · {req.student?.department}</small><p className="settings-course-label">{req.course?.name} ({req.course?.displayCode})</p></div><div className="settings-actions"><button type="button" className="settings-button settings-button-primary" onClick={() => handleRequestAction(req._id, "approve")}>Approve</button><button type="button" className="settings-button settings-button-danger" onClick={() => handleRequestAction(req._id, "reject")}>Reject</button></div></li>)}</ul>}
                </SettingsCard>
                <SettingsCard title="Suspended students" description="Review students with suspended access." icon={FiSlash}>
                  {loadingBlocked ? <p className="settings-empty" role="status">Loading students…</p> : !blockedUsers.length ? <p className="settings-empty"><FiShield aria-hidden="true" /> No suspended students.</p> : <ul className="settings-people-list">{blockedUsers.map(person => <li key={person._id}><div><strong>{person.name}</strong><p>{person.email}</p><small>{person.studentId || "No student ID"} · {person.department}</small></div><button type="button" className="settings-button settings-button-secondary" onClick={() => handleUnblockUser(person._id, person.name)}>Restore access</button></li>)}</ul>}
                </SettingsCard>
              </>}
              {section === "about" && <><AboutUniCore /><AppUpdates /></>}
            </div>
          </div>
          <footer className="settings-page-footer">UniCore <span>Learning, connected.</span></footer>
        </div>
      </main>
    </div>
  );
}
