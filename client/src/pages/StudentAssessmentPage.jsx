import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUser,
  FiLogOut,
  FiFileText,
  FiCalendar,
  FiArrowLeft,
  FiBookOpen,
  FiInfo,
  FiAlertCircle,
  FiX,
  FiEdit3,
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentAssessmentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: courseId } = useParams(); // Selected course context if navigated from course dashboard

  const [assessments, setAssessments] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseLoading, setCourseLoading] = useState(Boolean(courseId));
  const [showRules, setShowRules] = useState(false);

  const [selectedRecordForIssue, setSelectedRecordForIssue] = useState(null);
  const [issueMessage, setIssueMessage] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  useEffect(() => {
    fetchAssessments();
    if (courseId) {
      setCourseLoading(true);
      api.get(`/courses/${courseId}`)
        .then((res) => {
          setCourseInfo(res.data.course);
        })
        .catch(() => {})
        .finally(() => {
          setCourseLoading(false);
        });
    } else {
      setCourseInfo(null);
      setCourseLoading(false);
    }
  }, [courseId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assessments/student");
      setAssessments(res.data.assessments);
    } catch (error) {
      toast.error("Failed to load your assessment marks");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIssueModal = (record) => {
    setSelectedRecordForIssue(record);
    setIssueMessage("");
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueMessage || !issueMessage.trim()) {
      toast.error("Please explain the issue regarding your assessment marks.");
      return;
    }
    setSubmittingIssue(true);
    try {
      await api.post("/results/request-correction", {
        courseCode: selectedRecordForIssue.courseCode,
        courseTitle: selectedRecordForIssue.courseCode,
        teacherEmail: selectedRecordForIssue.teacherEmail || "",
        studentMessage: `[Assessment Marksheet Issue] ${issueMessage.trim()}`,
      });
      toast.success("Correction request submitted to course teacher!");
      setSelectedRecordForIssue(null);
      setIssueMessage("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit correction request.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const isDataLoading = loading || (Boolean(courseId) && courseLoading);

  const displayedAssessments = courseId
    ? (courseInfo
        ? assessments.filter(
            (a) => (a.courseCode || "").trim().toLowerCase() === (courseInfo.displayCode || "").trim().toLowerCase()
          )
        : [])
    : assessments;

  return (
    <div className="dashboard-container">
      <StudentSidebar
        currentPage="assessment"
        courseId={courseId}
      />

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>
              {courseInfo ? `${courseInfo.displayCode} Assessment Marksheet` : "Personal Assessment Marksheet"}
            </h1>
            <p style={{ color: "#6b89a0", marginTop: 4 }}>
              {courseInfo
                ? `Viewing your assessment component scores for ${courseInfo.displayCode} - ${courseInfo.name}`
                : "Securely view all your assessment component scores and total CA marks"}
            </p>
          </div>
        </div>

        {/* ASSESSMENT STRUCTURE & RULES GUIDE */}
        <div style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          border: "1px solid #bae6fd",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
        }}>
          <div 
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} 
            onClick={() => setShowRules(!showRules)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FiInfo size={20} color="#0284c7" />
              <strong style={{ color: "#0369a1", fontSize: 15 }}>Assessment Score Structure & Evaluation Rules</strong>
            </div>
            <span style={{ fontSize: 13, color: "#0284c7", fontWeight: 600 }}>
              {showRules ? "Hide Rules ▲" : "View Breakdown Rules ▼"}
            </span>
          </div>
          {showRules && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #bae6fd", fontSize: 13, color: "#334155" }}>
              <p style={{ margin: "0 0 10px 0" }}>
                Continuous Assessment (CA) scores are uploaded directly by your course teacher using standard Excel marksheets:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div style={{ background: "#ffffff", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0369a1", display: "block" }}>1. Attendance Score</strong>
                  Calculated based on your presence percentage throughout the semester.
                </div>
                <div style={{ background: "#ffffff", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0369a1", display: "block" }}>2. Quiz & Tests</strong>
                  Consolidates best performances from class quizzes and tests.
                </div>
                <div style={{ background: "#ffffff", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0369a1", display: "block" }}>3. Assignment & Project</strong>
                  Marks evaluated for submitted assignments and lab reports.
                </div>
                <div style={{ background: "#ffffff", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0369a1", display: "block" }}>4. Presentation</strong>
                  Scores awarded for oral presentations or viva performance.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ASSESSMENT GRID/TABLE */}
        <div className="table-container">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #E2EEF6",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: "#2c4b66" }}>
              {courseInfo ? `${courseInfo.displayCode} Scores` : "My Assessment Scores"}
            </h2>
          </div>

          {isDataLoading ? (
            <div className="loading-state" style={{ padding: "40px 0" }}>
              <div className="spinner" style={{ margin: "0 auto" }}></div>
            </div>
          ) : displayedAssessments.length === 0 ? (
            <div className="empty-state" style={{ padding: "60px 0" }}>
              <FiFileText size={48} color="#6B89A0" />
              <h3>No assessment records found</h3>
              <p>
                {courseInfo
                  ? `Your teacher hasn't uploaded assessment marks for ${courseInfo.displayCode} yet`
                  : "Your teacher hasn't uploaded assessment marks for you yet"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Attendance Score</th>
                    <th>Quiz Score</th>
                    <th>Assignment Score</th>
                    <th>Presentation Score</th>
                    <th>Total CA Marks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAssessments.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <span className="status-badge ontime" style={{ background: "#E8F4FD", color: "#3B8DB3", fontWeight: 700 }}>
                          {record.courseCode}
                        </span>
                      </td>
                      <td>{record.attendance}</td>
                      <td>{record.quiz}</td>
                      <td>{record.assignment}</td>
                      <td>{record.presentation}</td>
                      <td style={{ fontWeight: 700, color: "#10b981", fontSize: 15 }}>
                        {record.totalMarks}
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenIssueModal(record)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            background: "#e0f2fe",
                            color: "#0369a1",
                            border: "1px solid #bae6fd",
                            fontWeight: 600,
                            fontSize: "12.5px",
                            cursor: "pointer",
                          }}
                        >
                          <FiEdit3 size={14} /> Request Correction
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Correction Request Modal */}
      {selectedRecordForIssue && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "520px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiAlertCircle color="#3b8db3" size={20} /> Request Assessment Mark Correction
              </h3>
              <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setSelectedRecordForIssue(null)} />
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>Course Code: {selectedRecordForIssue.courseCode}</div>
              <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                CA Total: {selectedRecordForIssue.totalMarks} Marks (Attendance: {selectedRecordForIssue.attendance}, Quiz: {selectedRecordForIssue.quiz}, Assignment: {selectedRecordForIssue.assignment}, Presentation: {selectedRecordForIssue.presentation})
              </div>
            </div>

            <form onSubmit={handleSubmitIssue}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Explain Discrepancy / Error Detail *
              </label>
              <textarea
                rows={4}
                value={issueMessage}
                onChange={(e) => setIssueMessage(e.target.value)}
                placeholder="e.g. My Quiz 2 marks were miscalculated or my presentation score was not updated..."
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", outline: "none", boxSizing: "border-box", marginBottom: "20px" }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setSelectedRecordForIssue(null)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingIssue} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#3b8db3", color: "#ffffff", fontWeight: 700, fontSize: "13px", cursor: submittingIssue ? "not-allowed" : "pointer" }}>
                  {submittingIssue ? "Sending..." : "Submit Correction Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
