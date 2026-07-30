import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiRefreshCw,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiBookOpen,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function StudentRetakeRegistrationPage() {
  const [failedCourses, setFailedCourses] = useState([]);
  const [existingRetakes, setExistingRetakes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [targetSession, setTargetSession] = useState("2023-24");
  const [submitting, setSubmitting] = useState(false);

  const fetchRetakeData = async () => {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        api.get("/academic/student/failed-courses"),
        api.get("/academic/student/profile"),
      ]);
      setFailedCourses(fRes.data.failedCourses || []);
      setExistingRetakes(pRes.data.retakes || []);
    } catch (err) {
      toast.error("Failed to load retake course data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetakeData();
  }, []);

  const handleSubmitRetake = async () => {
    if (!selectedCourse) {
      toast.error("Please select a failed course to retake.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/academic/student/retake-request", {
        courseCode: selectedCourse.courseCode,
        courseTitle: selectedCourse.courseTitle,
        creditHours: selectedCourse.creditHours,
        previousGrade: selectedCourse.letterGrade || "F",
        previousGradePoint: selectedCourse.gradePoint || 0.0,
        targetSession,
      });

      toast.success("Retake request submitted to Adviser!");
      setSelectedCourse(null);
      fetchRetakeData();
    } catch (err) {
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="retake-registration" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiRefreshCw size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Retake Course Registration
            </h1>
          </div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            Register to retake failed courses in upcoming sessions. Submissions require Adviser approval.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading failed courses...</div>
        ) : (
          <>
            {/* Failed Courses for Retake */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", marginBottom: "32px" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "18px" }}>
                Select Failed Course for Retake ({failedCourses.length})
              </h3>

              {failedCourses.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#166534", background: "#f0fdf4", borderRadius: "10px", fontWeight: 600 }}>
                  ✓ Great news! You have no failed courses pending retake.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                    {failedCourses.map((c) => {
                      const isSel = selectedCourse?.courseCode === c.courseCode;
                      return (
                        <div
                          key={c._id}
                          onClick={() => setSelectedCourse(c)}
                          style={{
                            padding: "18px",
                            borderRadius: "12px",
                            border: isSel ? "2px solid #3b8db3" : "1px solid #cbd5e1",
                            background: isSel ? "rgba(59,141,179,0.08)" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <span style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", fontSize: "12.5px" }}>
                              {c.courseCode}
                            </span>
                            <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "13px" }}>Grade: {c.letterGrade}</span>
                          </div>
                          <h4 style={{ margin: "0 0 6px 0", color: "#0f172a", fontSize: "15px" }}>{c.courseTitle}</h4>
                          <div style={{ fontSize: "12.5px", color: "#64748b" }}>Credits: {c.creditHours} • Session: {c.session}</div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedCourse && (
                    <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "12px" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "15px" }}>
                        Submit Retake Request: <strong>{selectedCourse.courseCode}</strong>
                      </h4>

                      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                            Target Session:
                          </label>
                          <select
                            value={targetSession}
                            onChange={(e) => setTargetSession(e.target.value)}
                            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", background: "#fff" }}
                          >
                            <option value="2023-24">Session 2023-24</option>
                            <option value="2024-25">Session 2024-25</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleSubmitRetake}
                        disabled={submitting}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: submitting ? "not-allowed" : "pointer" }}
                      >
                        <FiSend size={15} /> {submitting ? "Submitting..." : "Submit Retake Request to Adviser"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Existing Retake Requests History */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "18px" }}>
                Retake Registration Status ({existingRetakes.length})
              </h3>
              {existingRetakes.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No retake requests submitted yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                        <th style={{ padding: "10px 14px" }}>Course Code</th>
                        <th style={{ padding: "10px 14px" }}>Course Title</th>
                        <th style={{ padding: "10px 14px" }}>Prev Grade</th>
                        <th style={{ padding: "10px 14px" }}>Target Session</th>
                        <th style={{ padding: "10px 14px" }}>Status</th>
                        <th style={{ padding: "10px 14px" }}>Adviser Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingRetakes.map((r) => (
                        <tr key={r._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{r.courseCode}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{r.courseTitle}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#ef4444" }}>{r.previousGrade}</td>
                          <td style={{ padding: "10px 14px" }}>{r.targetSession}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "11.5px", background: r.status === "Approved" ? "#dcfce7" : r.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: r.status === "Approved" ? "#166534" : r.status === "Rejected" ? "#991b1b" : "#b45309" }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{r.comment || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
