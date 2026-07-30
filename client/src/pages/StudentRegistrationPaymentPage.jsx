import React, { useState, useEffect } from "react";
import StudentSidebar from "../components/StudentSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiPrinter,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
  FiFileText,
} from "react-icons/fi";
import "../styles/dashboard.css";
import PaymentCheckoutModal from "../components/PaymentCheckoutModal";
import RegistrationInvoiceModal from "../components/RegistrationInvoiceModal";

const FIXED_REGISTRATION_FEES = [
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
];
const FIXED_FEES_TOTAL = 3100;

export default function StudentRegistrationPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/registration-payments/history");
      setPayments(res.data.payments || []);
    } catch (err) {
      toast.error("Failed to load registration payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const activePayment = payments.length > 0 ? payments[0] : null;

  const handlePayNow = async (paymentId) => {
    setShowPaymentModal(true);
  };

  const handleRetryPayment = async (paymentId) => {
    try {
      await api.post(`/registration-payments/retry/${paymentId}`);
      toast.success("Payment session reset. You can now retry payment.");
      fetchPayments();
    } catch (err) {
      toast.error("Retry reset failed.");
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/registration-payments/receipt/${paymentId}`);
      setSelectedReceipt(res.data.receipt);
      setShowReceiptModal(true);
    } catch (err) {
      toast.error("Failed to load payment receipt.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="payments" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <FiCreditCard size={22} />
            </div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Semester Registration Payment</h1>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Pay your semester registration fees online anytime or view payment history and official money receipts.
          </p>
        </div>

        {/* Optional Info Banner */}
        <div style={{ background: "#e0f2fe", padding: "14px 20px", borderRadius: "12px", color: "#0369a1", fontSize: "13.5px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <FiAlertCircle size={22} />
          <div>
            <strong>Optional Payment Policy:</strong> Payment status does NOT block course registration approval or LMS class access. You can pay online whenever convenient.
          </div>
        </div>

        {/* Active Payment Card */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading payment details...</div>
        ) : activePayment ? (
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", marginBottom: "32px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#3b8db3", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Registration Fee</span>
                <h2 style={{ margin: "4px 0 0 0", color: "#0f172a", fontSize: "22px" }}>
                  {activePayment.level} {activePayment.term} ({activePayment.session})
                </h2>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  Student ID: <strong>{activePayment.studentId}</strong> • Dept: <strong>{activePayment.department}</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ padding: "6px 14px", borderRadius: "20px", fontWeight: 700, fontSize: "13px", background: activePayment.paymentStatus === "Paid" ? "#dcfce7" : activePayment.paymentStatus === "Failed" || activePayment.paymentStatus === "Cancelled" ? "#fee2e2" : "#fff7ed", color: activePayment.paymentStatus === "Paid" ? "#166534" : activePayment.paymentStatus === "Failed" || activePayment.paymentStatus === "Cancelled" ? "#991b1b" : "#c2410c", border: activePayment.paymentStatus === "Paid" ? "1px solid #bbf7d0" : "1px solid #fed7aa" }}>
                  Status: {activePayment.paymentStatus === "Paid" ? "Paid" : `Pending (Due: ৳${(activePayment.totalAmount || 0).toLocaleString()} BDT)`}
                </span>

                <button
                  onClick={() => setShowInvoiceModal(true)}
                  style={{
                    padding: "10px 18px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FiFileText size={16} /> View Registration Invoice
                </button>

                {(activePayment.paymentStatus === "Pending" || activePayment.paymentStatus === "Unpaid") && (
                  <button onClick={() => setShowPaymentModal(true)} disabled={processing} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "14px", cursor: processing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(22,163,74,0.3)" }}>
                    <FiCreditCard size={16} /> Pay ৳{activePayment.totalAmount?.toLocaleString()} Online Now (bKash/Nagad/Card)
                  </button>
                )}

                {(activePayment.paymentStatus === "Failed" || activePayment.paymentStatus === "Cancelled") && (
                  <button onClick={() => handleRetryPayment(activePayment._id)} style={{ padding: "10px 20px", background: "#f59e0b", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FiRefreshCw size={15} /> Retry Payment
                  </button>
                )}

                {activePayment.paymentStatus === "Paid" && (
                  <button onClick={() => handleViewReceipt(activePayment._id)} style={{ padding: "10px 20px", background: "#3b8db3", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FiPrinter size={15} /> Download Receipt / Slip
                  </button>
                )}
              </div>
            </div>

            {/* Courses Breakdown Table */}
            <h4 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "15px" }}>1. Selected Academic Courses</h4>
            <div style={{ overflowX: "auto", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                    <th style={{ padding: "10px 12px" }}>Course Code</th>
                    <th style={{ padding: "10px 12px" }}>Course Title</th>
                    <th style={{ padding: "10px 12px" }}>Type</th>
                    <th style={{ padding: "10px 12px" }}>Credit</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Course Fee (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {(activePayment.selectedCourses || []).map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{c.courseCode}</td>
                      <td style={{ padding: "10px 12px" }}>{c.courseTitle}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: c.courseType === "Sessional" ? "#fef3c7" : "#e0f2fe", color: c.courseType === "Sessional" ? "#b45309" : "#0369a1" }}>
                          {c.courseType}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{c.creditHours}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#3b8db3" }}>৳{(c.fee || (c.creditHours === 1 ? 100 : 300)).toLocaleString()} BDT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fixed Fees Serial List */}
            <h4 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "15px" }}>2. Fixed Institutional Fees</h4>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 12px", width: "40px" }}>#</th>
                    <th style={{ padding: "8px 12px" }}>Fee Item</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {FIXED_REGISTRATION_FEES.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "7px 12px", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: "7px 12px", color: "#1e293b" }}>{item.name}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>৳{item.amount.toLocaleString()} BDT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Fee Box */}
            <div style={{ background: "#f0fdf4", padding: "18px 20px", borderRadius: "12px", border: "1.5px solid #86efac", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "13.5px", color: "#166534" }}>
                Courses Subtotal: <strong>৳{((activePayment.selectedCourses || []).reduce((sum, c) => sum + (c.fee || (c.creditHours === 1 ? 100 : 300)), 0)).toLocaleString()}</strong> • Fixed Fees: <strong>৳{FIXED_FEES_TOTAL.toLocaleString()}</strong>
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Grand Total: <span style={{ color: "#16a34a" }}>৳{activePayment.totalAmount?.toLocaleString()} BDT</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "60px", background: "#ffffff", borderRadius: "16px", textAlign: "center", color: "#94a3b8", marginBottom: "32px" }}>
            <FiCreditCard size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3>No active registration payment required at this time</h3>
          </div>
        )}

        {/* Payment History Table */}
        <div style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "18px" }}>Payment History</h3>
          {payments.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No previous payment records found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                    <th style={{ padding: "10px 12px" }}>Semester</th>
                    <th style={{ padding: "10px 12px" }}>Amount</th>
                    <th style={{ padding: "10px 12px" }}>Txn ID</th>
                    <th style={{ padding: "10px 12px" }}>Payment Date</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                    <th style={{ padding: "10px 12px" }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{p.level} {p.term} ({p.session})</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#3b8db3" }}>৳{p.totalAmount?.toLocaleString()} BDT</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{p.transactionId || "N/A"}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "N/A"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: p.paymentStatus === "Paid" ? "#dcfce7" : "#fef3c7", color: p.paymentStatus === "Paid" ? "#166534" : "#b45309" }}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {p.paymentStatus === "Paid" && (
                          <button onClick={() => handleViewReceipt(p._id)} style={{ padding: "4px 10px", background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Printable Money Receipt / Academic Registration Slip Modal */}
        {showReceiptModal && selectedReceipt && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "32px", maxWidth: "750px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "2px solid #3b8db3", paddingBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>{selectedReceipt.universityName}</h2>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#3b8db3", marginTop: "2px" }}>Official Academic Registration Slip & Fee Receipt</div>
                </div>
                <button onClick={() => window.print()} style={{ padding: "6px 14px", background: "#3b8db3", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FiPrinter size={14} /> Print Academic Slip
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", marginBottom: "20px", background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div>Student Name: <strong>{selectedReceipt.studentName}</strong></div>
                <div>Student ID: <strong>{selectedReceipt.studentId}</strong></div>
                <div>Department: <strong>{selectedReceipt.department}</strong></div>
                <div>Level-Term: <strong>{selectedReceipt.levelTerm} ({selectedReceipt.session})</strong></div>
                <div>Transaction ID: <strong style={{ fontFamily: "monospace" }}>{selectedReceipt.transactionId}</strong></div>
                <div>Payment Status: <strong style={{ color: "#16a34a" }}>{selectedReceipt.paymentStatus}</strong></div>
              </div>

              {/* Courses Table with Individual Fees */}
              <h4 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "14.5px" }}>1. Registered Academic Courses</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "8px" }}>Course Code</th>
                    <th style={{ padding: "8px" }}>Course Title</th>
                    <th style={{ padding: "8px" }}>Type</th>
                    <th style={{ padding: "8px" }}>Credit</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>Course Fee (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReceipt.selectedCourses || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", fontWeight: 600, color: "#0f172a" }}>{c.courseCode}</td>
                      <td style={{ padding: "8px" }}>{c.courseTitle}</td>
                      <td style={{ padding: "8px" }}>{c.courseType}</td>
                      <td style={{ padding: "8px" }}>{c.creditHours}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#3b8db3" }}>৳{(c.fee || (c.creditHours === 1 ? 100 : 300)).toLocaleString()} BDT</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Fixed Fees Serial List Table */}
              <h4 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "14.5px" }}>2. Fixed Institutional Fees Schedule</h4>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "7px 10px", width: "40px" }}>#</th>
                      <th style={{ padding: "7px 10px" }}>Fee Item Description</th>
                      <th style={{ padding: "7px 10px", textAlign: "right" }}>Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReceipt.fixedFees || FIXED_REGISTRATION_FEES).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "6px 10px", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: "6px 10px", color: "#1e293b" }}>{item.name}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>৳{item.amount.toLocaleString()} BDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Banner */}
              <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "10px", border: "1.5px solid #86efac", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#334155" }}>
                  <span>Academic Courses Fee Subtotal:</span>
                  <strong>৳{(selectedReceipt.courseSubtotal || ((selectedReceipt.selectedCourses || []).reduce((sum, c) => sum + (c.fee || (c.creditHours === 1 ? 100 : 300)), 0))).toLocaleString()} BDT</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#334155" }}>
                  <span>Fixed Institutional Fees Subtotal (13 Items):</span>
                  <strong>৳{(selectedReceipt.fixedFeesTotal || FIXED_FEES_TOTAL).toLocaleString()} BDT</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px dashed #86efac", paddingTop: "10px", marginTop: "8px", fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
                  <span>Grand Total Paid Amount:</span>
                  <span style={{ color: "#16a34a" }}>৳{selectedReceipt.totalAmount?.toLocaleString()} BDT</span>
                </div>
              </div>

              <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button onClick={() => setShowReceiptModal(false)} style={{ padding: "8px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Online Payment Gateway Checkout Modal */}
        <PaymentCheckoutModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentRecord={activePayment}
          totalAmount={activePayment?.totalAmount || 0}
          onPaymentSuccess={() => {
            fetchPayments();
            setShowPaymentModal(false);
          }}
        />

        {/* Official Registration Invoice Modal */}
        <RegistrationInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          registrationId={activePayment?.registration || activePayment?._id}
          onPaymentSuccess={() => {
            fetchPayments();
          }}
        />
      </div>
    </div>
  );
}
