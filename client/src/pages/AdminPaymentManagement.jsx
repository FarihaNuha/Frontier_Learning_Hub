import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiDollarSign, FiEdit2, FiCheck, FiX } from "react-icons/fi";

export default function AdminPaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit payment state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/payments");
      setPayments(res.data);
    } catch (err) {
      toast.error("Failed to fetch payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const startEdit = (pay) => {
    setEditingId(pay._id);
    setEditData({
      paidAmount: pay.paidAmount,
      fineAmount: pay.fineAmount,
      paymentStatus: pay.paymentStatus,
    });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/ums/admin/payments/${id}`, editData);
      toast.success("Payment status updated successfully!");
      setEditingId(null);
      fetchPayments();
    } catch (err) {
      toast.error("Failed to update payment status.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Payment Records & Accounts</h1>
        <p style={{ color: "#64748b", margin: "4px 0 32px 0" }}>View student registration tuition fees, due amounts and edit payment status</p>

        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          {loading ? (
            <div>Loading payment ledger...</div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No payment records generated yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "12px" }}>Student ID</th>
                  <th style={{ padding: "12px" }}>Level & Term</th>
                  <th style={{ padding: "12px" }}>Total Amount</th>
                  <th style={{ padding: "12px" }}>Paid Amount</th>
                  <th style={{ padding: "12px" }}>Due Amount</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => {
                  const isEditing = editingId === pay._id;

                  return (
                    <tr key={pay._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px", fontWeight: "600" }}>{pay.studentId}</td>
                      <td style={{ padding: "12px" }}>{pay.level} {pay.term}</td>
                      <td style={{ padding: "12px" }}>৳{pay.totalAmount}</td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.paidAmount}
                            onChange={(e) => setEditData({ ...editData, paidAmount: e.target.value })}
                            style={{ width: "80px", padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                          />
                        ) : (
                          `৳${pay.paidAmount}`
                        )}
                      </td>
                      <td style={{ padding: "12px", color: pay.dueAmount > 0 ? "#b91c1c" : "#15803d", fontWeight: "600" }}>
                        ৳{pay.dueAmount}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <select
                            value={editData.paymentStatus}
                            onChange={(e) => setEditData({ ...editData, paymentStatus: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Paid">Paid</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: pay.paymentStatus === "Paid" ? "#dcfce7" : pay.paymentStatus === "Partial" ? "#fef3c7" : "#fee2e2",
                              color: pay.paymentStatus === "Paid" ? "#15803d" : pay.paymentStatus === "Partial" ? "#b45309" : "#b91c1c",
                            }}
                          >
                            {pay.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button onClick={() => saveEdit(pay._id)} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", padding: "6px" }}>
                              <FiCheck size={16} />
                            </button>
                            <button onClick={() => setEditingId(null)} style={{ background: "#64748b", color: "#fff", border: "none", borderRadius: "6px", padding: "6px" }}>
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(pay)} style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <FiEdit2 /> Update Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
