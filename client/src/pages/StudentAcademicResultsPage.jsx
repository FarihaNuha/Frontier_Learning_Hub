import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  FiCreditCard,
  FiAlertTriangle,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function StudentAcademicResultsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState(null);
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

  // Check if student's registration payment is paid for a given semester
  const checkIsSemesterPaid = (semKey) => {
    if (data?.semesterPaymentStatus && data.semesterPaymentStatus[semKey] !== undefined) {
      return Boolean(data.semesterPaymentStatus[semKey]?.isPaid);
    }
    // Fallback using studentRegistrationData
    const lMatch = (semKey || "").match(/Level\s*(\d+)/i)?.[1];
    const tMatch = (semKey || "").match(/Term\s*(\d+)/i)?.[1];
    if (lMatch && tMatch && studentRegistrationData?.registrations) {
      const reg = studentRegistrationData.registrations.find((r) => {
        const rL = String(r.level || "").replace(/[^0-9]/g, "");
        const rT = String(r.term || "").replace(/[^0-9]/g, "");
        return rL === lMatch && rT === tMatch;
      });
      if (reg) {
        return reg.paymentStatus === "Paid";
      }
    }
    return false;
  };

  const isSelectedSemesterPaid = checkIsSemesterPaid(selectedSemester);

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
  const rawSemesterResults = selectedSemester ? (resultsByLevelTerm[selectedSemester] || []) : [];
  const currentSemesterResults = rawSemesterResults.filter((r) => {
    if (resultTypeTab === "Midterm") {
      if (r.resultType === "Midterm") return true;
      if (r.resultType === "Final" || !r.resultType) {
        const hasSeparateMidterm = rawSemesterResults.some(
          (other) => (other.courseCode || "").replace(/\s+/g, "").toUpperCase() === (r.courseCode || "").replace(/\s+/g, "").toUpperCase() && other.resultType === "Midterm"
        );
        if (hasSeparateMidterm) return false;
        return true;
      }
      return true;
    }
    return r.resultType === "Final" || (!r.resultType && r.gradePoint !== null);
  });

  // Calculate Semester GPA
  const calculateGPA = (resultsList) => {
    if (!resultsList || resultsList.length === 0) return "N/A";

    const finalResultsOnly = resultsList.filter(r => 
      (r.resultType === "Final" || (!r.resultType && r.gradePoint !== null)) &&
      (r.finalPartA !== null && r.finalPartA !== undefined && r.finalPartA !== "") &&
      (r.finalPartB !== null && r.finalPartB !== undefined && r.finalPartB !== "") &&
      r.gradePoint !== null && r.gradePoint !== undefined && !isNaN(Number(r.gradePoint)) && Number(r.gradePoint) >= 0
    );
    if (finalResultsOnly.length === 0) return "N/A";

    let totalPoints = 0;
    let totalCredits = 0;
    let validGradesCount = 0;

    finalResultsOnly.forEach((r) => {
      const isLab = (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("lab") || (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("sessional");
      const cr = isLab ? 1 : (Number(r.creditHours) || 3);
      const gp = Number(r.gradePoint) || 0;
      totalPoints += gp * cr;
      totalCredits += cr;
      validGradesCount++;
    });

    if (validGradesCount === 0 || totalCredits === 0) return "N/A";
    return (totalPoints / totalCredits).toFixed(2);
  };

  const currentSemesterGPA = calculateGPA(resultsByLevelTerm[selectedSemester]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      <StudentSidebar currentPage="results" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiAward size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Result Portal
            </h1>
          </div>
          <p style={{ color: "#3B8DB3", fontWeight: 600, margin: 0, fontSize: "14.5px" }}>
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
                  const semResults = resultsByLevelTerm[semKey] || [];
                  const uniqueCourseCodes = new Set(
                    semResults.map((r) => (r.courseCode || "").replace(/\s+/g, "").toUpperCase()).filter(Boolean)
                  );
                  const count = uniqueCourseCodes.size;
                  const isSelected = selectedSemester === semKey && !isLocked;
                  const isPaid = checkIsSemesterPaid(semKey);
                  const semGPA = calculateGPA(semResults);

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
                        {isLocked ? (
                          <FiLock size={16} color="#94a3b8" />
                        ) : resultTypeTab === "Final" && !isPaid ? (
                          <FiLock size={16} color={isSelected ? "#ffffff" : "#ea580c"} />
                        ) : (
                          <FiBookOpen size={16} />
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                        <span style={{ fontSize: "12px", opacity: 0.9 }}>
                          {isLocked ? "Upcoming Term" : count > 0 ? `${count} Published Courses` : "No Results Yet"}
                        </span>
                        {isLocked ? (
                          <span style={{ fontSize: "11px", fontWeight: 600, background: "#e2e8f0", color: "#64748b", padding: "3px 8px", borderRadius: "10px" }}>
                            Locked
                          </span>
                        ) : resultTypeTab === "Final" && !isPaid ? (
                          <span style={{ fontSize: "11px", fontWeight: 700, background: isSelected ? "rgba(255,255,255,0.25)" : "#ffedd5", color: isSelected ? "#fff" : "#c2410c", padding: "3px 8px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            Payment Due
                          </span>
                        ) : count > 0 && semGPA !== "N/A" ? (
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
            {!selectedSemester ? (
              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "40px 28px", textAlign: "center", border: "1.5px dashed #cbd5e1", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                <FiAward size={44} style={{ color: "#94a3b8", marginBottom: "10px", opacity: 0.4 }} />
                <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", color: "#334155", fontWeight: 700 }}>Select an Academic Level-Term Card</h3>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>Click on any unlocked Level-Term card above to view its published course results and GPA breakdown.</p>
              </div>
            ) : (
              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>
                      Published Results: <strong>{selectedSemester}</strong>
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "14.5px", color: "#3B8DB3", fontWeight: 600 }}>
                      Official grade breakdown for {selectedSemester}
                    </p>
                  </div>
                </div>

                {resultTypeTab === "Final" && !isSelectedSemesterPaid ? (
                  <div
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                      borderRadius: "14px",
                      border: "1.5px solid #fed7aa",
                      boxShadow: "0 4px 20px rgba(234,88,12,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "#ea580c",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 18px",
                        boxShadow: "0 6px 16px rgba(234,88,12,0.3)",
                      }}
                    >
                      <FiLock size={30} />
                    </div>
                    <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#9a3412", margin: "0 0 10px 0" }}>
                      Final Term Results Locked
                    </h3>
                    <p style={{ maxWidth: "560px", margin: "0 auto 22px", fontSize: "14.5px", color: "#c2410c", lineHeight: "1.6" }}>
                      Semester registration payment for <strong>{selectedSemester}</strong> is currently pending.
                      Final Term examination results, marks, and GPA grades are restricted until your registration fee payment is completed.
                    </p>
                    <button
                      onClick={() => navigate("/student/registration-payments")}
                      style={{
                        padding: "12px 28px",
                        borderRadius: "10px",
                        border: "none",
                        background: "linear-gradient(135deg, #ea580c, #c2410c)",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "14.5px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(234,88,12,0.35)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Pay Registration Fee to Unlock Results
                    </button>
                  </div>
                ) : currentSemesterResults.length === 0 ? (
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
                        <tr style={{ background: "linear-gradient(135deg, #bfe0f4 0%, #d4ebf8 100%)", borderBottom: "2px solid #3B8DB3", color: "#0369a1", fontWeight: 700 }}>
                          <th style={{ padding: "12px 14px", width: "110px" }}>Course Code</th>
                          <th style={{ padding: "12px 14px", minWidth: "220px" }}>Course Title</th>
                          <th style={{ padding: "12px 14px", width: "90px" }}>Course Type</th>
                          <th style={{ padding: "12px 14px", width: "85px" }}>Credit Hours</th>
                          <th style={{ padding: "12px 14px" }}>MT Part A</th>
                          <th style={{ padding: "12px 14px" }}>MT Part B</th>
                          {resultTypeTab === "Midterm" ? (
                            <>
                              <th style={{ padding: "12px 14px" }}>Total Midterm</th>
                              <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions & Deadline</th>
                            </>
                          ) : (
                            <>
                              <th style={{ padding: "12px 14px" }}>FT Part A</th>
                              <th style={{ padding: "12px 14px" }}>FT Part B</th>
                              <th style={{ padding: "12px 14px" }}>Attendance</th>
                              <th style={{ padding: "12px 14px" }}>Continuous Assmt</th>
                              <th style={{ padding: "12px 14px" }}>Total</th>
                              <th style={{ padding: "12px 14px" }}>GPA</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {currentSemesterResults.map((r) => {
                          const cDate = r.correctionWindowEnd ? new Date(r.correctionWindowEnd) : null;
                          const isExpired = Boolean(r.isCorrectionClosed || (cDate && new Date() > cDate));
                          const existingReq = studentRequests.find((req) => req.resultId === r._id || (req.uploadId === r.uploadId && req.courseCode === r.courseCode));
                          const isBtnDisabled = isExpired && !existingReq;
                          const deadlineFormatted = cDate ? cDate.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

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

                          const mtTotalVal = (r.midPartA !== null && r.midPartA !== undefined && r.midPartB !== null && r.midPartB !== undefined)
                            ? (Number(r.midPartA) || 0) + (Number(r.midPartB) || 0)
                            : renderVal(r.totalMarks);

                          return (
                            <React.Fragment key={r._id}>
                              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px 14px", fontWeight: 700, color: "#3b8db3" }}>{r.courseCode}</td>
                                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a" }}>{r.courseTitle}</td>
                                <td style={{ padding: "12px 14px", color: "#64748b" }}>{r.courseType}</td>
                                <td style={{ padding: "12px 14px", color: "#64748b" }}>{r.creditHours}</td>
                                <td style={{ padding: "12px 14px" }}>{renderVal(r.midPartA)}</td>
                                <td style={{ padding: "12px 14px" }}>{renderVal(r.midPartB)}</td>
                                {resultTypeTab === "Midterm" ? (
                                  <>
                                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{mtTotalVal}</td>
                                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                        <button
                                          disabled={isBtnDisabled}
                                          onClick={() => {
                                            if (isExpired && !existingReq) {
                                              toast.error("The correction request window for this course has expired.");
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
                                          {existingReq ? "View / Update Request" : isExpired ? <><FiLock size={12} /> Correction Closed</> : "Correction Request"}
                                        </button>
                                        {deadlineFormatted && (
                                          <span style={{ fontSize: "10.5px", color: isExpired ? "#ef4444" : "#0284c7", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                                            <FiClock size={10} /> {isExpired ? `Closed (${deadlineFormatted})` : `Ends: ${deadlineFormatted}`}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ padding: "12px 14px" }}>{renderVal(r.finalPartA)}</td>
                                    <td style={{ padding: "12px 14px" }}>{renderVal(r.finalPartB)}</td>
                                    <td style={{ padding: "12px 14px" }}>{renderVal(r.attendance)}</td>
                                    <td style={{ padding: "12px 14px" }}>{renderVal(r.continuousAssessment)}</td>
                                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{renderVal(r.totalMarks)}</td>
                                    <td style={{ padding: "12px 14px", fontWeight: 800, color: courseGPAVal === "-" ? "#64748b" : "#16a34a" }}>
                                      {courseGPAVal}
                                    </td>
                                  </>
                                )}
                              </tr>
                              {resultTypeTab === "Midterm" && existingReq && (
                                <tr style={{ background: "#e2e8f0", color: "#0f172a" }}>
                                  <td colSpan={8} style={{ padding: "10px 18px", fontSize: "12px" }}>
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
                      {/* Bottom Row showing Total Calculated Term GPA */}
                      <tfoot>
                        <tr style={{ background: "#f0f9ff", borderTop: "2px solid #bae6fd", fontWeight: 800, fontSize: "14px", color: "#0369a1" }}>
                          <td colSpan={3} style={{ padding: "14px" }}>
                            TOTAL SEMESTER SUMMARY ({selectedSemester})
                          </td>
                          <td style={{ padding: "14px" }}>
                            {currentSemesterResults.reduce((acc, c) => acc + (Number(c.creditHours) || 0), 0)} Credits
                          </td>
                          {resultTypeTab === "Midterm" ? (
                            <td colSpan={4} style={{ padding: "14px", textAlign: "right", color: "#3b8db3" }}>
                              {currentSemesterResults.length} Midterm Course(s) Published
                            </td>
                          ) : (
                            <>
                              <td colSpan={7} style={{ padding: "14px", textAlign: "right" }}>
                                Term GPA:
                              </td>
                              <td style={{ padding: "14px", fontSize: "16px", color: "#15803d", fontWeight: 800 }}>
                                {currentSemesterGPA}
                              </td>
                            </>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
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

              <div style={{ background: "#E8F4FD", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", border: "1px solid #e2e8f0", fontSize: "13px" }}>
                <div><strong>Course:</strong> {selectedResultForIssue.courseCode} - {selectedResultForIssue.courseTitle}</div>
                <div style={{ marginTop: "4px", color: "#64748b" }}>Teacher Email: {selectedResultForIssue.teacherEmail}</div>
              </div>

              {selectedResultForIssue && (selectedResultForIssue.isCorrectionClosed || (selectedResultForIssue.correctionWindowEnd && new Date() > new Date(selectedResultForIssue.correctionWindowEnd))) && (
                <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", marginBottom: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <FiLock size={15} /> Correction request window for this marksheet has expired. You cannot send new messages.
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
