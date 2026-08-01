import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiAward,
  FiBookOpen,
  FiLayers,
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiLock,
  FiUnlock,
  FiSend,
  FiX,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function StudentAcademicResultsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("Level 1 - Term 1");
  const [resultTypeTab, setResultTypeTab] = useState("Midterm"); // "Midterm" or "Final"

  const [studentRequests, setStudentRequests] = useState([]);
  const [selectedResultForIssue, setSelectedResultForIssue] = useState(null);
  const [issueMessage, setIssueMessage] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const fetchStudentRequests = async () => {
    try {
      const res = await api.get("/results/student/correction-requests");
      setStudentRequests(res.data.requests || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchStudentRequests();
  }, []);

  const handleSendCorrectionRequest = async () => {
    if (!issueMessage.trim()) {
      toast.error("Please write your issue message first.");
      return;
    }
    if (!selectedResultForIssue) return;

    setSubmittingIssue(true);
    try {
      await api.post("/results/correction-request", {
        uploadId: selectedResultForIssue.uploadId,
        resultId: selectedResultForIssue._id,
        courseCode: selectedResultForIssue.courseCode,
        courseTitle: selectedResultForIssue.courseTitle,
        teacherEmail: selectedResultForIssue.teacherEmail,
        studentMessage: issueMessage,
      });

      toast.success("Correction request sent to course teacher!");
      setIssueMessage("");
      setSelectedResultForIssue(null);
      fetchStudentRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request.");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const [studentRegistrationData, setStudentRegistrationData] = useState(null);

  useEffect(() => {
    api
      .get("/results/student")
      .then((res) => {
        setData(res.data);
        const keys = Object.keys(res.data.resultsByLevelTerm || {});
        if (keys.length > 0) {
          setSelectedSemester(keys[0]);
        }
      })
      .catch((err) => {
        toast.error("Failed to load published academic results.");
      })
      .finally(() => {
        setLoading(false);
      });

    api.get("/registration/my-status")
      .then((res) => {
        if (res.data) {
          setStudentRegistrationData(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const resultsByLevelTerm = data?.resultsByLevelTerm || {};

  const isResultsCardUnlocked = (cardIndex, semKey) => {
    const targetL = Math.ceil(cardIndex / 2);
    const targetT = cardIndex % 2 === 1 ? 1 : 2;
    const regs = studentRegistrationData?.registrations || [];
    const hasApprovedReg = regs.some((r) => {
      const rL = Number(String(r.level || "").replace(/[^0-9]/g, ""));
      const rT = Number(String(r.term || "").replace(/[^0-9]/g, ""));
      return rL === targetL && rT === targetT && (r.status === "Approved" || r.status === "Registered");
    });
    return hasApprovedReg;
  };

  // All 8 Level-Term Semesters
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

  // Filter semester results based on selected Midterm vs Final tab
  const rawSemesterResults = resultsByLevelTerm[selectedSemester] || [];
  const currentSemesterResults = rawSemesterResults.filter((r) => {
    if (resultTypeTab === "Midterm") {
      return r.resultType === "Midterm";
    }
    return r.resultType === "Final" || (!r.resultType && r.gradePoint !== null);
  });

  // Calculate Semester GPA
  const calculateGPA = (resultsList) => {
    if (!resultsList || resultsList.length === 0) return "N/A";

    const finalResultsOnly = resultsList.filter(r => r.resultType === "Final" || (!r.resultType && r.gradePoint !== null));
    if (finalResultsOnly.length === 0) return "N/A (Midterm)";

    const storedGPA = finalResultsOnly.find((r) => r.semesterGPA !== null && r.semesterGPA !== undefined)?.semesterGPA;
    if (storedGPA !== undefined && storedGPA !== null) return Number(storedGPA).toFixed(2);

    let totalPoints = 0;
    let totalCredits = 0;
    let validGradesCount = 0;

    finalResultsOnly.forEach((r) => {
      if (r.gradePoint !== null && r.gradePoint !== undefined) {
        const isLab = (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("lab") || (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("sessional");
        const cr = isLab ? 1 : (Number(r.creditHours) || 3);
        const gp = Number(r.gradePoint) || 0;
        totalPoints += gp * cr;
        totalCredits += cr;
        validGradesCount++;
      }
    });

    if (validGradesCount === 0 || totalCredits === 0) return "N/A";
    return (totalPoints / totalCredits).toFixed(2);
  };

  const currentSemesterGPA = calculateGPA(resultsByLevelTerm[selectedSemester]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="results" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiAward size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Result Publication Portal
            </h1>
          </div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            View published Mid Term and Final course results arranged by Level-Term cards, with complete GPA calculations.
          </p>
        </div>

        {/* Dual Mode Result Tabs: Mid Term Result vs Final Result */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
          <button
            onClick={() => setResultTypeTab("Midterm")}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              background: resultTypeTab === "Midterm" ? "linear-gradient(135deg, #7EC8E3, #3B8DB3)" : "#ffffff",
              color: resultTypeTab === "Midterm" ? "#ffffff" : "#475569",
              fontWeight: 700,
              fontSize: "14.5px",
              cursor: "pointer",
              boxShadow: resultTypeTab === "Midterm" ? "0 4px 14px rgba(59,141,179,0.25)" : "0 1px 3px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
            }}
          >
            Mid Term Result
          </button>
          <button
            onClick={() => setResultTypeTab("Final")}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              background: resultTypeTab === "Final" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "#ffffff",
              color: resultTypeTab === "Final" ? "#ffffff" : "#475569",
              fontWeight: 700,
              fontSize: "14.5px",
              cursor: "pointer",
              boxShadow: resultTypeTab === "Final" ? "0 4px 14px rgba(44,75,102,0.25)" : "0 1px 3px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
            }}
          >
            Final Result
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading published academic results...</div>
        ) : (
          <>
            {/* 1. Level-Term Cards Grid */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <FiLayers size={20} color="#3b8db3" />
                <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>Academic Level-Term Cards</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
                {levelTermSemesters.map((semKey, index) => {
                  const cardIndex = index + 1;
                  const unlocked = isResultsCardUnlocked(cardIndex, semKey);
                  const isLocked = !unlocked;
                  const count = (resultsByLevelTerm[semKey] || []).length;
                  const isSelected = selectedSemester === semKey && !isLocked;
                  const semGPA = calculateGPA(resultsByLevelTerm[semKey]);

                  return (
                    <div
                      key={semKey}
                      onClick={() => {
                        if (isLocked) {
                          toast.error(`Level ${Math.ceil(cardIndex / 2)} Term ${cardIndex % 2 === 1 ? 1 : 2} is locked. You can only view results up to your current Level-Term (${data?.student?.currentLevel ? `Level ${data.student.currentLevel} Term ${data.student.currentTerm}` : `Level 1 Term 1`}).`);
                          return;
                        }
                        setSelectedSemester(semKey);
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
                        padding: "20px",
                        cursor: isLocked ? "not-allowed" : "pointer",
                        opacity: isLocked ? 0.75 : 1,
                        boxShadow: isSelected ? "0 6px 20px rgba(59,141,179,0.25)" : "0 2px 6px rgba(0,0,0,0.03)",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: "15px" }}>{semKey}</div>
                        {isLocked ? <FiLock size={16} color="#94a3b8" /> : <FiBookOpen size={16} />}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                        <span style={{ fontSize: "12px", opacity: 0.9 }}>
                          {isLocked ? "Locked" : count > 0 ? `${count} Published Courses` : "No Results Yet"}
                        </span>
                        {isLocked ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: "#e2e8f0", color: "#64748b", padding: "3px 8px", borderRadius: "10px" }}>
                            🔒 Locked
                          </span>
                        ) : count > 0 ? (
                          <span style={{ fontSize: "11px", fontWeight: 800, background: isSelected ? "rgba(255,255,255,0.25)" : "#dcfce7", color: isSelected ? "#fff" : "#166534", padding: "3px 8px", borderRadius: "10px" }}>
                            GPA: {semGPA}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Selected Semester Result Roster */}
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>
                    Published Results: <strong>{selectedSemester}</strong>
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                    Official grade breakdown for {selectedSemester}
                  </p>
                </div>

                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "12px", padding: "10px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13.5px", color: "#166534", fontWeight: 700 }}>Semester GPA / CGPA:</span>
                  <span style={{ fontSize: "22px", fontWeight: 800, color: "#15803d" }}>
                    {currentSemesterGPA}
                  </span>
                </div>
              </div>

              {/* Lock Timer Banner for Active Semester */}
              {currentSemesterResults.length > 0 && (() => {
                const activeTimerRes = currentSemesterResults.find(r => r.correctionWindowEnd || r.isCorrectionClosed);
                if (!activeTimerRes) return null;

                const cDate = activeTimerRes.correctionWindowEnd ? new Date(activeTimerRes.correctionWindowEnd) : null;
                const isLocked = Boolean(activeTimerRes.isCorrectionClosed || (cDate && new Date() > cDate));
                const localTimeString = cDate ? cDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Deadline Passed";

                return (
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      background: isLocked ? "linear-gradient(135deg, #fee2e2, #fecaca)" : "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                      border: `1.5px solid ${isLocked ? "#dc2626" : "#0284c7"}`,
                      color: isLocked ? "#991b1b" : "#0369a1",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div style={{ fontSize: "26px", lineHeight: 1 }}>{isLocked ? "🚨" : "⏳"}</div>
                    <div style={{ flex: 1 }}>
                      {isLocked ? (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <strong style={{ fontSize: "15px", color: "#991b1b" }}>🔒 Correction Request Window Expired / Locked</strong>
                            <span style={{ background: "#dc2626", color: "#ffffff", padding: "3px 10px", borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}>
                              Deadline Passed
                            </span>
                          </div>
                          <div style={{ fontSize: "13px", color: "#7f1d1d", marginTop: "4px" }}>
                            The correction request window for this marksheet closed on <strong>{localTimeString}</strong>. No further correction requests or modifications can be submitted.
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <strong style={{ fontSize: "15px", color: "#0369a1" }}>🔓 Student Correction Window Open</strong>
                            <span style={{ background: "#0284c7", color: "#ffffff", padding: "3px 10px", borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}>
                              Open for Corrections
                            </span>
                          </div>
                          <div style={{ fontSize: "13px", color: "#0369a1", marginTop: "4px" }}>
                            If you notice any discrepancy in your marks, click <strong>"Request Correction"</strong> below before the deadline expires on <strong>{localTimeString}</strong>.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {currentSemesterResults.length === 0 ? (
                <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>
                  <FiClock size={44} style={{ opacity: 0.3, marginBottom: "10px" }} />
                  <p style={{ margin: 0, fontSize: "14.5px" }}>
                    No published results available yet for {selectedSemester}.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                        <th style={{ padding: "12px 14px" }}>Course Code</th>
                        <th style={{ padding: "12px 14px" }}>Course Title</th>
                        <th style={{ padding: "12px 14px" }}>Course Type</th>
                        <th style={{ padding: "12px 14px" }}>Credit Hours</th>
                        <th style={{ padding: "12px 14px" }}>MT Part A</th>
                        <th style={{ padding: "12px 14px" }}>MT Part B</th>
                        <th style={{ padding: "12px 14px" }}>FT Part A</th>
                        <th style={{ padding: "12px 14px" }}>FT Part B</th>
                        <th style={{ padding: "12px 14px" }}>Attendance</th>
                        <th style={{ padding: "12px 14px" }}>Continuous Assmt</th>
                        <th style={{ padding: "12px 14px" }}>Total</th>
                        <th style={{ padding: "12px 14px" }}>GPA</th>
                        <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSemesterResults.map((r) => {
                        const isExpired = Boolean(r.isCorrectionClosed || (r.correctionWindowEnd && new Date() > new Date(r.correctionWindowEnd)));
                        const existingReq = studentRequests.find((req) => req.resultId === r._id || (req.uploadId === r.uploadId && req.courseCode === r.courseCode));
                        const isBtnDisabled = isExpired && !existingReq;

                        const renderVal = (v) => {
                          if (v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-") {
                            return "-";
                          }
                          return v;
                        };

                        const isMidtermBatch = r.resultType === "Midterm" || (!r.finalPartA && !r.finalPartB && (r.gradePoint === null || r.gradePoint === undefined || r.gradePoint === 0) && (!r.letterGrade || r.letterGrade === "-"));
                        const courseGPAVal = isMidtermBatch
                          ? "-"
                          : (r.gradePoint !== null && r.gradePoint !== undefined && r.gradePoint !== "-" ? r.gradePoint : (r.letterGrade && r.letterGrade !== "-" ? r.letterGrade : "-"));

                        return (
                          <React.Fragment key={r._id}>
                            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px 14px", fontWeight: 700, color: "#3b8db3" }}>{r.courseCode}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a" }}>{r.courseTitle}</td>
                              <td style={{ padding: "12px 14px", color: "#64748b" }}>{r.courseType}</td>
                              <td style={{ padding: "12px 14px", color: "#64748b" }}>{r.creditHours}</td>
                              <td style={{ padding: "12px 14px" }}>{renderVal(r.midPartA)}</td>
                              <td style={{ padding: "12px 14px" }}>{renderVal(r.midPartB)}</td>
                              <td style={{ padding: "12px 14px" }}>{renderVal(r.finalPartA)}</td>
                              <td style={{ padding: "12px 14px" }}>{renderVal(r.finalPartB)}</td>
                              <td style={{ padding: "12px 14px" }}>{renderVal(r.attendance)}</td>
                              <td style={{ padding: "12px 14px" }}>{renderVal(r.continuousAssessment)}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{renderVal(r.totalMarks)}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 800, color: courseGPAVal === "-" ? "#64748b" : "#16a34a" }}>
                                {courseGPAVal}
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <button
                                  disabled={isBtnDisabled}
                                  onClick={() => {
                                    if (isExpired && !existingReq) {
                                      toast.error("The correction request window for this marksheet has expired.");
                                      return;
                                    }
                                    setSelectedResultForIssue(r);
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: isBtnDisabled ? "#e2e8f0" : existingReq ? "#0284c7" : "#3b8db3",
                                    color: isBtnDisabled ? "#94a3b8" : "#ffffff",
                                    fontWeight: 600,
                                    fontSize: "11.5px",
                                    cursor: isBtnDisabled ? "not-allowed" : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <FiMessageSquare size={13} />
                                  {existingReq ? "View / Update Request" : isExpired ? "🔒 Correction Closed" : "Correction Request"}
                                </button>
                              </td>
                            </tr>
                            {existingReq && (
                              <tr style={{ background: "#f8fafc" }}>
                                <td colSpan={13} style={{ padding: "10px 18px", fontSize: "12px" }}>
                                  <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                      <span style={{ fontWeight: 700, color: "#334155" }}>💬 Your Request to Teacher:</span>
                                      <span style={{ fontWeight: 700, color: existingReq.status === "Resolved" ? "#16a34a" : existingReq.status === "Replied" ? "#0284c7" : "#d97706" }}>
                                        Status: {existingReq.status}
                                      </span>
                                    </div>
                                    <div style={{ color: "#475569", marginBottom: "6px" }}>"{existingReq.studentMessage}"</div>
                                    {existingReq.teacherReply && (
                                      <div style={{ background: "#f0fdf4", borderLeft: "3px solid #16a34a", padding: "8px 12px", borderRadius: "4px", color: "#166534" }}>
                                        <strong>Teacher's Reply:</strong> {existingReq.teacherReply}
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
                    {/* Bottom Row showing Total Calculated CGPA */}
                    <tfoot>
                      <tr style={{ background: "#f0f9ff", borderTop: "2px solid #bae6fd", fontWeight: 800, fontSize: "14px", color: "#0369a1" }}>
                        <td colSpan={3} style={{ padding: "14px" }}>
                          TOTAL SEMESTER SUMMARY ({selectedSemester})
                        </td>
                        <td style={{ padding: "14px" }}>
                          {currentSemesterResults.reduce((acc, c) => acc + (Number(c.creditHours) || 0), 0)} Credits
                        </td>
                        <td colSpan={8} style={{ padding: "14px", textAlign: "right" }}>
                          Total Calculated Semester GPA / CGPA:
                        </td>
                        <td style={{ padding: "14px", fontSize: "16px", color: "#15803d" }}>
                          {currentSemesterGPA}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Private Correction Request Modal */}
        {selectedResultForIssue && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "520px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>
                  💬 Request Result Correction
                </h3>
                <button onClick={() => setSelectedResultForIssue(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}>
                  <FiX size={20} />
                </button>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", border: "1px solid #e2e8f0", fontSize: "13px" }}>
                <div><strong>Course:</strong> {selectedResultForIssue.courseCode} - {selectedResultForIssue.courseTitle}</div>
                <div style={{ marginTop: "4px", color: "#64748b" }}>Teacher Email: {selectedResultForIssue.teacherEmail}</div>
              </div>

              {selectedResultForIssue && (selectedResultForIssue.isCorrectionClosed || (selectedResultForIssue.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd))) && (
                <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", marginBottom: "16px", fontWeight: 700 }}>
                  🔒 Correction request window for this marksheet has expired. You cannot send new messages.
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Write your issue message for the course teacher:
                </label>
                <textarea
                  rows={4}
                  value={issueMessage}
                  disabled={Boolean(selectedResultForIssue?.isCorrectionClosed || (selectedResultForIssue?.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd)))}
                  onChange={(e) => setIssueMessage(e.target.value)}
                  placeholder="Describe your issue (e.g. Sir, my Midterm Part B score was 15 on my script, but recorded as 10)..."
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", outline: "none", background: (selectedResultForIssue?.isCorrectionClosed || (selectedResultForIssue?.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd))) ? "#f1f5f9" : "#ffffff" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setSelectedResultForIssue(null)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendCorrectionRequest}
                  disabled={submittingIssue || Boolean(selectedResultForIssue?.isCorrectionClosed || (selectedResultForIssue?.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd)))}
                  style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: (selectedResultForIssue?.isCorrectionClosed || (selectedResultForIssue?.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd))) ? "#cbd5e1" : "#3b8db3", color: "#ffffff", fontWeight: 700, fontSize: "13px", cursor: (selectedResultForIssue?.isCorrectionClosed || (selectedResultForIssue?.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd))) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FiSend size={14} />
                  {(selectedResultForIssue?.isCorrectionClosed || (selectedResultForIssue?.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd))) ? "Locked" : submittingIssue ? "Sending..." : "Submit to Teacher"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
