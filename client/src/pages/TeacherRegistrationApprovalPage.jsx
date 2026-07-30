import React, { useState, useEffect } from "react";
import TeacherSidebar from "../components/TeacherSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiCheckCircle, FiXCircle, FiList, FiEye } from "react-icons/fi";
import RegistrationInvoiceModal from "../components/RegistrationInvoiceModal";

export default function TeacherRegistrationApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/registration/adviser/pending");
      setRequests(res.data);
    } catch (err) {
      toast.error("Failed to fetch pending registration requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.post(`/registration/adviser/approve/${id}`);
      toast.success("Registration approved and LMS enrollments created!");
      fetchPending();
      setSelectedReg(null);
    } catch (err) {
      toast.error("Failed to approve registration.");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter rejection reason for student:");
    if (reason === null) return;

    try {
      await api.post(`/registration/adviser/reject/${id}`, { reason });
      toast.success("Registration request rejected.");
      fetchPending();
      setSelectedReg(null);
    } catch (err) {
      toast.error("Failed to reject registration.");
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm("Are you sure you want to approve ALL pending registration requests for your batch?")) return;
    try {
      await api.post("/registration/adviser/approve-all");
      toast.success("All pending registrations approved successfully!");
      fetchPending();
    } catch (err) {
      toast.error("Failed to approve all requests.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <TeacherSidebar />
      <div style={{ flex: 1, padding: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Registration Approval</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>
              Review and approve academic course registrations for your assigned advising batch
            </p>
          </div>

          {requests.length > 0 && (
            <button
              onClick={handleApproveAll}
              style={{
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.2)",
              }}
            >
              Approve All Requests
            </button>
          )}
        </div>

        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiList /> Pending Registration Requests ({requests.length})
          </h3>

          {loading ? (
            <div>Loading pending requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No pending course registration requests found for your assigned advising batch.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "12px" }}>Student ID</th>
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Level & Term</th>
                  <th style={{ padding: "12px" }}>Total Credits</th>
                  <th style={{ padding: "12px" }}>Payment Status</th>
                  <th style={{ padding: "12px" }}>Submitted Date</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((reg) => (
                  <tr key={reg._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: "600", color: "#3b8db3" }}>{reg.studentId}</td>
                    <td style={{ padding: "12px" }}>{reg.user?.name || "Student"}</td>
                    <td style={{ padding: "12px" }}>{reg.level} {reg.term}</td>
                    <td style={{ padding: "12px" }}>{reg.totalCredits} Credits</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: reg.paymentStatus === "Paid" ? "#dcfce7" : "#fef3c7",
                          color: reg.paymentStatus === "Paid" ? "#15803d" : "#b45309",
                        }}
                      >
                        {reg.paymentStatus === "Paid" ? `Paid (৳${(reg.totalAmount || 3100).toLocaleString()})` : `Pending (Due: ৳${(reg.dueAmount || reg.totalAmount || 3100).toLocaleString()})`}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>{new Date(reg.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={() => setSelectedReg(reg)}
                          style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}
                        >
                          <FiEye /> Details
                        </button>
                        <button
                          onClick={() => handleApprove(reg._id)}
                          style={{ background: "#dcfce7", color: "#15803d", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}
                        >
                          <FiCheckCircle /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(reg._id)}
                          style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}
                        >
                          <FiXCircle /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal details */}
        {selectedReg && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", width: "560px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <h2 style={{ margin: "0 0 16px 0", color: "#0f172a" }}>Registration Details</h2>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13.5px" }}>
                <div><strong>Student ID:</strong> {selectedReg.studentId}</div>
                <div><strong>Department:</strong> {selectedReg.department}</div>
                <div><strong>Total Credits:</strong> {selectedReg.totalCredits} Credits</div>
                <div><strong>Submitted Date:</strong> {new Date(selectedReg.createdAt).toLocaleDateString()}</div>
                <div style={{ gridColumn: "span 2", borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
                  <strong>Fee & Payment Status: </strong>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: selectedReg.paymentStatus === "Paid" ? "#dcfce7" : "#fef3c7",
                      color: selectedReg.paymentStatus === "Paid" ? "#15803d" : "#b45309",
                      marginLeft: "6px",
                    }}
                  >
                    {selectedReg.paymentStatus === "Paid"
                      ? `Paid (৳${(selectedReg.totalAmount || 3100).toLocaleString()} BDT)`
                      : `Pending Payment (Due: ৳${(selectedReg.dueAmount || selectedReg.totalAmount || 3100).toLocaleString()} BDT)`}
                  </span>
                  {selectedReg.transactionId && (
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Transaction ID: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#334155" }}>{selectedReg.transactionId}</span>
                    </div>
                  )}
                </div>
              </div>

              <h3 style={{ margin: "0 0 10px 0", color: "#334155", fontSize: "15px" }}>Selected Courses</h3>
              <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "13.5px", color: "#1e293b", display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedReg.selectedCourses.map((c, i) => (
                  <li key={i}>
                    <strong>{c.courseCode}</strong> - {c.courseTitle} ({c.creditHours} Credits)
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  style={{ background: "#0284c7", color: "#ffffff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  📄 View Printable Invoice
                </button>
                <button onClick={() => setSelectedReg(null)} style={{ background: "#cbd5e1", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px", color: "#334155" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Official Registration Invoice Modal */}
        <RegistrationInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          registrationId={selectedReg?._id}
        />
      </div>
    </div>
  );
}
