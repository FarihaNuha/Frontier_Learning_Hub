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
  const [loading, setLoading] = useState(true);
  const [resultTypeTab, setResultTypeTab] = useState("Final"); // "Midterm" or "Final"
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
        noticeTitle: `${currentType} Result Submission Deadline — ${dlSession} ${dlLevel} ${dlTerm}`,
        noticeContent: `All course teachers assigned to ${dlLevel} ${dlTerm} (Session: ${dlSession}) must upload and submit ${currentType} result marksheets by ${deadlineStr}. No uploads or modifications will be accepted after this deadline.`,
        targetAudience: "Teachers",
        deadlineDate: cutoffInput,
        resultType: currentType,
      });
      toast.success(`${currentType} Cutoff Deadline saved for ${dlLevel} ${dlTerm} (${dlSession})! Teachers notified successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save deadline.");
    } finally {
      setSavingDeadline(false);
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
      fetchAdminResults();
    } catch (err) {
      toast.error(err.response?.data?.error || "Scheduling failed.");
    } finally {
      setScheduling(false);
    }
  };

  const fetchAdminResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resultType: resultTypeTab });
      const res = await api.get(`/results/admin?${params.toString()}`);
      setUploads(res.data.uploads || []);
    } catch (err) {
      toast.error("Failed to load admin result management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset tab to 'all' when switching result type so nothing is hidden
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

  const filteredUploads = uploads.filter((u) => {
    if (activeTab !== "all" && u.status.toLowerCase() !== activeTab.toLowerCase()) return false;
    if (sessionFilter !== "all" && u.session !== sessionFilter) return false;
    if (levelFilter !== "all" && u.level !== levelFilter) return false;
    if (termFilter !== "all" && u.term !== termFilter) return false;
    return true;
  });

  const uniqueSessions = Array.from(new Set(uploads.map((u) => u.session).filter(Boolean)));
  const uniqueLevels = Array.from(new Set(uploads.map((u) => u.level).filter(Boolean)));
  const uniqueTerms = Array.from(new Set(uploads.map((u) => u.term).filter(Boolean)));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiAward size={22} />
              </div>
              <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Result Publication & Verification</h1>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Verify teacher uploaded marks, set submission deadlines, post announcements, calculate Semester CGPA, and publish results.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                setNoticeTarget("Teachers");
                setNoticeTitle("Result Submission Last Date Deadline");
                setNoticeContent("All course teachers are requested to upload and submit final course results before the announced deadline.");
                setShowNoticeModal(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#ffffff",
                color: "#3b8db3",
                border: "1.5px solid #3b8db3",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              <FiBell size={16} /> Post Teacher/Student Notice
            </button>
          </div>
        </div>

        {/* Primary Tabs: Mid Term vs Final Result */}
        <div style={{ display: "flex", gap: "12px", background: "#ffffff", padding: "6px", borderRadius: "12px", border: "1px solid #cbd5e1", width: "fit-content", marginBottom: "24px" }}>
          <button
            onClick={() => setResultTypeTab("Midterm")}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: resultTypeTab === "Midterm" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: resultTypeTab === "Midterm" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Mid Term Result Batches
          </button>
          <button
            onClick={() => setResultTypeTab("Final")}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: resultTypeTab === "Final" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: resultTypeTab === "Final" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Final Result Batches
          </button>
        </div>

        {/* Result Submission Cutoff Deadline Card (Midterm & Final) */}
        <div style={{ background: "linear-gradient(135deg, #ffffff, #f0fdf4)", padding: "24px", borderRadius: "14px", border: "1px solid #86efac", marginBottom: "28px", boxShadow: "0 4px 16px rgba(22,163,74,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <FiClock size={20} color="#166534" />
            <h3 style={{ margin: 0, fontSize: "16.5px", color: "#166534" }}>{resultTypeTab} Result Submission Deadline</h3>
          </div>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#475569" }}>
            Select the Session, Level, and Term, then set the deadline for {resultTypeTab} results. Teachers will be automatically notified via dashboard notification and email.
          </p>

          {/* Session / Level / Term selectors */}
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#166534", marginBottom: "4px" }}>Session</label>
              <select value={dlSession} onChange={(e) => setDlSession(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "13px", background: "#f0fdf4" }}>
                {["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#166534", marginBottom: "4px" }}>Level</label>
              <select value={dlLevel} onChange={(e) => setDlLevel(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "13px", background: "#f0fdf4" }}>
                {["Level-1", "Level-2", "Level-3", "Level-4"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#166534", marginBottom: "4px" }}>Term</label>
              <select value={dlTerm} onChange={(e) => setDlTerm(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "13px", background: "#f0fdf4" }}>
                {["Term-1", "Term-2"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Deadline Date + Save */}
          <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "16px", border: "1px solid #bbf7d0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <FiClock size={15} color="#16a34a" />
              <strong style={{ fontSize: "13.5px", color: "#166534" }}>{resultTypeTab} Submission Cutoff Date &amp; Time</strong>
            </div>
            <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "#475569" }}>
              After this deadline, teachers must submit all {resultTypeTab} marksheets for the selected Level-Term.
            </p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="datetime-local"
                value={cutoffInput}
                onChange={(e) => setCutoffInput(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "13px", background: "#fff" }}
              />
              <button
                onClick={handleSaveCutoffDeadline}
                disabled={savingDeadline}
                style={{
                  padding: "9px 20px",
                  background: savingDeadline ? "#86efac" : "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: savingDeadline ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <FiSend size={14} /> {savingDeadline ? "Saving & Notifying..." : "Save & Notify Teachers"}
              </button>
            </div>
          </div>
        </div>


        {/* CGPA Calculation Card (Final Result Only) */}
        {resultTypeTab === "Final" && (
          <div style={{ background: "linear-gradient(135deg, #ffffff, #f0f9ff)", padding: "20px", borderRadius: "14px", border: "1px solid #bae6fd", marginBottom: "28px", boxShadow: "0 4px 16px rgba(59,141,179,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <FiCpu size={20} color="#0369a1" />
              <h3 style={{ margin: 0, fontSize: "16.5px", color: "#0369a1" }}>Automatic Semester GPA & CGPA Calculator</h3>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#475569" }}>
              Select a Level-Term and click <strong>Calculate Semester GPA</strong> to automatically compute credit-weighted GPAs for all students.
            </p>

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
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
                  {["Level-1", "Level-2", "Level-3", "Level-4", "Level 1", "Level 2", "Level 3", "Level 4"].map((l) => (
                    <option key={l} value={l}>{formatLevel(l)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Term</label>
                <select value={calcTerm} onChange={(e) => setCalcTerm(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                  {["Term-1", "Term-2", "Term 1", "Term 2"].map((t) => (
                    <option key={t} value={t}>{formatTerm(t)}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCalculateCGPA}
                disabled={calculating}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: calculating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiCpu size={16} /> {calculating ? "Calculating..." : "Calculate Semester GPA / CGPA"}
              </button>
            </div>

            {calcSummary && calcSummary.length > 0 && (
              <div style={{ marginTop: "16px", background: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#166534" }}>✓ Calculated CGPA for {calcSummary.length} Students</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {calcSummary.slice(0, 10).map((item) => (
                    <span key={item.studentId} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: "8px", color: "#15803d", fontSize: "12.5px" }}>
                      <strong>{item.studentId}</strong> — CGPA: <strong>{item.cgpa || item.semesterGPA}</strong> ({item.totalCredits} Total Cr)
                    </span>
                  ))}
                  {calcSummary.length > 10 && <span style={{ color: "#64748b", alignSelf: "center" }}>+{calcSummary.length - 10} more...</span>}
                </div>
              </div>
            )}

            {/* Automated Timed Publication Schedule Control */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1.5px dashed #bae6fd" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <FiClock size={18} color="#0369a1" />
                <h4 style={{ margin: 0, fontSize: "15px", color: "#0369a1" }}>Automated Scheduled Release Timer (By Session & Level-Term)</h4>
              </div>
              <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#475569" }}>
                Set a date & time for automatic final result release. Results for the selected session will publish automatically when the timer expires!
              </p>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Session</label>
                  <select value={schedSession} onChange={(e) => setSchedSession(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                    {["2025-26", "2024-25", "2023-24", "2022-23", "2021-22"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Level</label>
                  <select value={schedLevel} onChange={(e) => setSchedLevel(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                    {["Level-1", "Level-2", "Level-3", "Level-4", "Level 1", "Level 2", "Level 3", "Level 4"].map((l) => (
                      <option key={l} value={l}>{formatLevel(l)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Term</label>
                  <select value={schedTerm} onChange={(e) => setSchedTerm(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
                    {["Term-1", "Term-2", "Term 1", "Term 2"].map((t) => (
                      <option key={t} value={t}>{formatTerm(t)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Publication Release Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    style={{ padding: "7.5px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <button
                  onClick={handleSchedulePublication}
                  disabled={scheduling}
                  style={{
                    marginTop: "18px",
                    padding: "9px 18px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: scheduling ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FiClock size={15} /> {scheduling ? "Scheduling..." : "Schedule Automatic Release"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Status Tabs — different sets per result type */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(resultTypeTab === "Final"
              ? ["all", "Pending", "Submitted", "Correction Requested", "Published"]
              : ["all", "Submitted"]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: activeTab === tab ? "none" : "1px solid #cbd5e1",
                  background: activeTab === tab ? "#3b8db3" : "#ffffff",
                  color: activeTab === tab ? "#ffffff" : "#475569",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab === "all" ? "All Batches" : tab}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              <option value="all">All Sessions</option>
              {uniqueSessions.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>

            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              <option value="all">All Levels</option>
              {uniqueLevels.map((l) => (<option key={l} value={l}>{l}</option>))}
            </select>

            <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
              <option value="all">All Terms</option>
              {uniqueTerms.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading admin result batches...</div>
        ) : filteredUploads.length === 0 ? (
          <div style={{ padding: "60px", background: "#ffffff", borderRadius: "14px", textAlign: "center", color: "#94a3b8" }}>
            <FiAward size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3>No {resultTypeTab} result batches found for status '{activeTab}'</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filteredUploads.map((batch) => (
              <div key={batch._id} style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ background: "rgba(59,141,179,0.12)", color: "#3b8db3", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", fontSize: "13px" }}>
                        {batch.courseCode}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>{batch.courseTitle}</h3>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      Dept: <strong>{batch.department || "EDTE"}</strong> • {/^level/i.test(String(batch.level || "").trim()) ? batch.level : `Level ${batch.level || ""}`} • {/^term/i.test(String(batch.term || "").trim()) ? batch.term : `Term ${batch.term || ""}`} • Session: <strong>{batch.session}</strong> • Students: <strong>{batch.totalRecords}</strong>
                    </div>
                    {/* Teacher attribution — always visible */}
                    <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", padding: "3px 10px", fontSize: "12.5px", color: "#0369a1", fontWeight: 600 }}>
                      📋 Submitted by: {batch.teacherEmail || "Unknown Teacher"}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "12px", fontWeight: 700, fontSize: "12px",
                      background: batch.status === "Published" ? "#dcfce7" : batch.status === "Submitted" ? "#fef3c7" : batch.status === "Correction Requested" ? "#fee2e2" : batch.status === "Pending" ? "#f1f5f9" : "#e0f2fe",
                      color: batch.status === "Published" ? "#166534" : batch.status === "Submitted" ? "#b45309" : batch.status === "Correction Requested" ? "#991b1b" : batch.status === "Pending" ? "#475569" : "#0369a1"
                    }}>
                      {batch.status}
                    </span>

                    <button onClick={() => exportAdminResultsCSV(batch)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>
                      <FiDownload size={14} /> Export CSV
                    </button>

                    {/* Final result action buttons */}
                    {resultTypeTab === "Final" && (
                      <>
                        {batch.status === "Submitted" && (
                          <button onClick={() => setCorrectionModalBatch(batch)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>
                            <FiAlertCircle size={14} /> Request Correction
                          </button>
                        )}

                        {batch.status === "Submitted" && (
                          <button onClick={() => handlePublish(batch._id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>
                            <FiSend size={14} /> Publish to Students
                          </button>
                        )}
                      </>
                    )}

                    <button onClick={() => setViewBatch(viewBatch?._id === batch._id ? null : batch)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>
                      <FiEye size={14} /> {viewBatch?._id === batch._id ? "Hide Read-Only Roster" : "View Roster (Read-Only)"}
                    </button>
                  </div>
                </div>

                {/* Expanded Roster View */}
                {viewBatch?._id === batch._id && (
                  <div style={{ marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                    <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "14px" }}>Student Grade Roster ({batch.courseCode})</h4>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                            <th style={{ padding: "8px 12px" }}>Student ID</th>
                            <th style={{ padding: "8px 12px" }}>Student Name</th>
                            <th style={{ padding: "8px 12px" }}>MT Part A</th>
                            <th style={{ padding: "8px 12px" }}>MT Part B</th>
                            <th style={{ padding: "8px 12px" }}>Att.</th>
                            <th style={{ padding: "8px 12px" }}>Cont. Assmt</th>
                            <th style={{ padding: "8px 12px" }}>Final Exam</th>
                            <th style={{ padding: "8px 12px" }}>Total Marks</th>
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
      </div>
    </div>
  );
}
