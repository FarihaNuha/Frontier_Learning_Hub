import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiSearch,
  FiFilter,
  FiDownload,
  FiEye,
  FiX,
  FiDollarSign,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminRegistrationPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/registration-payments/admin/payments?status=${statusFilter}&department=${deptFilter}&session=${sessionFilter}&search=${encodeURIComponent(
          search
        )}`
      );
      setPayments(res.data.payments || []);
    } catch (err) {
      toast.error("Failed to load admin registration payment list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, deptFilter, sessionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error("No payment records to export.");
      return;
    }

    const headers = ["Student ID", "Student Name", "Department", "Level-Term", "Session", "Amount (BDT)", "Payment Status", "Transaction ID", "Payment Date"];
    const rows = payments.map((p) => [
      p.studentId,
      `"${p.studentName || ""}"`,
      p.department || "EDTE",
      `"${p.level} ${p.term}"`,
      p.session,
      p.totalAmount,
      p.paymentStatus,
      p.transactionId || "N/A",
      p.paymentDate ? new Date(p.paymentDate).toLocaleString() : "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Registration_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiCreditCard size={22} />
              </div>
              <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Registration Payment Management</h1>
            </div>
          </div>

          <button onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
            <FiDownload size={16} /> Export Payment Report (CSV)
          </button>
        </div>

        {/* Search and Filters */}
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
            <FiSearch size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Search Student ID, Name, or Transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%", fontSize: "13.5px" }}
            />
          </form>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
            <option value="all">All Sessions</option>
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
            <option value="2021-22">2021-22</option>
            <option value="2020-21">2020-21</option>
          </select>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading registration payments...</div>
        ) : (
          <div style={{ background: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                  <th style={{ padding: "10px 14px" }}>Student ID</th>
                  <th style={{ padding: "10px 14px" }}>Student Name</th>
                  <th style={{ padding: "10px 14px" }}>Level-Term</th>
                  <th style={{ padding: "10px 14px" }}>Session</th>
                  <th style={{ padding: "10px 14px" }}>Amount</th>
                  <th style={{ padding: "10px 14px" }}>Status</th>
                  <th style={{ padding: "10px 14px" }}>Txn ID</th>
                  <th style={{ padding: "10px 14px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{p.studentId}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{p.studentName || "N/A"}</td>
                    <td style={{ padding: "10px 14px" }}>{p.level} {p.term}</td>
                    <td style={{ padding: "10px 14px" }}>{p.session}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>৳{p.totalAmount} BDT</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "10px", fontWeight: 700, fontSize: "11.5px", background: p.paymentStatus === "Paid" ? "#dcfce7" : "#fee2e2", color: p.paymentStatus === "Paid" ? "#166534" : "#b91c1c" }}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{p.transactionId || "N/A"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => setSelectedPayment(p)} style={{ padding: "4px 10px", background: "#f1f5f9", color: "#334155", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                        <FiEye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Details Modal */}
        {selectedPayment && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "600px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>Registration Payment Details</h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setSelectedPayment(null)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", marginBottom: "16px" }}>
                <div>Student ID: <strong>{selectedPayment.studentId}</strong></div>
                <div>Student Name: <strong>{selectedPayment.studentName}</strong></div>
                <div>Level-Term: <strong>{selectedPayment.level} {selectedPayment.term}</strong></div>
                <div>Session: <strong>{selectedPayment.session}</strong></div>
                <div>Status: <strong style={{ color: selectedPayment.paymentStatus === "Paid" ? "#16a34a" : "#b45309" }}>{selectedPayment.paymentStatus}</strong></div>
                <div>Transaction ID: <strong style={{ fontFamily: "monospace" }}>{selectedPayment.transactionId || "N/A"}</strong></div>
              </div>

              {/* Previous Dues & Student Academic Payment History Section */}
              {selectedPayment.previousDuesInfo && (
                <div style={{ marginBottom: "20px" }}>
                  {selectedPayment.previousDuesInfo.hasUnpaidPreviousSemesters ? (
                    <div
                      style={{
                        background: "#fff1f2",
                        border: "1.5px solid #fecdd3",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "14px",
                      }}
                    >
                      <div style={{ color: "#be123c", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                        Previous Dues: ৳{selectedPayment.previousDuesInfo.totalUnpaidAmount.toLocaleString()} BDT Unpaid
                      </div>
                      <p style={{ margin: 0, color: "#9f1239", fontSize: "13px" }}>
                        This student has unpaid registration balances from previous semester(s) prior to {selectedPayment.level} {selectedPayment.term}.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1.5px solid #bbf7d0",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        marginBottom: "14px",
                        color: "#166534",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      All Previous Semester Dues Cleared (৳0 BDT Pending)
                    </div>
                  )}

                  {selectedPayment.previousDuesInfo.historyList?.length > 0 && (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#334155", fontSize: "13.5px" }}>
                        Student Academic Payment History (Prior Semesters):
                      </h4>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ background: "#e2e8f0", color: "#334155" }}>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Semester</th>
                            <th style={{ padding: "6px 10px", textAlign: "center" }}>Payment Status</th>
                            <th style={{ padding: "6px 10px", textAlign: "right" }}>Previous Dues (BDT)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPayment.previousDuesInfo.historyList.map((h, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "6px 10px", fontWeight: 600 }}>{h.levelTerm}</td>
                              <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "8px",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    background: h.status === "Paid" ? "#dcfce7" : "#fee2e2",
                                    color: h.status === "Paid" ? "#15803d" : "#b91c1c",
                                  }}
                                >
                                  {h.status}
                                </span>
                              </td>
                              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: h.status === "Paid" ? "#15803d" : "#be123c" }}>
                                {h.status === "Paid" ? "৳0 BDT" : `৳${h.dueAmount.toLocaleString()} BDT`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <h4 style={{ margin: "16px 0 8px 0", color: "#334155" }}>1. Courses Included in Registration Fee:</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569" }}>
                    <th style={{ padding: "8px" }}>Course Code</th>
                    <th style={{ padding: "8px" }}>Course Title</th>
                    <th style={{ padding: "8px" }}>Type</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Course Fee (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPayment.selectedCourses || []).map((c, i) => {
                    const credits = Number(c.creditHours) || 3;
                    const isLab = credits <= 1.5 || (c.courseType || "").toLowerCase().includes("sessional") || (c.courseType || "").toLowerCase().includes("lab");
                    const calculatedFee = c.fee || (isLab ? (credits === 1.5 ? 150 : 100) : 300);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{c.courseCode}</td>
                        <td style={{ padding: "8px" }}>{c.courseTitle}</td>
                        <td style={{ padding: "8px" }}>{c.courseType} ({credits} Cr)</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#3b8db3" }}>৳{calculatedFee.toLocaleString()} BDT</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <h4 style={{ margin: "16px 0 8px 0", color: "#334155" }}>2. Fixed Institutional Fees Schedule:</h4>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "6px 10px", width: "40px" }}>#</th>
                      <th style={{ padding: "6px 10px" }}>Fee Item</th>
                      <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "BNCC/Rover Scout/Ranger Fee", amount: 150 },
                      { name: "Celebration of National and Other Days", amount: 50 },
                      { name: "Cultural Fee", amount: 100 },
                      { name: "Departmental Seminar Fee", amount: 200 },
                      { name: "Exam Fee", amount: 500 },
                      { name: "Laboratory Fee", amount: 200 },
                      { name: "Medical Fee", amount: 100 },
                      { name: "Online Service Fee", amount: 300 },
                      { name: "Professional Organization Fees", amount: 100 },
                      { name: "Session Fee", amount: 1250 },
                      { name: "Society/Club Fee", amount: 50 },
                      { name: "Sports Fee", amount: 100 },
                      { name: "Deposit•SSLBKash Mobile Banking BKASH-BKash•BGT74852026061462966+", amount: 0 },
                    ].map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "6px 10px", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: "6px 10px", color: "#1e293b" }}>{item.name}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>৳{item.amount.toLocaleString()} BDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: "#f0fdf4", padding: "14px 16px", borderRadius: "10px", border: "1.5px solid #86efac", fontSize: "14px", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span>Grand Total Amount:</span>
                <span style={{ color: "#16a34a" }}>৳{selectedPayment.totalAmount?.toLocaleString()} BDT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
