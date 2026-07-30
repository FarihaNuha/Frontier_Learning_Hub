import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiX,
  FiClock,
  FiRefreshCw,
  FiUser,
  FiMessageSquare,
} from "react-icons/fi";
import TeacherSidebar from "../components/TeacherSidebar";
import "../styles/dashboard.css";

export default function TeacherRetakeApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRetakeRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/academic/teacher/retakes");
      setRequests(res.data.requests || []);
    } catch (err) {
      toast.error("Failed to load retake registration requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetakeRequests();
  }, []);

  const handleProcess = async (status) => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      await api.post(`/academic/teacher/retake-process/${selectedRequest._id}`, {
        status,
        comment,
      });

      toast.success(`Retake request ${status.toLowerCase()} successfully!`);
      setSelectedRequest(null);
      setComment("");
      fetchRetakeRequests();
    } catch (err) {
      toast.error(`Action failed.`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <TeacherSidebar currentPage="retake-approval" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiRefreshCw size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Retake Adviser Approvals
            </h1>
          </div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            Review and approve student retake registration requests. Approved students are automatically enrolled in the course roster.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading retake requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "60px", background: "#ffffff", borderRadius: "14px", textAlign: "center", color: "#94a3b8" }}>
            <FiRefreshCw size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3>No pending retake requests</h3>
            <p style={{ fontSize: "14px", margin: 0 }}>All student retake registration requests have been processed.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {requests.map((r) => (
              <div key={r._id} style={{ background: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ background: "rgba(59,141,179,0.12)", color: "#3b8db3", fontWeight: 700, padding: "4px 10px", borderRadius: "6px", fontSize: "13px" }}>
                        {r.courseCode}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a" }}>{r.courseTitle}</h3>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      Student: <strong>{r.studentName} ({r.studentId})</strong> • Target Session: <strong>{r.targetSession}</strong> • Previous Grade: <strong style={{ color: "#ef4444" }}>{r.previousGrade}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "12px", fontWeight: 700, fontSize: "12px", background: r.status === "Approved" ? "#dcfce7" : r.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: r.status === "Approved" ? "#166534" : r.status === "Rejected" ? "#991b1b" : "#b45309" }}>
                      {r.status}
                    </span>

                    {r.status === "Pending Adviser Approval" && (
                      <button onClick={() => setSelectedRequest(r)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#3b8db3", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>
                        Review Request
                      </button>
                    )}
                  </div>
                </div>

                {r.comment && (
                  <div style={{ fontSize: "12.5px", color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", marginTop: "8px" }}>
                    <strong>Adviser Note:</strong> {r.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Review Request Modal */}
        {selectedRequest && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "500px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>Review Retake Request</h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setSelectedRequest(null)} />
              </div>

              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "13.5px" }}>
                <div>Student: <strong>{selectedRequest.studentName} ({selectedRequest.studentId})</strong></div>
                <div>Course: <strong>{selectedRequest.courseCode} - {selectedRequest.courseTitle}</strong></div>
                <div>Target Session: <strong>{selectedRequest.targetSession}</strong></div>
              </div>

              <textarea
                placeholder="Optional adviser comment/instructions..."
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", outline: "none", boxSizing: "border-box", marginBottom: "20px" }}
              />

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button onClick={() => handleProcess("Rejected")} disabled={processing} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  <FiX size={15} /> Reject
                </button>
                <button onClick={() => handleProcess("Approved")} disabled={processing} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  <FiCheck size={15} /> Approve & Auto-Enroll
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
