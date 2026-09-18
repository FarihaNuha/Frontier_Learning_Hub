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

  // Retake Payment Modal State
  const [payingRetake, setPayingRetake] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState("bKash");
  const [processingPayment, setProcessingPayment] = useState(false);

  const calcRetakeFee = (credits) => {
    const c = Number(credits) || 3;
    return c <= 1 ? 100 : (c >= 3 ? 300 : Math.round(c * 100));
  };

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
      toast.error(err.response?.data?.error || err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayRetakeFee = async () => {
    if (!payingRetake) return;
    setProcessingPayment(true);
    try {
      const res = await api.post(`/academic/student/retake-pay/${payingRetake._id}`);
      toast.success(res.data.message || "Retake fee paid successfully! Course card enabled.");
      setPayingRetake(null);
      fetchRetakeData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Payment failed.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
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
          <p style={{ color: "#3B8DB3", fontWeight: 600, margin: 0, fontSize: "14.5px" }}>
            Register to retake failed courses in upcoming sessions. Adviser approval and online fee payment are required for target session course card access.
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
                  Great news! You have no failed courses pending retake.
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
                    <div style={{ background: "#E8F4FD", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "12px" }}>
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 20px",
                          background: submitting ? "#94a3b8" : "linear-gradient(135deg, #7EC8E3, #3B8DB3)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "13.5px",
                          cursor: submitting ? "not-allowed" : "pointer",
                          boxShadow: "0 4px 12px rgba(59,141,179,0.25)",
                          transition: "all 0.15s ease"
                        }}
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
                      <tr style={{ background: "#e2e8f0", color: "#0f172a", fontWeight: 700 }}>
                        <th style={{ padding: "10px 14px" }}>Course Code</th>
                        <th style={{ padding: "10px 14px" }}>Course Title</th>
                        <th style={{ padding: "10px 14px" }}>Prev Grade</th>
                        <th style={{ padding: "10px 14px" }}>Target Session</th>
                        <th style={{ padding: "10px 14px" }}>Adviser Status</th>
                        <th style={{ padding: "10px 14px" }}>Payment Status</th>
                        <th style={{ padding: "10px 14px" }}>Action</th>
                        <th style={{ padding: "10px 14px" }}>Adviser Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingRetakes.map((r) => {
                        const isApproved = r.status === "Approved";
                        const isPaid = r.paymentStatus === "Paid";
                        const feeAmount = r.amount || calcRetakeFee(r.creditHours);

                        return (
                          <tr key={r._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{r.courseCode}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{r.courseTitle}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#ef4444" }}>{r.previousGrade}</td>
                            <td style={{ padding: "10px 14px" }}>{r.targetSession}</td>
                            
                            {/* Adviser Status */}
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "11.5px", background: isApproved ? "#dcfce7" : r.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: isApproved ? "#166534" : r.status === "Rejected" ? "#991b1b" : "#b45309" }}>
                                {r.status}
                              </span>
                            </td>

                            {/* Payment Status */}
                            <td style={{ padding: "10px 14px" }}>
                              {isApproved ? (
                                isPaid ? (
                                  <span style={{ padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "11.5px", background: "#dcfce7", color: "#166534" }}>
                                    Paid ({r.amount || feeAmount} BDT)
                                  </span>
                                ) : (
                                  <span style={{ padding: "4px 10px", borderRadius: "12px", fontWeight: 700, fontSize: "11.5px", background: "#fef3c7", color: "#b45309" }}>
                                    Payment Due ({feeAmount} BDT)
                                  </span>
                                )
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>N/A (Pending Approval)</span>
                              )}
                            </td>

                            {/* Action / Pay Online Button */}
                            <td style={{ padding: "10px 14px" }}>
                              {isApproved ? (
                                isPaid ? (
                                  <span style={{ color: "#166534", fontWeight: 600, fontSize: "12.5px" }}>
                                    Course Card Enabled
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setPayingRetake(r)}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "8px",
                                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                                      color: "#ffffff",
                                      border: "none",
                                      fontWeight: 600,
                                      fontSize: "12.5px",
                                      cursor: "pointer",
                                      boxShadow: "0 2px 6px rgba(37,99,235,0.25)"
                                    }}
                                  >
                                    Pay Retake Fee ({feeAmount} BDT)
                                  </button>
                                )
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "12.5px" }}>Awaiting Approval</span>
                              )}
                            </td>

                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{r.comment || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Retake Payment Checkout Modal */}
        {payingRetake && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "480px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <h2 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "20px", fontWeight: 700 }}>
                Retake Course Online Fee Payment
              </h2>
              <p style={{ color: "#475569", fontSize: "14px", marginBottom: "20px", lineHeight: "1.5" }}>
                Complete the online fee payment for <strong>{payingRetake.courseCode} ({payingRetake.courseTitle})</strong> to unlock the <strong>{payingRetake.targetSession}</strong> session course card on your dashboard.
              </p>

              <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                  <span style={{ color: "#64748b" }}>Course Code:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{payingRetake.courseCode}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                  <span style={{ color: "#64748b" }}>Target Session:</span>
                  <span style={{ fontWeight: 700, color: "#2563eb" }}>{payingRetake.targetSession}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                  <span style={{ color: "#64748b" }}>Credit Hours:</span>
                  <span>{payingRetake.creditHours || 3} Credits</span>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid #cbd5e1", margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700 }}>
                  <span style={{ color: "#0f172a" }}>Total Payable Fee:</span>
                  <span style={{ color: "#16a34a" }}>{payingRetake.amount || calcRetakeFee(payingRetake.creditHours)} BDT</span>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                  Select Payment Gateway:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {["bKash Mobile Banking", "SSLCommerz / Cards"].map((gw) => (
                    <div
                      key={gw}
                      onClick={() => setSelectedGateway(gw)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: selectedGateway === gw ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        background: selectedGateway === gw ? "rgba(37,99,235,0.08)" : "#fff",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        textAlign: "center"
                      }}
                    >
                      {gw}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setPayingRetake(null)}
                  disabled={processingPayment}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayRetakeFee}
                  disabled={processingPayment}
                  style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: "13.5px", cursor: processingPayment ? "not-allowed" : "pointer" }}
                >
                  {processingPayment ? "Processing..." : `Confirm & Pay ${payingRetake.amount || calcRetakeFee(payingRetake.creditHours)} BDT`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
