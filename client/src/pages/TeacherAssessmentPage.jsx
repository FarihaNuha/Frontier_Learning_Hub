import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  FiUpload,
  FiFileText,
  FiUser,
  FiLogOut,
  FiList,
  FiCalendar,
  FiArrowLeft,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiBookOpen,
  FiInfo,
  FiDownload,
  FiMessageSquare,
  FiSend,
  FiX,
  FiClock,
  FiCheck,
  FiLock,
  FiUnlock,
  FiAlertTriangle,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherAssessmentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: courseId } = useParams(); // Selected course context if navigated from course dashboard

  const [assessments, setAssessments] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseGroup, setSelectedCourseGroup] = useState(null);
  const [showRules, setShowRules] = useState(false);
  
  // Upload results summary and error states
  const [summary, setSummary] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Correction Requests state
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [viewRequestsModalGroup, setViewRequestsModalGroup] = useState(null);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [timerValues, setTimerValues] = useState({});

  const [currentCourseInfo, setCurrentCourseInfo] = useState(null);

  useEffect(() => {
    if (courseId) {
      api.get(`/courses/${courseId}`)
        .then((res) => {
          if (res.data?.course) {
            setCurrentCourseInfo(res.data.course);
          }
        })
        .catch(() => {});
    } else {
      setCurrentCourseInfo(null);
    }
  }, [courseId]);

  const handleSetAssessmentDeadline = async (group, deadlineVal = null, isCloseNow = false) => {
    try {
      await api.post("/assessments/set-deadline", {
        courseCode: group.courseCode,
        level: group.level,
        term: group.term,
        department: group.department,
        correctionWindowEnd: deadlineVal,
        isCorrectionClosed: isCloseNow,
      });
      if (isCloseNow) {
        toast.success(`Correction window locked for ${getCleanCourseCode(group.courseCode)}.`);
      } else if (deadlineVal) {
        toast.success(`Correction deadline updated for ${getCleanCourseCode(group.courseCode)}.`);
      } else {
        toast.success(`Correction deadline cleared for ${getCleanCourseCode(group.courseCode)}.`);
      }
      fetchAssessments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update deadline.");
    }
  };
  
  // Helper to sanitize Course Code (e.g. "ET 317")
  const getCleanCourseCode = (rawCode) => {
    if (!rawCode) return "";
    return String(rawCode).split(/course title|course type|credit|level|term|dept/i)[0].trim();
  };

  // Helper to sanitize Course Title (e.g. "Blended Education Design and Development")
  const getCleanCourseTitle = (rawCode, rawTitle) => {
    if (rawTitle && !rawTitle.toLowerCase().includes("course type") && !rawTitle.toLowerCase().includes("credit hour")) {
      return rawTitle.trim();
    }
    if (!rawCode) return "";
    if (/course title/i.test(rawCode)) {
      let titlePart = rawCode.split(/course title\s*:?\s*/i)[1];
      if (titlePart) {
        return titlePart.split(/course type|credit|level|term|dept/i)[0].trim();
      }
    }
    return "";
  };

  const getCleanSession = (group) => {
    const raw = group?.session || group?.items?.[0]?.session || "";
    const match = raw.match(/\d{4}[-\s]\d{2,4}/);
    if (match) return match[0];
    return "2022-23";
  };

  const getCleanLevel = (group) => {
    const raw = group?.level || group?.items?.[0]?.level || "";
    const match = raw.match(/level\s*(\d+)/i) || raw.match(/(\d+)/);
    if (match) return match[1] || match[0];
    return "3";
  };

  const getCleanTerm = (group) => {
    const raw = group?.term || group?.items?.[0]?.term || "";
    const match = raw.match(/term\s*(\d+)/i) || raw.match(/(\d+)/);
    if (match) return match[1] || match[0];
    return "2";
  };

  const getCleanDepartment = (group) => {
    const raw = group?.department || group?.items?.[0]?.department || "";
    const match = raw.match(/EDTE|IRE|CySE|DSE|SWE/i);
    if (match) return match[0].toUpperCase();
    return "EDTE";
  };
  
  // Download Assessment Template matching user image layout exactly
  const handleDownloadTemplate = () => {
    const wsData = [
      ["", "", "Dept: EDTE", "Session: 2022-23", "Level 3", "Term 2"],
      ["", "Course Code: ET 317", "Course Title: Blended Education Design and Development", "", "Course Type: Theory", "Credit Hour: 3"],
      [
        "SL",
        "ID of the Student",
        "Attendance and Class Performance Marks (30)",
        "Class Test/Quiz (Out of 30)",
        "Assignment (Out of 30)",
        "Presentation (Out of 30)",
        "Total CA Marks (90)",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 44 },
      { wch: 28 },
      { wch: 25 },
      { wch: 25 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assessment_Template");
    XLSX.writeFile(wb, "Assessment_Marksheet_Template.xlsx");
  };
  
  // Deletion UI states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCourse = async (targetGroup) => {
    setDeleting(true);
    try {
      const { courseCode, level, term, department } = targetGroup;
      const url = `/assessments/course/${encodeURIComponent(courseCode)}?level=${encodeURIComponent(level || '')}&term=${encodeURIComponent(term || '')}&department=${encodeURIComponent(department || '')}`;
      await api.delete(url);
      toast.success(`Marksheet for ${courseCode} deleted successfully`);
      setDeleteTarget(null);
      setSelectedCourseGroup(null);
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete marksheet");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/assessments/record/${id}`);
      toast.success("Student assessment record deleted");
      setDeleteTarget(null);
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  const fetchTeacherRequests = async () => {
    try {
      const res = await api.get("/results/teacher/correction-requests");
      setTeacherRequests(res.data.requests || []);
    } catch (err) {}
  };

  const handleReplyStudentRequest = async (requestId, newStatus = "Replied") => {
    const text = replyTextMap[requestId] || "";
    setSubmittingReplyId(requestId);
    try {
      await api.post(`/results/teacher/reply-correction-request/${requestId}`, {
        teacherReply: text,
        status: newStatus,
      });
      toast.success("Response sent to student successfully!");
      fetchTeacherRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send reply.");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  useEffect(() => {
    fetchAssessments();
    fetchTeacherRequests();
  }, [courseId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assessments/teacher");
      setAssessments(res.data.assessments);
    } catch (error) {
      toast.error("Failed to load assessment marks");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSummary(null); // Clear summary on new file select
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setSummary(null);
    setUploadError(null);
    try {
      const res = await api.post("/assessments/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.savedCount === 0 && res.data?.duplicateCount > 0) {
        toast.error(`⚠️ Info already exists! Marks for all ${res.data.duplicateCount} students were already uploaded.`);
      } else if (res.data?.duplicateCount > 0) {
        toast.success(`Marksheet processed: ${res.data.savedCount} saved, ${res.data.duplicateCount} duplicate(s) skipped.`);
      } else {
        toast.success("Marksheet processed successfully!");
      }
      setSummary(res.data);
      setFile(null);
      // Reset file input element
      const fileInput = document.getElementById("xlsx-file");
      if (fileInput) fileInput.value = "";
      
      fetchAssessments();
    } catch (error) {
      console.error(error);
      const errDetail = error.response?.data?.error || "Failed to process marksheet";
      setUploadError(errDetail);
      toast.error(errDetail.split("\n")[0] || "Failed to process marksheet");
    } finally {
      setUploading(false);
    }
  };

  // Group assessments by courseCode + level + term + department + session + courseTitle + courseType + creditHour
  const courseGroups = assessments.reduce((acc, item) => {
    const code = item.courseCode || "UNKNOWN";
    const title = item.courseTitle || "";
    const lvl = item.level || "";
    const trm = item.term || "";
    const dept = item.department || "";
    const sess = item.session || "";
    const cred = item.creditHour !== undefined && item.creditHour !== null ? item.creditHour : "";
    const type = item.courseType || "";

    const key = `${code}|||${title}|||${lvl}|||${trm}|||${dept}|||${sess}|||${cred}|||${type}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        courseCode: code,
        courseTitle: title,
        level: lvl,
        term: trm,
        department: dept,
        session: sess,
        creditHour: cred,
        courseType: type,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const uniqueCourseGroups = Object.values(courseGroups);

  const filteredUniqueCourseGroups = uniqueCourseGroups.filter((group) => {
    // 1. If inside a specific course context, isolate strictly by courseCode & session!
    if (currentCourseInfo) {
      const cClean = (currentCourseInfo.displayCode || currentCourseInfo.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const gClean = (group.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const codeMatch = cClean === gClean || gClean.includes(cClean);

      const cSess = (currentCourseInfo.session || "").trim().toLowerCase();
      const gSess = (getCleanSession(group) || "").trim().toLowerCase();
      const sessMatch = !cSess || !gSess || cSess.includes(gSess) || gSess.includes(cSess);

      if (!codeMatch || !sessMatch) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchesCode = group.courseCode.toLowerCase().includes(q);
    const matchesLevel = group.level.toLowerCase().includes(q);
    const matchesTerm = group.term.toLowerCase().includes(q);
    const matchesDept = group.department.toLowerCase().includes(q);
    const matchesStudent = group.items.some(
      (item) =>
        item.studentIdNumber.toLowerCase().includes(q) ||
        (item.studentId?.name || "").toLowerCase().includes(q) ||
        (item.session || "").toLowerCase().includes(q)
    );
    return matchesCode || matchesLevel || matchesTerm || matchesDept || matchesStudent;
  });

  // Hierarchical Grouping: Session -> Department -> Level & Term -> Marksheet Cards
  const sessionGroupsMap = filteredUniqueCourseGroups.reduce((acc, group) => {
    const sess = getCleanSession(group) || "GENERAL SESSION";
    if (!acc[sess]) {
      acc[sess] = {};
    }
    const dept = group.department ? group.department.toUpperCase() : "GENERAL / OTHER DEPT";
    if (!acc[sess][dept]) {
      acc[sess][dept] = {};
    }
    let levelTerm = "";
    if (group.level || group.term) {
      const cleanLvl = group.level ? group.level.replace(/^level\s*:?\s*/i, "").trim() : "";
      const cleanTrm = group.term ? group.term.replace(/^term\s*:?\s*/i, "").trim() : "";
      const lvlStr = cleanLvl ? `Level: ${cleanLvl}` : "";
      const trmStr = cleanTrm ? `Term: ${cleanTrm}` : "";
      levelTerm = `${lvlStr} ${trmStr}`.trim();
    } else {
      levelTerm = "GENERAL LEVEL & TERM";
    }
    if (!acc[sess][dept][levelTerm]) {
      acc[sess][dept][levelTerm] = [];
    }
    acc[sess][dept][levelTerm].push(group);
    return acc;
  }, {});

  // Filter assessments based on selected group and search query
  const filteredAssessments = selectedCourseGroup
    ? (courseGroups[selectedCourseGroup.key]?.items || []).filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          item.studentIdNumber.toLowerCase().includes(q) ||
          (item.studentId?.name || "").toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="dashboard-container">
      <TeacherSidebar
        currentPage="assessment"
        courseId={courseId}
      />

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>Assessment Marksheet Management</h1>
            <p style={{ color: "#6b89a0", marginTop: 4 }}>
              Upload and manage student marks dynamically using Excel files
            </p>
          </div>
        </div>

        {/* UPLOAD MARKSHEET BOX */}
        <div className="table-container" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, color: "#2c4b66", margin: 0 }}>
                Upload Assessment Sheet
              </h2>
              <p style={{ fontSize: 13, color: "#6b89a0", marginTop: 4, marginBottom: 0 }}>
                Upload an Excel (`.xlsx` or `.csv`) sheet. Course Code, Level, Term, Dept & student marks will be parsed automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                background: "#ffffff",
                color: "#0369a1",
                border: "1.5px solid #bae6fd",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.08)",
                transition: "all 0.2s ease"
              }}
            >
              <FiDownload size={18} color="#0369a1" />
              <span>Download Template</span>
            </button>
          </div>

          {/* MULTILINE PARAMETER MISMATCH UPLOAD WARNING BANNER */}
          {uploadError && (
            <div
              style={{
                background: "#fff1f2",
                border: "2px solid #fecdd3",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "24px",
                boxShadow: "0 6px 16px rgba(225, 29, 72, 0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "16px", color: "#be123c" }}>
                  <FiAlertTriangle size={22} color="#be123c" />
                  <span>Upload Blocked — Parameter Mismatch Warning</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#be123c", fontWeight: 700, fontSize: "18px" }}
                  title="Dismiss warning"
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  background: "#ffffff",
                  padding: "16px 20px",
                  borderRadius: "10px",
                  border: "1px solid #ffe4e6",
                  color: "#881337",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.65"
                }}
              >
                {uploadError}
              </div>
            </div>
          )}

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              className="file-upload-area"
              style={{ width: "100%" }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange({ target: { files: e.dataTransfer.files } });
                }
              }}
            >
              <input
                type="file"
                id="xlsx-file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <label 
                htmlFor="xlsx-file" 
                style={{ 
                  cursor: "pointer", 
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  gap: 10, 
                  padding: "36px 20px",
                  border: "2px dashed var(--pastel-blue-deep)",
                  borderRadius: 16,
                  background: "rgba(59, 141, 179, 0.05)",
                  transition: "all 0.3s ease",
                  textAlign: "center"
                }}
                className="upload-dropzone"
              >
                <FiUpload size={32} color="var(--pastel-blue-primary)" style={{ marginBottom: 4 }} />
                <strong style={{ fontSize: 16, color: "var(--pastel-blue-primary)" }}>
                  {file ? file.name : "Drag & Drop or Choose Excel/CSV File"}
                </strong>
                <span style={{ fontSize: 12, color: "#6b89a0" }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Drag & drop or click here to upload student marksheet"}
                </span>
              </label>
            </div>
            <button
              type="submit"
              className="btn-success"
              disabled={uploading || !file}
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                justifyContent: "center",
                gap: 8, 
                height: 48, 
                padding: "0 24px",
                fontSize: 15,
                fontWeight: 600,
                width: "100%",
                maxWidth: 280,
                alignSelf: "center",
                borderRadius: 12
              }}
            >
              {uploading ? "Processing Marksheet..." : "Upload & Process"}
            </button>
          </form>

          {/* UPLOAD SUMMARY DETAILS */}
          {summary && (
            <div
              style={{
                marginTop: 20,
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h4 style={{ color: "#0369a1", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <FiCheckCircle /> Marksheet Processing Summary
              </h4>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14 }}>
                <p><strong>Detected Course Code:</strong> <span className="status-badge ontime">{getCleanCourseCode(summary.courseCode)}</span></p>
                {getCleanCourseTitle(summary.courseCode, summary.courseTitle) && (
                  <p><strong>Course Title:</strong> <span style={{ fontWeight: 600, color: "#2c4b66" }}>{getCleanCourseTitle(summary.courseCode, summary.courseTitle)}</span></p>
                )}
                {summary.level && <p><strong>Level:</strong> <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{summary.level}</span></p>}
                {summary.term && <p><strong>Term:</strong> <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{summary.term}</span></p>}
                {summary.department && <p><strong>Dept:</strong> <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{summary.department}</span></p>}
                <p><strong>Total Rows:</strong> {summary.totalProcessed}</p>
                <p><strong>Successfully Saved:</strong> <span style={{ color: "#16a34a", fontWeight: "bold" }}>{summary.savedCount}</span></p>
                <p><strong>Duplicate Rows Skipped:</strong> <span style={{ color: "#dc2626", fontWeight: "bold" }}>{summary.duplicateCount}</span></p>
              </div>
              {summary.duplicateCount > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#ef4444" }}>
                  <FiAlertCircle size={12} /> Note: Marks for {summary.duplicateCount} students were already stored for this course and were ignored.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ASSESSMENT MARKS LIST */}
        <div className="table-container">
          {selectedCourseGroup === null ? (
            // CARDS GRID VIEW
            <div>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #E2EEF6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: "#2c4b66" }}>
                  Course Marksheets ({uniqueCourseGroups.length})
                </h2>
                
                {/* GLOBAL COURSE CARDS SEARCH BAR */}
                <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
                  <input
                    type="text"
                    placeholder="Search course code, level, term, dept, or student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 34px",
                      borderRadius: 8,
                      border: "1.5px solid #d4e7f5",
                      fontSize: 13,
                      width: "100%",
                      outline: "none",
                      background: "#f8fafc",
                    }}
                  />
                  <FiSearch
                    size={16}
                    color="#6B89A0"
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                </div>
              </div>

              {loading ? (
                <div className="loading-state" style={{ padding: "40px 0" }}>
                  <div className="spinner" style={{ margin: "0 auto" }}></div>
                </div>
              ) : uniqueCourseGroups.length === 0 ? (
                <div className="empty-state" style={{ padding: "60px 0" }}>
                  <FiFileText size={48} color="#6B89A0" />
                  <h3>No course marksheets uploaded yet</h3>
                  <p>Please select and upload an Excel marksheet file above.</p>
                </div>
              ) : filteredUniqueCourseGroups.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <FiSearch size={40} color="#6B89A0" />
                  <h3>No matching marksheets found</h3>
                  <p>No course, level, term, department, or student matches "{searchQuery}"</p>
                </div>
              ) : (
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "32px" }}>
                  {Object.entries(sessionGroupsMap)
                    .sort(([sessA], [sessB]) => sessB.localeCompare(sessA, undefined, { numeric: true }))
                    .map(([sessionName, deptMap]) => {
                      const totalCardsInSession = Object.values(deptMap).reduce(
                        (accDept, ltMap) => accDept + Object.values(ltMap).reduce((accLt, list) => accLt + list.length, 0),
                        0
                      );

                      return (
                        <div
                          key={sessionName}
                          style={{
                            background: "#ffffff",
                            borderRadius: "16px",
                            border: "1px solid #cbd5e1",
                            padding: "24px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                          }}
                        >
                          {/* Session Banner Header */}
                          <div
                            style={{
                              background: "linear-gradient(135deg, #0284c7, #0369a1)",
                              color: "#ffffff",
                              padding: "16px 24px",
                              borderRadius: "12px",
                              marginBottom: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              boxShadow: "0 4px 14px rgba(2,132,199,0.2)",
                              flexWrap: "wrap",
                              gap: "12px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ background: "rgba(255,255,255,0.2)", padding: "8px", borderRadius: "10px", display: "flex" }}>
                                <FiCalendar size={22} color="#ffffff" />
                              </div>
                              <div>
                                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff", letterSpacing: "0.4px" }}>
                                  Session: {sessionName}
                                </h2>
                                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#e0f2fe", opacity: 0.9 }}>
                                  Assessment marksheets for academic session {sessionName}
                                </p>
                              </div>
                            </div>
                            <span
                              style={{
                                background: "rgba(255,255,255,0.25)",
                                color: "#ffffff",
                                padding: "6px 16px",
                                borderRadius: "20px",
                                fontSize: "13px",
                                fontWeight: 700,
                                backdropFilter: "blur(4px)",
                              }}
                            >
                              {totalCardsInSession} {totalCardsInSession === 1 ? "Marksheet Section" : "Marksheet Sections"}
                            </span>
                          </div>

                          {/* Departments & Level-Terms under this Session */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            {Object.entries(deptMap).map(([deptName, levelTermsMap]) => (
                              <div key={deptName} style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
                                {/* Department Header */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "2px solid #3b8db3", marginBottom: "20px" }}>
                                  <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "6px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "14px" }}>
                                    🏛️ Dept: {deptName}
                                  </span>
                                </div>

                                {/* Level & Term list */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                  {Object.entries(levelTermsMap)
                                    .sort(([ltA], [ltB]) => ltA.localeCompare(ltB, undefined, { numeric: true }))
                                    .map(([levelTermName, groupsList]) => (
                                      <div key={levelTermName}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                                          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569", background: "#ffffff", padding: "4px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                                            🎓 {levelTermName}
                                          </span>
                                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                                            ({groupsList.length} {groupsList.length === 1 ? "Marksheet" : "Marksheets"})
                                          </span>
                                        </div>

                                        {/* Cards Grid */}
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "24px" }}>
                                          {groupsList.map((group) => {
                                            const studentCount = group.items.length;
                                            return (
                                              <div
                                                key={group.key}
                                                onClick={() => setSelectedCourseGroup(group)}
                                                className="assessment-course-card"
                                                style={{
                                                  position: "relative",
                                                  cursor: "pointer",
                                                  background: "#ffffff",
                                                  borderRadius: "16px",
                                                  padding: "24px",
                                                  border: "1px solid #e2e8f0",
                                                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                                                  transition: "all 0.2s ease"
                                                }}
                                              >
                                                {/* Card Accent Line */}
                                                <div style={{
                                                  position: "absolute",
                                                  top: 0,
                                                  left: 0,
                                                  width: "6px",
                                                  height: "100%",
                                                  background: "#3B8DB3",
                                                  borderRadius: "16px 0 0 16px"
                                                }} />

                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                                                  <span style={{
                                                    background: "#E8F4FD",
                                                    color: "#3B8DB3",
                                                    padding: "6px 14px",
                                                    borderRadius: "20px",
                                                    fontSize: "14px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.5px"
                                                  }}>
                                                    {getCleanCourseCode(group.courseCode)}
                                                  </span>
                                                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewRequestsModalGroup(group);
                                                      }}
                                                      style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                        padding: "6px 12px",
                                                        borderRadius: "16px",
                                                        background: "#e0f2fe",
                                                        color: "#0369a1",
                                                        border: "1px solid #bae6fd",
                                                        fontSize: "12.5px",
                                                        fontWeight: 600,
                                                        cursor: "pointer"
                                                      }}
                                                      title="View Student Correction Requests"
                                                    >
                                                      <FiMessageSquare size={14} />
                                                      <span>
                                                        Correction Requests (
                                                        {
                                                          teacherRequests.filter((r) =>
                                                            r.courseCode &&
                                                            r.courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ===
                                                            getCleanCourseCode(group.courseCode).replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
                                                          ).length
                                                        }
                                                        )
                                                      </span>
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteTarget({ type: "course", value: group });
                                                      }}
                                                      style={{
                                                        background: "#fef2f2",
                                                        border: "1px solid #fecdd3",
                                                        cursor: "pointer",
                                                        color: "#ef4444",
                                                        padding: "6px 8px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        borderRadius: "8px",
                                                        transition: "background 0.2s"
                                                      }}
                                                      title="Delete Marksheet"
                                                    >
                                                      <FiTrash2 size={16} />
                                                    </button>
                                                    <FiBookOpen size={24} color="#3B8DB3" />
                                                  </div>
                                                </div>

                                                <h3 style={{ fontSize: "16px", color: "#0f172a", margin: "0 0 6px 0", fontWeight: 700, lineHeight: 1.4 }}>
                                                  {getCleanCourseTitle(group.courseCode) || "Assessment Marksheet"}
                                                </h3>

                                                <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                                                  Students Uploaded: <strong style={{ color: "#0f172a" }}>{studentCount}</strong>
                                                </p>

                                                {/* Assessment Correction Window Deadline Box */}
                                                {(() => {
                                                  const firstItem = group.items[0] || {};
                                                  const isClosed = Boolean(firstItem.isCorrectionClosed || (firstItem.correctionWindowEnd && new Date() > new Date(firstItem.correctionWindowEnd)));
                                                  const hasDeadline = Boolean(firstItem.correctionWindowEnd);
                                                  const formattedVal = timerValues[group.key] ?? (firstItem.correctionWindowEnd ? new Date(firstItem.correctionWindowEnd).toISOString().slice(0, 16) : "");

                                                  return (
                                                    <div
                                                      onClick={(e) => e.stopPropagation()}
                                                      style={{
                                                        marginTop: "16px",
                                                        padding: "14px 16px",
                                                        borderRadius: "12px",
                                                        background: isClosed ? "#fff1f2" : hasDeadline ? "#f0fdf4" : "#f8fafc",
                                                        border: `1px solid ${isClosed ? "#fecdd3" : hasDeadline ? "#bbf7d0" : "#cbd5e1"}`,
                                                        fontSize: "12.5px"
                                                      }}
                                                    >
                                                      <div style={{ fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px", color: isClosed ? "#be123c" : hasDeadline ? "#15803d" : "#475569" }}>
                                                        <FiClock size={15} />
                                                        {isClosed
                                                          ? `Marksheet Correction Locked (${firstItem.correctionWindowEnd ? new Date(firstItem.correctionWindowEnd).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Closed"})`
                                                          : hasDeadline
                                                          ? `Open for Student Correction until: ${new Date(firstItem.correctionWindowEnd).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                                                          : "No Correction Deadline Set"}
                                                      </div>

                                                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
                                                        <input
                                                          type="datetime-local"
                                                          value={formattedVal}
                                                          onChange={(e) => setTimerValues({ ...timerValues, [group.key]: e.target.value })}
                                                          style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none" }}
                                                        />
                                                        <button
                                                          onClick={() => handleSetAssessmentDeadline(group, timerValues[group.key])}
                                                          style={{ padding: "6px 14px", background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "12.5px" }}
                                                        >
                                                          Save
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSetAssessmentDeadline(group, timerValues[group.key] || null, !isClosed);
                                                          }}
                                                          style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: "6px 12px",
                                                            background: isClosed ? "#fee2e2" : "#f1f5f9",
                                                            color: isClosed ? "#be123c" : "#475569",
                                                            border: `1px solid ${isClosed ? "#fca5a5" : "#cbd5e1"}`,
                                                            borderRadius: "8px",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s ease"
                                                          }}
                                                          title={isClosed ? "Click to Unlock Marksheet Correction" : "Click to Lock Marksheet Correction"}
                                                        >
                                                          {isClosed ? <FiLock size={16} color="#be123c" /> : <FiUnlock size={16} color="#475569" />}
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}

                                                <div style={{
                                                  marginTop: "16px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "6px",
                                                  color: "#3B8DB3",
                                                  fontSize: "13px",
                                                  fontWeight: 600
                                                }}>
                                                  <span>View Student Marks</span>
                                                  <span>→</span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            // SELECTED COURSE DETAILED TABLE VIEW
            <div style={{ padding: 20 }}>
              {/* TOP COURSE HEADER BANNER */}
              <div
                style={{
                  padding: "20px 24px",
                  background: "linear-gradient(135deg, #2c4b66 0%, #3B8DB3 100%)",
                  borderRadius: "12px",
                  color: "#fff",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  boxShadow: "0 4px 12px rgba(59, 141, 179, 0.15)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                    <span
                      style={{
                        background: "#ffffff",
                        color: "#2c4b66",
                        fontWeight: 800,
                        fontSize: 16,
                        padding: "4px 14px",
                        borderRadius: 8,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {getCleanCourseCode(selectedCourseGroup?.courseCode)}
                    </span>
                    {getCleanCourseTitle(selectedCourseGroup?.courseCode) && (
                      <h2 style={{ margin: 0, fontSize: 18, color: "#ffffff", fontWeight: 700 }}>
                        {getCleanCourseTitle(selectedCourseGroup?.courseCode)}
                      </h2>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, opacity: 0.95, marginTop: 6 }}>
                    <span>📅 Session: <strong>{getCleanSession(selectedCourseGroup)}</strong></span>
                    <span>🎓 Level: <strong>{getCleanLevel(selectedCourseGroup)}</strong></span>
                    <span>📘 Term: <strong>{getCleanTerm(selectedCourseGroup)}</strong></span>
                    <span>📖 Course Type: <strong>Theory</strong></span>
                    <span>⏱️ Credit Hour: <strong>3</strong></span>
                    <span>🏛️ Dept: <strong>{getCleanDepartment(selectedCourseGroup)}</strong></span>
                    <span>👥 Total Students: <strong>{filteredAssessments.length}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setSelectedCourseGroup(null)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      height: "auto",
                      border: "1px solid rgba(255,255,255,0.4)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <FiArrowLeft size={14} /> Back to Courses
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: "course", value: selectedCourseGroup })}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      height: "auto",
                      border: "none",
                      background: "rgba(239, 68, 68, 0.9)",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <FiTrash2 size={14} /> Delete Marksheet
                  </button>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
                  <input
                    type="text"
                    placeholder="Search student ID, Name, or Session..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 36px",
                      border: "1px solid #E2EEF6",
                      borderRadius: 8,
                      fontSize: 14,
                      width: "100%",
                      outline: "none",
                    }}
                  />
                  <FiSearch
                    size={16}
                    color="#6B89A0"
                    style={{ position: "absolute", left: 12, top: 11 }}
                  />
                </div>
              </div>

              {loading ? (
                <div className="loading-state" style={{ padding: "40px 0" }}>
                  <div className="spinner" style={{ margin: "0 auto" }}></div>
                </div>
              ) : filteredAssessments.length === 0 ? (
                <div className="empty-state" style={{ padding: "60px 0" }}>
                  <FiFileText size={48} color="#6B89A0" />
                  <h3>No assessment records found</h3>
                  <p>Search query returned zero results</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center" }}>Student ID</th>
                        <th style={{ textAlign: "center" }}>Name</th>
                        <th style={{ textAlign: "center" }}>Attendance Score</th>
                        <th style={{ textAlign: "center" }}>Quiz Score</th>
                        <th style={{ textAlign: "center" }}>Assignment Score</th>
                        <th style={{ textAlign: "center" }}>Presentation Score</th>
                        <th style={{ textAlign: "center" }}>Total CA Marks</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssessments.map((record) => (
                        <tr key={record._id}>
                          <td style={{ fontWeight: 700, textAlign: "center" }}>{record.studentIdNumber}</td>
                          <td style={{ fontWeight: 600, textAlign: "center" }}>{record.studentId?.name || "N/A"}</td>
                          <td style={{ textAlign: "center" }}>{record.attendance}</td>
                          <td style={{ textAlign: "center" }}>{record.quiz}</td>
                          <td style={{ textAlign: "center" }}>{record.assignment}</td>
                          <td style={{ textAlign: "center" }}>{record.presentation}</td>
                          <td style={{ fontWeight: 700, color: "#10b981", textAlign: "center" }}>{record.totalMarks}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => setDeleteTarget({ type: "single", value: record })}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#ef4444",
                                padding: "4px",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                              title="Delete record"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="preview-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px", height: "auto" }}>
            <div className="preview-modal-header" style={{ borderBottom: "1px solid #fee2e2" }}>
              <h3 style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <FiAlertCircle size={20} />
                Confirm Deletion
              </h3>
            </div>
            <div className="preview-modal-body" style={{ padding: "20px" }}>
              {deleteTarget.type === "course" ? (
                <p style={{ margin: 0, fontSize: "15px", color: "#2C4B66", lineHeight: "1.5" }}>
                  Are you sure you want to delete the entire assessment marksheet for course{" "}
                  <strong>{deleteTarget.value?.courseCode}</strong>
                  {deleteTarget.value?.session && ` (Session: ${deleteTarget.value.session})`}
                  {deleteTarget.value?.department && ` (Dept: ${deleteTarget.value.department})`}? This will permanently remove all student marks associated with this marksheet. This action cannot be undone.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: "15px", color: "#2C4B66", lineHeight: "1.5" }}>
                  Are you sure you want to delete the assessment record for student{" "}
                  <strong>{deleteTarget.value.studentId?.name || deleteTarget.value.studentIdNumber}</strong> ({deleteTarget.value.studentIdNumber}) in course{" "}
                  <strong>{deleteTarget.value.courseCode}</strong>? This action cannot be undone.
                </p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget.type === "course") {
                    handleDeleteCourse(deleteTarget.value);
                  } else {
                    handleDeleteSingle(deleteTarget.value._id);
                  }
                }}
                className="btn-danger"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer"
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Correction Requests Modal for Teacher */}
      {viewRequestsModalGroup && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "750px", width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a", fontWeight: 700 }}>
                  📩 Student Correction Requests: <strong>{getCleanCourseCode(viewRequestsModalGroup.courseCode)}</strong>
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                  Review and reply to private assessment score issue messages sent by students
                </p>
              </div>
              <button onClick={() => setViewRequestsModalGroup(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: 4 }}>
                <FiX size={22} />
              </button>
            </div>

            {(() => {
              const targetCodeClean = getCleanCourseCode(viewRequestsModalGroup.courseCode).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
              const groupRequests = teacherRequests.filter(
                (r) => r.courseCode && r.courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === targetCodeClean
              );

              if (groupRequests.length === 0) {
                return (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    <FiMessageSquare size={42} style={{ opacity: 0.4, marginBottom: "12px" }} />
                    <h4 style={{ margin: "0 0 4px 0", color: "#475569" }}>No Correction Requests</h4>
                    <p style={{ margin: 0, fontSize: "13px" }}>No student correction requests have been submitted for this course yet.</p>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {groupRequests.map((req) => {
                    const isPending = req.status === "Pending";
                    const isReplied = req.status === "Replied";
                    const isResolved = req.status === "Resolved";

                    return (
                      <div
                        key={req._id}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "18px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <strong style={{ fontSize: "15px", color: "#0f172a" }}>{req.studentName}</strong>
                            <span style={{ fontSize: "13px", color: "#64748b", marginLeft: "8px" }}>
                              (ID: {req.studentId})
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background: isPending ? "#fef3c7" : isReplied ? "#dbeafe" : "#dcfce7",
                                color: isPending ? "#d97706" : isReplied ? "#1d4ed8" : "#15803d",
                              }}
                            >
                              {req.status}
                            </span>
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                              {new Date(req.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "14px", fontSize: "13.5px", color: "#334155", lineHeight: 1.5 }}>
                          <strong style={{ color: "#0369a1", display: "block", marginBottom: 2 }}>Student Issue Message:</strong>
                          {req.studentMessage ? req.studentMessage.replace(/^\[Assessment Marksheet Issue\]\s*/i, "") : ""}
                        </div>

                        {req.teacherReply && (
                          <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "14px", fontSize: "13px", color: "#166534" }}>
                            <strong>Your Sent Reply:</strong> {req.teacherReply}
                          </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <textarea
                            placeholder="Type your response to the student..."
                            rows={2}
                            value={replyTextMap[req._id] ?? req.teacherReply ?? ""}
                            onChange={(e) => setReplyTextMap({ ...replyTextMap, [req._id]: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "10px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                              fontFamily: "inherit"
                            }}
                          />
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => handleReplyStudentRequest(req._id, "Replied")}
                              disabled={submittingReplyId === req._id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 14px",
                                background: "#0284c7",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "12.5px",
                                cursor: "pointer"
                              }}
                            >
                              <FiSend size={13} /> Send Reply
                            </button>
                            {!isResolved && (
                              <button
                                type="button"
                                onClick={() => handleReplyStudentRequest(req._id, "Resolved")}
                                disabled={submittingReplyId === req._id}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "6px 14px",
                                  background: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontWeight: 600,
                                  fontSize: "12.5px",
                                  cursor: "pointer"
                                }}
                              >
                                <FiCheck size={13} /> Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
