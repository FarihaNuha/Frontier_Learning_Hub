import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiAward,
  FiAlertCircle,
  FiSend,
  FiDownload,
  FiFilter,
  FiSearch,
  FiEye,
  FiX,
  FiBell,
  FiCpu,
  FiClock,
} from "react-icons/fi";
import "../styles/dashboard.css";

const formatLevel = (lvl) => {
  if (!lvl) return "Level";
  const str = String(lvl).trim();
  if (str.toLowerCase().startsWith("level")) return str;
  return `Level ${str}`;
};

const formatTerm = (trm) => {
  if (!trm) return "Term";
  const str = String(trm).trim();
  if (str.toLowerCase().startsWith("term")) return str;
  return `Term ${str}`;
};

export default function AdminResultManagementPage() {
  const [uploads, setUploads] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultTypeTab, setResultTypeTab] = useState("Final"); // "Midterm" or "Final"
  const [viewTab, setViewTab] = useState("batches"); // "batches", "schedules", "cgpa"
  const [activeTab, setActiveTab] = useState("all");

  const [sessionFilter, setSessionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  const [viewBatch, setViewBatch] = useState(null);
  const [correctionModalBatch, setCorrectionModalBatch] = useState(null);
  const [correctionComment, setCorrectionComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // Notice & Deadline Modal State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTarget, setNoticeTarget] = useState("Teachers"); // "Teachers" or "Students"
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");

  // Teacher Reminder Modal State
  const [reminderModalBatch, setReminderModalBatch] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  const handleOpenReminderModal = (batch) => {
    setReminderModalBatch(batch);
    setReminderMessage(
      `Dear ${batch.teacherName || "Course Teacher"},\n\nThis is an urgent reminder that your ${resultTypeTab} result marksheet for ${batch.courseCode} (${batch.courseTitle}) for ${batch.level} ${batch.term} (Session: ${batch.session}) has not been uploaded/submitted yet.\n\nPlease upload the marksheet as soon as possible.`
    );
  };

  const handleSendReminderSubmit = async (e) => {
    e.preventDefault();
    if (!reminderModalBatch) return;
    if (!reminderModalBatch.teacherEmail) {
      toast.error("No teacher email associated with this course.");
      return;
    }
    setSendingReminder(true);
    try {
      await api.post("/results/admin/send-teacher-reminder", {
        teacherEmail: reminderModalBatch.teacherEmail,
        courseCode: reminderModalBatch.courseCode,
        courseTitle: reminderModalBatch.courseTitle,
        session: reminderModalBatch.session,
        level: reminderModalBatch.level,
        term: reminderModalBatch.term,
        resultType: resultTypeTab,
        message: reminderMessage,
      });
      toast.success(`Reminder notice & email sent to ${reminderModalBatch.teacherName || reminderModalBatch.teacherEmail}!`);
      setReminderModalBatch(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send reminder notice.");
    } finally {
      setSendingReminder(false);
    }
  };

  // CGPA Calculation State
  const [calcSession, setCalcSession] = useState("2023-24");
  const [calcLevel, setCalcLevel] = useState("Level-1");
  const [calcTerm, setCalcTerm] = useState("Term-1");
  const [calcSummary, setCalcSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Automated Publication Schedule State
  const [schedSession, setSchedSession] = useState("2023-24");
  const [schedLevel, setSchedLevel] = useState("Level-1");
  const [schedTerm, setSchedTerm] = useState("Term-1");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [cutoffInput, setCutoffInput] = useState("");
  const [dlSession, setDlSession] = useState("2023-24");
  const [dlLevel, setDlLevel] = useState("Level-1");
  const [dlTerm, setDlTerm] = useState("Term-1");
  const [savingDeadline, setSavingDeadline] = useState(false);

  const handleSaveCutoffDeadline = async () => {
    if (!cutoffInput) {
      toast.error("Please select a valid deadline date and time.");
      return;
    }
    setSavingDeadline(true);
    const deadlineStr = new Date(cutoffInput).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    const currentType = resultTypeTab === "Midterm" ? "Midterm" : "Final";
    try {
      await api.post("/results/admin/notice", {
        noticeTitle: `${currentType} Result Submission Cutoff — ${dlSession} ${dlLevel} ${dlTerm}`,
        noticeContent: `All course teachers assigned to ${dlLevel} ${dlTerm} (Session: ${dlSession}) must upload and submit ${currentType} result marksheets by ${deadlineStr}.`,
        targetAudience: "Teachers",
        deadlineDate: cutoffInput,
        resultType: currentType,
        session: dlSession,
        level: dlLevel,
        term: dlTerm,
      });
      toast.success(`${currentType} Cutoff Deadline saved for ${dlLevel} ${dlTerm} (${dlSession})!`);
      setCutoffInput("");
      fetchAdminResults();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save deadline.");
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm("Remove this deadline / schedule record from calendar?")) return;
    try {
      await api.delete(`/notices/${noticeId}`);
      toast.success("Deadline / Schedule record removed!");
      fetchAdminResults();
    } catch (err) {
      toast.error("Failed to remove deadline record.");
    }
  };

  const handleSchedulePublication = async () => {
    if (!scheduledDateTime) {
      toast.error("Please pick a scheduled publication date and time.");
      return;
    }

    setScheduling(true);
    try {
      const res = await api.post("/results/admin/schedule-publication", {
        session: schedSession,
        level: schedLevel,
        term: schedTerm,
        scheduledPublishDate: scheduledDateTime,
      });
      toast.success(res.data.message);
      setScheduledDateTime("");
      fetchAdminResults();
    } catch (err) {
      toast.error(err.response?.data?.error || "Scheduling failed.");
    } finally {
      setScheduling(false);
    }
  };

  const [cgpaRecords, setCgpaRecords] = useState([]);
  const [cgpaDeptFilter, setCgpaDeptFilter] = useState("all");
  const [cgpaSessionFilter, setCgpaSessionFilter] = useState("all");
  const [cgpaLevelFilter, setCgpaLevelFilter] = useState("all");

  const fetchAdminResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resultType: resultTypeTab });
      const res = await api.get(`/results/admin?${params.toString()}`);
      setUploads(res.data.uploads || []);
      setNotices(res.data.notices || []);
      setCgpaRecords(res.data.cgpaRecords || []);
    } catch (err) {
      toast.error("Failed to load admin result management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab("all");
    fetchAdminResults();
  }, [resultTypeTab]);

  const handleVerify = async (uploadId) => {
    try {
      await api.post(`/results/admin/verify/${uploadId}`);
      toast.success("Result batch verified successfully!");
      fetchAdminResults();
    } catch (err) {
      toast.error("Verification failed.");
    }
  };

  const handleRequestCorrectionSubmit = async () => {
    if (!correctionComment.trim()) {
      toast.error("Please enter correction instructions for the teacher.");
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/results/admin/request-correction/${correctionModalBatch._id}`, {
        comment: correctionComment,
      });
      toast.success("Correction request sent to teacher!");
      setCorrectionModalBatch(null);
      setCorrectionComment("");
      fetchAdminResults();
    } catch (err) {
      toast.error("Failed to send correction request.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePublish = async (uploadId) => {
    if (!window.confirm("Publish these results? Students will immediately gain access to their grades.")) return;

    try {
      await api.post(`/results/admin/publish/${uploadId}`);
      toast.success("Results published successfully! Notifications sent to students.");
      fetchAdminResults();
    } catch (err) {
      toast.error("Publishing failed.");
    }
  };

  const handleCalculateCGPA = async () => {
    setCalculating(true);
    setCalcSummary(null);
    try {
      const res = await api.post("/results/admin/calculate-gpa", {
        session: calcSession,
        level: calcLevel,
        term: calcTerm,
      });
      toast.success(res.data.message);
      setCalcSummary(res.data.summary);
    } catch (err) {
      toast.error(err.response?.data?.error || "CGPA calculation failed.");
    } finally {
      setCalculating(false);
    }
  };

  const handlePostNoticeSubmit = async (e) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      toast.error("Please fill in both notice title and content.");
      return;
    }

    try {
      await api.post("/results/admin/notice", {
        noticeTitle,
        noticeContent,
        targetAudience: noticeTarget,
        resultType: resultTypeTab,
      });
      toast.success(`Announcement posted successfully for ${noticeTarget}!`);
      setShowNoticeModal(false);
      setNoticeTitle("");
      setNoticeContent("");
    } catch (err) {
      toast.error("Notice creation failed.");
    }
  };

  const exportAdminResultsCSV = (batch) => {
    if (!batch.results || batch.results.length === 0) {
      toast.error("No results to export.");
      return;
    }

    let csv = "Student ID,Student Name,Session,Level,Term,Course Code,Course Title,Credit Hours,Mid Part A,Mid Part B,Attendance,Continuous Assessment,Final Exam,Total Marks,Letter Grade,Grade Point,Status\n";
    batch.results.forEach((r) => {
      csv += `"${r.studentId}","${r.studentName}","${r.session}","${r.level}","${r.term}","${r.courseCode}","${r.courseTitle}","${r.creditHours}","${r.midPartA ?? ""}","${r.midPartB ?? ""}","${r.attendance ?? ""}","${r.continuousAssessment ?? ""}","${r.finalExam ?? ""}","${r.totalMarks ?? ""}","${r.letterGrade ?? ""}","${r.gradePoint ?? ""}","${r.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Result_Report_${batch.courseCode}_${batch.session}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Result report exported to Excel!");
  };

  const isStatusMatch = (statusVal, tabVal, uploadObj) => {
    if (tabVal === "all") return true;
    const s = String(statusVal || "").toLowerCase();
    const t = String(tabVal || "").toLowerCase();
    if (t === "pending") {
      return s.includes("pending") || s === "draft" || uploadObj?.totalRecords === 0 || uploadObj?.isPendingAutoCard === true;
    }
    return s === t;
  };

  const filteredUploads = uploads.filter((u) => {
    if (!isStatusMatch(u.status, activeTab, u)) return false;
    if (sessionFilter !== "all" && u.session !== sessionFilter) return false;
    if (levelFilter !== "all" && u.level !== levelFilter) return false;
    if (termFilter !== "all" && u.term !== termFilter) return false;
    return true;
  });

  const uniqueSessions = Array.from(new Set(uploads.map((u) => u.session).filter(Boolean)));
  const uniqueLevels = Array.from(new Set(uploads.map((u) => u.level).filter(Boolean)));
  const uniqueTerms = Array.from(new Set(uploads.map((u) => u.term).filter(Boolean)));  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        {/* Clean Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <FiAward size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 800 }}>Result Publication & Verification</h1>
            </div>
          </div>

          <button
            onClick={() => {
              setNoticeTarget("Teachers");
              setNoticeTitle("Result Submission Cutoff Notice");
              setNoticeContent("All course teachers are requested to submit course result marksheets before the cutoff deadline.");
              setShowNoticeModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              background: "#ffffff",
              color: "#3b8db3",
              border: "1.5px solid #3b8db3",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            <FiBell size={16} /> Post Notice / Announcement
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{ display: "flex", gap: "10px", background: "#ffffff", padding: "6px", borderRadius: "12px", border: "1px solid #cbd5e1", width: "fit-content", marginBottom: "24px" }}>
          <button
            onClick={() => setViewTab("batches")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: viewTab === "batches" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: viewTab === "batches" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiAward size={16} /> Result Batches & Verification
          </button>

          <button
            onClick={() => setViewTab("schedules")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: viewTab === "schedules" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: viewTab === "schedules" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiClock size={16} /> Deadlines & Schedules Table
          </button>

          <button
            onClick={() => setViewTab("cgpa")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: viewTab === "cgpa" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: viewTab === "cgpa" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiCpu size={16} /> GPA & CGPA Calculator
          </button>
        </div>

        {/* TAB 1: RESULT BATCHES & VERIFICATION */}
        {viewTab === "batches" && (
          <div>
            {/* Primary Switcher: Midterm vs Final */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button
                onClick={() => setResultTypeTab("Midterm")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: resultTypeTab === "Midterm" ? "none" : "1px solid #cbd5e1",
                  background: resultTypeTab === "Midterm" ? "#0284c7" : "#ffffff",
                  color: resultTypeTab === "Midterm" ? "#ffffff" : "#475569",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Mid Term Result Batches
              </button>
              <button
                onClick={() => setResultTypeTab("Final")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: resultTypeTab === "Final" ? "none" : "1px solid #cbd5e1",
                  background: resultTypeTab === "Final" ? "#0284c7" : "#ffffff",
                  color: resultTypeTab === "Final" ? "#ffffff" : "#475569",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Final Result Batches
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["all", "Pending", "Submitted", "Correction Requested", "Published"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      border: activeTab === tab ? "none" : "1px solid #cbd5e1",
                      background: activeTab === tab ? "#3b8db3" : "#ffffff",
                      color: activeTab === tab ? "#ffffff" : "#475569",
                      fontWeight: 600,
                      fontSize: "12.5px",
                      cursor: "pointer",
                    }}
                  >
                    {tab === "all" ? "All Statuses" : tab}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                  <option value="all">All Sessions</option>
                  {uniqueSessions.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>

                <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                  <option value="all">All Levels</option>
                  {uniqueLevels.map((l) => (<option key={l} value={l}>{l}</option>))}
                </select>

                <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                  <option value="all">All Terms</option>
                  {uniqueTerms.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
            </div>

            {/* Upload Batches Roster */}
            {loading ? (
              <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading result batches...</div>
            ) : filteredUploads.length === 0 ? (
              <div style={{ padding: "60px", background: "#ffffff", borderRadius: "14px", textAlign: "center", color: "#94a3b8" }}>
                <FiAward size={44} style={{ opacity: 0.3, marginBottom: "10px" }} />
                <h3 style={{ margin: 0 }}>No {resultTypeTab} result batches found</h3>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {filteredUploads.map((batch) => (
                  <div key={batch._id} style={{ background: "#ffffff", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <span style={{ background: "rgba(59,141,179,0.12)", color: "#3b8db3", fontWeight: 800, padding: "3px 10px", borderRadius: "6px", fontSize: "13px" }}>
                            {batch.courseCode}
                          </span>
                          <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a", fontWeight: 700 }}>{batch.courseTitle}</h3>
                        </div>

                        <div style={{ fontSize: "12.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
                          <span>Dept: <strong>{batch.department || "EDTE"}</strong></span>
                          <span>•</span>
                          <span>{formatLevel(batch.level)} {formatTerm(batch.term)}</span>
                          <span>•</span>
                          <span>Session: <strong>{batch.session}</strong></span>
                          <span>•</span>
                          <span>Students: <strong>{batch.totalRecords}</strong></span>
                        </div>

                        <div style={{ marginTop: "8px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: batch.status === "Pending" ? "#fef3c7" : "#f0f9ff", border: `1px solid ${batch.status === "Pending" ? "#fcd34d" : "#bae6fd"}`, borderRadius: "6px", padding: "3px 10px", fontSize: "12px", color: batch.status === "Pending" ? "#b45309" : "#0369a1", fontWeight: 600 }}>
                            {batch.status === "Pending" ? `👤 Assigned: ${batch.teacherName || batch.teacherEmail || "Assigned Teacher"}` : `📋 Submitted by: ${batch.teacherEmail || "Teacher"}`}
                          </span>

                          {batch.status === "Pending" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: batch.cutoffDeadline ? "#fff1f2" : "#f8fafc", border: `1px solid ${batch.cutoffDeadline ? "#fca5a5" : "#e2e8f0"}`, borderRadius: "6px", padding: "3px 10px", fontSize: "12px", color: batch.cutoffDeadline ? "#991b1b" : "#64748b", fontWeight: 700 }}>
                              <FiClock size={13} /> {batch.cutoffDeadline ? `Target Deadline: ${new Date(batch.cutoffDeadline).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : "No Cutoff Set"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "12px", fontWeight: 700, fontSize: "12px",
                          background: batch.status === "Published" ? "#dcfce7" : batch.status === "Submitted" ? "#fef3c7" : batch.status === "Correction Requested" ? "#fee2e2" : "#fef3c7",
                          color: batch.status === "Published" ? "#166534" : batch.status === "Submitted" ? "#b45309" : batch.status === "Correction Requested" ? "#991b1b" : "#b45309"
                        }}>
                          {batch.status === "Pending" ? "⚠️ Pending Upload" : batch.status}
                        </span>

                        {batch.status === "Pending" && (
                          <button
                            onClick={() => handleOpenReminderModal(batch)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "linear-gradient(135deg, #d97706, #b45309)", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                          >
                            <FiBell size={13} /> Send Reminder
                          </button>
                        )}

                        {!batch.isPendingAutoCard && (
                          <button onClick={() => exportAdminResultsCSV(batch)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                            <FiDownload size={13} /> Export CSV
                          </button>
                        )}

                        {resultTypeTab === "Final" && batch.status === "Submitted" && (
                          <>
                            <button onClick={() => setCorrectionModalBatch(batch)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                              <FiAlertCircle size={13} /> Correction
                            </button>
                            <button onClick={() => handlePublish(batch._id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                              <FiSend size={13} /> Publish
                            </button>
                          </>
                        )}

                        {!batch.isPendingAutoCard && (
                          <button onClick={() => setViewBatch(viewBatch?._id === batch._id ? null : batch)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                            <FiEye size={13} /> {viewBatch?._id === batch._id ? "Hide Roster" : "View Roster"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Roster Table inside card */}
                    {viewBatch?._id === batch._id && (
                      <div style={{ marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "13.5px" }}>Student Grade Roster ({batch.courseCode})</h4>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                            <thead>
                              <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700, textAlign: "left" }}>
                                <th style={{ padding: "8px 12px" }}>Student ID</th>
                                <th style={{ padding: "8px 12px" }}>Student Name</th>
                                <th style={{ padding: "8px 12px" }}>MT Part A</th>
                                <th style={{ padding: "8px 12px" }}>MT Part B</th>
                                <th style={{ padding: "8px 12px" }}>Att.</th>
                                <th style={{ padding: "8px 12px" }}>Cont. Assmt</th>
                                <th style={{ padding: "8px 12px" }}>Final Exam</th>
                                <th style={{ padding: "8px 12px" }}>Total</th>
                                <th style={{ padding: "8px 12px" }}>GPA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(batch.results || []).map((r) => (
                                <tr key={r._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#3b8db3" }}>{r.studentId}</td>
                                  <td style={{ padding: "8px 12px" }}>{r.studentName}</td>
                                  <td style={{ padding: "8px 12px" }}>{r.midPartA ?? "-"}</td>
                                  <td style={{ padding: "8px 12px" }}>{r.midPartB ?? "-"}</td>
                                  <td style={{ padding: "8px 12px" }}>{r.attendance ?? "-"}</td>
                                  <td style={{ padding: "8px 12px" }}>{r.continuousAssessment ?? "-"}</td>
                                  <td style={{ padding: "8px 12px" }}>{r.finalExam ?? "-"}</td>
                                  <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.totalMarks ?? "-"}</td>
                                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#16a34a" }}>{r.gradePoint ?? r.letterGrade ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEADLINES & PUBLICATION SCHEDULES TABLE */}
        {viewTab === "schedules" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "28px" }}>
              {/* Set Cutoff Card */}
              <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "14px", border: "1px solid #cbd5e1", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <FiClock size={20} color="#166534" />
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#166534", fontWeight: 800 }}>Set Result Submission Cutoff Deadline</h3>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Session</label>
                    <select value={dlSession} onChange={(e) => setDlSession(e.target.value)} style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                      {["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Level</label>
                    <select value={dlLevel} onChange={(e) => setDlLevel(e.target.value)} style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                      {["Level-1", "Level-2", "Level-3", "Level-4"].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Term</label>
                    <select value={dlTerm} onChange={(e) => setDlTerm(e.target.value)} style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                      {["Term-1", "Term-2"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="datetime-local"
                    value={cutoffInput}
                    onChange={(e) => setCutoffInput(e.target.value)}
                    style={{ flex: 1, minWidth: "180px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  />
                  <button
                    onClick={handleSaveCutoffDeadline}
                    disabled={savingDeadline}
                    style={{ padding: "8.5px 16px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: savingDeadline ? "not-allowed" : "pointer" }}
                  >
                    {savingDeadline ? "Saving..." : "Save Deadline"}
                  </button>
                </div>
              </div>

              {/* Schedule Auto-Release Card */}
              <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "14px", border: "1px solid #cbd5e1", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <FiClock size={20} color="#0369a1" />
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#0369a1", fontWeight: 800 }}>Schedule Automated Timed Release</h3>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Session</label>
                    <select value={schedSession} onChange={(e) => setSchedSession(e.target.value)} style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                      {["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Level</label>
                    <select value={schedLevel} onChange={(e) => setSchedLevel(e.target.value)} style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                      {["Level-1", "Level-2", "Level-3", "Level-4"].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Term</label>
                    <select value={schedTerm} onChange={(e) => setSchedTerm(e.target.value)} style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                      {["Term-1", "Term-2"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    style={{ flex: 1, minWidth: "180px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                  />
                  <button
                    onClick={handleSchedulePublication}
                    disabled={scheduling}
                    style={{ padding: "8.5px 16px", background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: scheduling ? "not-allowed" : "pointer" }}
                  >
                    {scheduling ? "Scheduling..." : "Schedule Release"}
                  </button>
                </div>
              </div>
            </div>

            {/* Table 1: 📅 Result Submission Cutoff Deadlines Registry */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #bbf7d0", marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#16a34a" }} />
                  <h3 style={{ margin: 0, color: "#166534", fontSize: "16.5px", fontWeight: 800 }}>📅 Result Submission Cutoff Deadlines Table</h3>
                </div>
                <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: "8px" }}>
                  Active Cutoffs: {notices.filter(n => n.targetAudience === "Teachers" || (n.title && n.title.includes("Cutoff")) || n.resultDeadlineType === "Midterm" || n.resultDeadlineType === "Final").length}
                </span>
              </div>

              {(() => {
                const cutoffNotices = notices.filter(n => n.targetAudience === "Teachers" || (n.title && n.title.includes("Cutoff")) || n.resultDeadlineType === "Midterm" || n.resultDeadlineType === "Final");
                if (cutoffNotices.length === 0) {
                  return (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      No result submission cutoff deadlines set yet.
                    </div>
                  );
                }
                return (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f0fdf4", color: "#166534", fontWeight: 700, textAlign: "left", borderBottom: "2px solid #bbf7d0" }}>
                          <th style={{ padding: "10px 14px" }}>Session</th>
                          <th style={{ padding: "10px 14px" }}>Level-Term</th>
                          <th style={{ padding: "10px 14px" }}>Notice / Exam Title</th>
                          <th style={{ padding: "10px 14px" }}>Target Audience</th>
                          <th style={{ padding: "10px 14px" }}>Cutoff Date & Time</th>
                          <th style={{ padding: "10px 14px" }}>Status</th>
                          <th style={{ padding: "10px 14px", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cutoffNotices.map((n) => {
                          const targetDate = n.deadlineDate || n.scheduledPublishDate;
                          const isExpired = targetDate ? new Date(targetDate) < new Date() : false;
                          return (
                            <tr key={n._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{n.session || "All Sessions"}</td>
                              <td style={{ padding: "10px 14px" }}>{n.level && n.term ? `${formatLevel(n.level)} ${formatTerm(n.term)}` : "All Level-Terms"}</td>
                              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{n.title}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ background: "#fef3c7", color: "#b45309", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", fontSize: "11.5px" }}>
                                  Teachers 👤
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: isExpired ? "#991b1b" : "#166534" }}>
                                {targetDate ? new Date(targetDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "No Date Set"}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ background: isExpired ? "#fee2e2" : "#dcfce7", color: isExpired ? "#991b1b" : "#166534", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", fontSize: "11.5px" }}>
                                  {isExpired ? "Cutoff Passed 🔴" : "Active 🟢"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                <button
                                  onClick={() => handleDeleteNotice(n._id)}
                                  style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                                  title="Remove deadline record"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Table 2: ⏱️ Scheduled Automated Timed Releases Registry */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #bae6fd" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#0284c7" }} />
                  <h3 style={{ margin: 0, color: "#0369a1", fontSize: "16.5px", fontWeight: 800 }}>⏱️ Scheduled Automated Timed Releases Table</h3>
                </div>
                <span style={{ fontSize: "12px", color: "#0369a1", fontWeight: 700, background: "#f0f9ff", border: "1px solid #bae6fd", padding: "4px 10px", borderRadius: "8px" }}>
                  Active Timers: {notices.filter(n => n.targetAudience === "Students" || (n.title && (n.title.includes("Timed Release") || n.title.includes("Release Schedule")))).length}
                </span>
              </div>

              {(() => {
                const timedNotices = notices.filter(n => n.targetAudience === "Students" || (n.title && (n.title.includes("Timed Release") || n.title.includes("Release Schedule"))));
                if (timedNotices.length === 0) {
                  return (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      No automated release timers scheduled yet.
                    </div>
                  );
                }
                return (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f0f9ff", color: "#0369a1", fontWeight: 700, textAlign: "left", borderBottom: "2px solid #bae6fd" }}>
                          <th style={{ padding: "10px 14px" }}>Session</th>
                          <th style={{ padding: "10px 14px" }}>Level-Term</th>
                          <th style={{ padding: "10px 14px" }}>Announcement Title</th>
                          <th style={{ padding: "10px 14px" }}>Target Audience</th>
                          <th style={{ padding: "10px 14px" }}>Scheduled Release Date & Time</th>
                          <th style={{ padding: "10px 14px" }}>Timer Status</th>
                          <th style={{ padding: "10px 14px", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timedNotices.map((n) => {
                          const targetDate = n.deadlineDate || n.scheduledPublishDate;
                          const isExpired = targetDate ? new Date(targetDate) < new Date() : false;
                          return (
                            <tr key={n._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{n.session || "All Sessions"}</td>
                              <td style={{ padding: "10px 14px" }}>{n.level && n.term ? `${formatLevel(n.level)} ${formatTerm(n.term)}` : "All Level-Terms"}</td>
                              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{n.title}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", fontSize: "11.5px" }}>
                                  Students 🎓
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: isExpired ? "#166534" : "#0284c7" }}>
                                {targetDate ? new Date(targetDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "No Date Set"}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span style={{ background: isExpired ? "#dcfce7" : "#e0f2fe", color: isExpired ? "#166534" : "#0284c7", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", fontSize: "11.5px" }}>
                                  {isExpired ? "Released & Published 🟢" : "Scheduled Timer ⏳"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                <button
                                  onClick={() => handleDeleteNotice(n._id)}
                                  style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                                  title="Remove release schedule record"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: GPA & CGPA CALCULATOR */}
        {viewTab === "cgpa" && (
          <div style={{ background: "#ffffff", padding: "24px", borderRadius: "14px", border: "1px solid #cbd5e1", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <FiCpu size={22} color="#0369a1" />
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0369a1", fontWeight: 800 }}>Automatic Semester GPA & CGPA Calculator</h3>
            </div>

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Session</label>
                <select value={calcSession} onChange={(e) => setCalcSession(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                  {["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Level</label>
                <select value={calcLevel} onChange={(e) => setCalcLevel(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                  {["Level-1", "Level-2", "Level-3", "Level-4"].map((l) => (
                    <option key={l} value={l}>{formatLevel(l)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Term</label>
                <select value={calcTerm} onChange={(e) => setCalcTerm(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                  {["Term-1", "Term-2"].map((t) => (
                    <option key={t} value={t}>{formatTerm(t)}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCalculateCGPA}
                disabled={calculating}
                style={{
                  padding: "9px 20px",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: calculating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiCpu size={16} /> {calculating ? "Computing..." : "Compute Semester GPA & CGPA"}
              </button>
            </div>

            {calcSummary && calcSummary.length > 0 && (
              <div style={{ marginTop: "20px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 14px 0", color: "#166534", fontSize: "15px", fontWeight: 700 }}>✓ Calculated GPA Summary ({calcSummary.length} Students)</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {calcSummary.map((item) => (
                    <span key={item.studentId} style={{ background: "#ffffff", border: "1px solid #bbf7d0", padding: "8px 14px", borderRadius: "8px", color: "#15803d", fontSize: "13px" }}>
                      <strong>{item.studentId}</strong> — GPA: <strong>{item.cgpa || item.semesterGPA}</strong> ({item.totalCredits} Credits)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Department & Session-wise Calculated CGPA Audit Table */}
            <div style={{ marginTop: "28px", background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #cbd5e1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#16a34a" }} />
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: "16.5px", fontWeight: 800 }}>📅 Department-Wise Calculated GPA & CGPA History Registry</h3>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <select value={cgpaDeptFilter} onChange={(e) => setCgpaDeptFilter(e.target.value)} style={{ padding: "6.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                    <option value="all">All Departments</option>
                    <option value="EDTE">EDTE</option>
                  </select>

                  <select value={cgpaSessionFilter} onChange={(e) => setCgpaSessionFilter(e.target.value)} style={{ padding: "6.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                    <option value="all">All Sessions</option>
                    {["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select value={cgpaLevelFilter} onChange={(e) => setCgpaLevelFilter(e.target.value)} style={{ padding: "6.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}>
                    <option value="all">All Levels</option>
                    {["Level-1", "Level-2", "Level-3", "Level-4"].map(l => <option key={l} value={l}>{formatLevel(l)}</option>)}
                  </select>
                </div>
              </div>

              {(() => {
                const filteredCgpa = cgpaRecords.filter((r) => {
                  if (cgpaDeptFilter !== "all" && (r.department || "EDTE") !== cgpaDeptFilter) return false;
                  if (cgpaSessionFilter !== "all" && r.session !== cgpaSessionFilter) return false;
                  if (cgpaLevelFilter !== "all" && !String(r.level).toLowerCase().includes(cgpaLevelFilter.toLowerCase().replace("level-", ""))) return false;
                  return true;
                });

                if (filteredCgpa.length === 0) {
                  return (
                    <div style={{ padding: "36px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      No calculated GPA / CGPA records found for the selected department & session filters.
                    </div>
                  );
                }

                return (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "10px 14px" }}>Dept</th>
                          <th style={{ padding: "10px 14px" }}>Session</th>
                          <th style={{ padding: "10px 14px" }}>Level-Term</th>
                          <th style={{ padding: "10px 14px" }}>Student ID & Name</th>
                          <th style={{ padding: "10px 14px" }}>Semester GPA</th>
                          <th style={{ padding: "10px 14px" }}>Earned Credits</th>
                          <th style={{ padding: "10px 14px" }}>Calculated Date & Time</th>
                          <th style={{ padding: "10px 14px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCgpa.map((r) => (
                          <tr key={r._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{r.department || "EDTE"}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{r.session}</td>
                            <td style={{ padding: "10px 14px" }}>{formatLevel(r.level)} {formatTerm(r.term)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>
                              {r.studentId} <span style={{ fontWeight: 400, color: "#64748b" }}>({r.studentName || "Student"})</span>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 800, color: "#16a34a" }}>
                              {r.semesterGPA || r.cumulativeCGPA || "-"} / 4.00
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{r.semesterCredits || r.totalCumulativeCredits || "-"} Cr</td>
                            <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                              {r.calculatedAt ? new Date(r.calculatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ background: "#dcfce7", color: "#166534", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", fontSize: "11.5px" }}>
                                Recorded 🟢
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Post Notice / Announcement Modal */}
        {showNoticeModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "560px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>Post Result Announcement Notice</h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setShowNoticeModal(false)} />
              </div>

              <form onSubmit={handlePostNoticeSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Target Audience *</label>
                  <select value={noticeTarget} onChange={(e) => setNoticeTarget(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }}>
                    <option value="Teachers">Teachers Only (Result Submission Last Date Deadline)</option>
                    <option value="Students">Students Only (Result Publication Date Announcement)</option>
                    <option value="All">All Users</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Notice Title *</label>
                  <input
                    type="text"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Notice Message / Announcement *</label>
                  <textarea
                    rows={4}
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" onClick={() => setShowNoticeModal(false)} style={{ padding: "10px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ padding: "10px 20px", background: "#3b8db3", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13.5px", cursor: "pointer" }}>
                    Publish Notice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Correction Request Modal */}
        {correctionModalBatch && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "500px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>Request Result Correction</h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setCorrectionModalBatch(null)} />
              </div>

              <p style={{ fontSize: "13.5px", color: "#475569", margin: "0 0 16px 0" }}>
                Send feedback to teacher <strong>{correctionModalBatch.teacherEmail}</strong> for course <strong>{correctionModalBatch.courseCode}</strong>.
              </p>

              <textarea
                placeholder="Specify what needs correction (e.g., 'Mid A marks mismatch for student 2202022')..."
                rows={4}
                value={correctionComment}
                onChange={(e) => setCorrectionComment(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "20px" }}
              />

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button onClick={() => setCorrectionModalBatch(null)} style={{ padding: "10px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleRequestCorrectionSubmit} disabled={processing} style={{ padding: "10px 20px", background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: processing ? "not-allowed" : "pointer" }}>
                  {processing ? "Sending..." : "Send Correction Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Personal Reminder Modal */}
        {reminderModalBatch && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "560px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiBell color="#d97706" size={20} /> Send Personal Teacher Reminder Notice
                </h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setReminderModalBatch(null)} />
              </div>

              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#92400e", fontSize: "13px" }}>
                <div><strong>Course:</strong> {reminderModalBatch.courseCode} — {reminderModalBatch.courseTitle}</div>
                <div style={{ marginTop: "4px" }}><strong>Recipient Teacher:</strong> {reminderModalBatch.teacherName || "Course Teacher"} ({reminderModalBatch.teacherEmail || "No Email"})</div>
              </div>

              <form onSubmit={handleSendReminderSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Reminder Notice Message *</label>
                  <textarea
                    rows={5}
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" onClick={() => setReminderModalBatch(null)} style={{ padding: "10px 18px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={sendingReminder} style={{ padding: "10px 20px", background: "#d97706", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13.5px", cursor: sendingReminder ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FiSend size={15} /> {sendingReminder ? "Sending..." : "Send Notice & Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
