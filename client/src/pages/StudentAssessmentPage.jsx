import React, { useState, useEffect } from "react";
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
  FiLock,
  FiLayers,
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

  const [studentInfo, setStudentInfo] = useState(null);
  const [selectedLevelTerm, setSelectedLevelTerm] = useState("All");

  const [selectedRecordForIssue, setSelectedRecordForIssue] = useState(null);
  const [issueMessage, setIssueMessage] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [myRequests, setMyRequests] = useState([]);

  const levelTermSemesters = [
    "Level 1 - Term 1",
    "Level 1 - Term 2",
    "Level 2 - Term 1",
    "Level 2 - Term 2",
    "Level 3 - Term 1",
    "Level 3 - Term 2",
    "Level 4 - Term 1",
    "Level 4 - Term 2",
  ];

  useEffect(() => {
    api.get("/registration/my-status")
      .then((res) => {
        if (res.data) {
          setStudentInfo(res.data);
          const lvl = res.data.student?.currentLevel || res.data.currentLevel || 1;
          const trm = res.data.student?.currentTerm || res.data.currentTerm || 1;
          setSelectedLevelTerm(`Level ${lvl} - Term ${trm}`);
        }
      })
      .catch(() => {});
  }, []);

  const fetchMyRequests = async () => {
    try {
      const res = await api.get("/results/student/correction-requests");
      setMyRequests(res.data.requests || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchAssessments();
    fetchMyRequests();
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
      await api.post("/results/correction-request", {
        courseCode: selectedRecordForIssue.courseCode,
        courseTitle: selectedRecordForIssue.courseCode,
        teacherEmail: selectedRecordForIssue.uploadedBy?.email || selectedRecordForIssue.teacherEmail || "",
        studentMessage: issueMessage.trim(),
      });
      toast.success("Correction request submitted to course teacher!");
      setSelectedRecordForIssue(null);
      setIssueMessage("");
      fetchMyRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit correction request.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const isDataLoading = loading || (Boolean(courseId) && courseLoading);

  const rawAssessments = courseId
    ? (courseInfo
        ? assessments.filter(
            (a) => (a.courseCode || "").trim().toLowerCase() === (courseInfo.displayCode || "").trim().toLowerCase()
          )
        : [])
    : assessments;

  const displayedAssessments = selectedLevelTerm === "All"
    ? rawAssessments
    : rawAssessments.filter((a) => {
        const lvlTermStr = (a.levelTerm || a.level || "").toLowerCase();
        const selStr = selectedLevelTerm.toLowerCase();
        const lMatch = selStr.match(/level\s*(\d)/);
        const tMatch = selStr.match(/term\s*(\d)/);
        if (lMatch && tMatch) {
          const lNum = lMatch[1];
          const tNum = tMatch[1];
          return lvlTermStr.includes(lNum) && lvlTermStr.includes(tNum);
        }
        return true;
      });

  const isAssessmentCardUnlocked = (cardIndex) => {
    const targetL = Math.ceil(cardIndex / 2);
    const targetT = cardIndex % 2 === 1 ? 1 : 2;

    const regs = studentInfo?.registrations || [];
    const hasApprovedReg = regs.some((r) => {
      const rL = Number(String(r.level || "").replace(/[^0-9]/g, ""));
      const rT = Number(String(r.term || "").replace(/[^0-9]/g, ""));
      const isAppr = r.status === "Approved" || r.status === "Registered";
      return rL === targetL && rT === targetT && isAppr;
    });

    return hasApprovedReg;
  };

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

        {/* 8 LEVEL-TERM CARDS (Only on main page !courseId) */}
        {!courseId && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <FiLayers size={20} color="#3b8db3" />
              <h2 style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>Assessment Marksheet Level-Term Cards</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "14px" }}>
              {levelTermSemesters.map((semKey, idx) => {
                const cardIndex = idx + 1;
                const isLocked = !isAssessmentCardUnlocked(cardIndex);
                const isSelected = selectedLevelTerm === semKey && !isLocked;

                const cardAssessments = rawAssessments.filter((a) => {
                  const lt = (a.levelTerm || a.level || "").toLowerCase();
                  const lNum = Math.ceil(cardIndex / 2);
                  const tNum = cardIndex % 2 === 1 ? 1 : 2;
                  return lt.includes(String(lNum)) && lt.includes(String(tNum));
                });

                return (
                  <div
                    key={semKey}
                    onClick={() => {
                      if (isLocked) {
                        toast.error(`Level ${Math.ceil(cardIndex / 2)} Term ${cardIndex % 2 === 1 ? 1 : 2} is locked. Complete registration for previous semesters first.`);
                        return;
                      }
                      setSelectedLevelTerm(semKey);
                    }}
                    style={{
                      background: isLocked
                        ? "#f1f5f9"
                        : isSelected
                        ? "linear-gradient(135deg, #7EC8E3, #3B8DB3)"
                        : "#ffffff",
                      color: isLocked ? "#94a3b8" : isSelected ? "#ffffff" : "#1e293b",
                      border: isLocked
                        ? "1px dashed #cbd5e1"
                        : isSelected
                        ? "none"
                        : "1px solid #cbd5e1",
                      borderRadius: "14px",
                      padding: "18px",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      opacity: isLocked ? 0.75 : 1,
                      boxShadow: isSelected ? "0 6px 18px rgba(59,141,179,0.25)" : "0 2px 6px rgba(0,0,0,0.03)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: "14.5px" }}>{semKey}</div>
                      {isLocked ? <FiLock size={16} color="#94a3b8" /> : <FiBookOpen size={16} />}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                      <span style={{ fontSize: "12px", opacity: 0.9 }}>
                        {isLocked ? "Locked" : cardAssessments.length > 0 ? `${cardAssessments.length} Marksheets` : "No Marks Yet"}
                      </span>
                      {isLocked && (
                        <span style={{ fontSize: "11px", fontWeight: 700, background: "#e2e8f0", color: "#64748b", padding: "2px 7px", borderRadius: "10px" }}>
                          🔒 Locked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                  {displayedAssessments.map((record) => {
                    const recordCodeClean = (record.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                    const existingReq = myRequests.find(
                      (req) => req.courseCode && req.courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === recordCodeClean
                    );

                    return (
                      <React.Fragment key={record._id}>
                        <tr>
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
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {existingReq && (
                                <span style={{
                                  padding: "4px 10px",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  background: existingReq.status === "Resolved" ? "#dcfce7" : existingReq.status === "Replied" ? "#dbeafe" : "#fef3c7",
                                  color: existingReq.status === "Resolved" ? "#15803d" : existingReq.status === "Replied" ? "#1d4ed8" : "#d97706",
                                  border: existingReq.status === "Resolved" ? "1px solid #86efac" : existingReq.status === "Replied" ? "1px solid #93c5fd" : "1px solid #fcd34d",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}>
                                  {existingReq.status === "Resolved" ? "✓ Resolved" : existingReq.status === "Replied" ? "💬 Replied" : "⏳ Pending"}
                                </span>
                              )}
                              {(() => {
                                const isExpired = Boolean(
                                  record.isCorrectionClosed ||
                                  (record.correctionWindowEnd && new Date() > new Date(record.correctionWindowEnd))
                                );
                                return (
                                  <button
                                    onClick={() => handleOpenIssueModal(record)}
                                    disabled={isExpired}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      background: isExpired ? "#f1f5f9" : existingReq ? "#0284c7" : "#e0f2fe",
                                      color: isExpired ? "#94a3b8" : existingReq ? "#ffffff" : "#0369a1",
                                      border: isExpired ? "1px solid #cbd5e1" : existingReq ? "none" : "1px solid #bae6fd",
                                      fontWeight: 600,
                                      fontSize: "12.5px",
                                      cursor: isExpired ? "not-allowed" : "pointer",
                                    }}
                                    title={isExpired ? "Correction request window has expired." : "Submit correction request to teacher"}
                                  >
                                    {isExpired ? (
                                      <>🔒 Window Closed</>
                                    ) : (
                                      <>
                                        <FiEdit3 size={14} /> {existingReq ? "View / Update Request" : "Correction Request"}
                                      </>
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                        {existingReq && (
                          <tr style={{ background: "#f8fafc" }}>
                            <td colSpan={7} style={{ padding: "12px 18px", fontSize: "13px" }}>
                              <div style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "10px",
                                padding: "14px 18px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: 6 }}>
                                  <span style={{ fontWeight: 700, color: "#2c4b66", display: "flex", alignItems: "center", gap: 6 }}>
                                    💬 Your Submitted Correction Request:
                                  </span>
                                  <span style={{
                                    fontWeight: 800,
                                    fontSize: "12px",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    background: existingReq.status === "Resolved" ? "#dcfce7" : existingReq.status === "Replied" ? "#dbeafe" : "#fef3c7",
                                    color: existingReq.status === "Resolved" ? "#15803d" : existingReq.status === "Replied" ? "#1d4ed8" : "#d97706"
                                  }}>
                                    Status: {existingReq.status}
                                  </span>
                                </div>

                                <div style={{ color: "#334155", background: "#f1f5f9", padding: "10px 14px", borderRadius: "6px", marginBottom: "8px" }}>
                                  "{existingReq.studentMessage ? existingReq.studentMessage.replace(/^\[Assessment Marksheet Issue\]\s*/i, "") : ""}"
                                </div>

                                {existingReq.teacherReply ? (
                                  <div style={{
                                    background: "#f0fdf4",
                                    borderLeft: "4px solid #16a34a",
                                    padding: "10px 14px",
                                    borderRadius: "6px",
                                    color: "#166534",
                                    fontWeight: 500
                                  }}>
                                    <strong style={{ color: "#15803d" }}>Teacher's Reply:</strong> {existingReq.teacherReply}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                                    ⏳ Awaiting response from course teacher...
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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

            {Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd))) && (
              <div style={{ background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: "10px", padding: "12px 16px", color: "#be123c", fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>
                🔒 Marksheet Correction Locked: The deadline for submitting correction requests for this assessment closed on {selectedRecordForIssue.correctionWindowEnd ? new Date(selectedRecordForIssue.correctionWindowEnd).toLocaleString() : "Deadline Expiry"}. No further requests can be submitted.
              </div>
            )}

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
                disabled={Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd)))}
                onChange={(e) => setIssueMessage(e.target.value)}
                placeholder="e.g. My Quiz 2 marks were miscalculated or my presentation score was not updated..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: "20px",
                  background: Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd))) ? "#f1f5f9" : "#ffffff"
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setSelectedRecordForIssue(null)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue || Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd)))}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd))) ? "#cbd5e1" : "#3b8db3",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd))) ? "not-allowed" : "pointer"
                  }}
                >
                  {Boolean(selectedRecordForIssue.isCorrectionClosed || (selectedRecordForIssue.correctionWindowEnd && new Date() > new Date(selectedRecordForIssue.correctionWindowEnd))) ? "Window Closed" : submittingIssue ? "Sending..." : "Submit Correction Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
