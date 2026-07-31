import React, { useState, useEffect } from "react";
import StudentSidebar from "../components/StudentSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiPrinter,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
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
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState(null);
  const [selectedRegIdForInvoice, setSelectedRegIdForInvoice] = useState(null);
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

  const totalRegisteredSemesters = payments.length;
  const totalPaidAmount = payments
    .filter((p) => p.paymentStatus === "Paid")
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalDueAmount = payments
    .filter((p) => p.paymentStatus !== "Paid")
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const handlePayForSemester = (paymentItem) => {
    setSelectedPaymentForModal(paymentItem);
    setShowPaymentModal(true);
  };

  const handleViewInvoiceForSemester = (regId) => {
    setSelectedRegIdForInvoice(regId);
    setShowInvoiceModal(true);
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="payments" />

      <div style={{ flex: 1, padding: "36px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiCreditCard size={22} />
              </div>
              <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px", fontWeight: 800 }}>
                Semester Registration Payments
              </h1>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14.5px" }}>
              Comprehensive payment portal for all registered level-term semesters, course fee breakdowns, and payment statuses.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ background: "#ffffff", padding: "10px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Registered Semesters</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{totalRegisteredSemesters} Semesters</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>Total Fees Paid</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#16a34a" }}>৳{totalPaidAmount.toLocaleString()} BDT</div>
            </div>
            <div style={{ background: "#ffffff", padding: "10px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: "11px", color: totalDueAmount > 0 ? "#c2410c" : "#166534", fontWeight: 700, textTransform: "uppercase" }}>Total Outstanding Due</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: totalDueAmount > 0 ? "#ea580c" : "#16a34a" }}>৳{totalDueAmount.toLocaleString()} BDT</div>
            </div>
          </div>
        </div>

        {/* Formal Academic Payment Policy Banner */}
        <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", color: "#334155", fontSize: "14px", marginBottom: "28px", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <FiAlertCircle size={22} style={{ color: "#0284c7" }} />
          <div>
            <strong style={{ color: "#0f172a" }}>Semester Registration Fee Notice:</strong>{" "}
            Course registration approval and LMS class materials remain fully accessible regardless of payment status. You may complete your semester registration fee payments online whenever convenient.
          </div>
        </div>

        {/* Semester Payment Status Summary Table */}
        {!loading && payments.length > 0 && (
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", marginBottom: "32px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "17px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
              <FiCreditCard style={{ color: "#3b8db3" }} /> Registered Semesters Payment Overview
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700, borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "12px 16px" }}>Semester (Level & Term)</th>
                    <th style={{ padding: "12px 16px" }}>Session</th>
                    <th style={{ padding: "12px 16px" }}>Total Fee (BDT)</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => {
                    const isP = p.paymentStatus === "Paid";
                    return (
                      <tr key={p._id || idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>
                          {p.level} {p.term}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>
                          {p.session || "N/A"}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: "#0284c7" }}>
                          ৳{(p.totalAmount || 0).toLocaleString()} BDT
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "16px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: isP ? "#dcfce7" : "#fff7ed",
                              color: isP ? "#15803d" : "#c2410c",
                              border: `1px solid ${isP ? "#86efac" : "#fed7aa"}`,
                            }}
                          >
                            {isP ? "Paid in Full" : `Pending (Due: ৳${(p.totalAmount || 0).toLocaleString()} BDT)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "15px" }}>Loading registration payment history...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: "60px", background: "#ffffff", borderRadius: "16px", textAlign: "center", color: "#94a3b8", border: "1px solid #cbd5e1" }}>
            <FiCreditCard size={48} style={{ opacity: 0.4, marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>No Registered Semesters Found</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>You have not submitted course registration for any semester yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {payments.map((payment, index) => {
              const isPaid = payment.paymentStatus === "Paid";
              const isFailed = payment.paymentStatus === "Failed" || payment.paymentStatus === "Cancelled";
              const coursesSubtotal = (payment.selectedCourses || []).reduce(
                (sum, c) => sum + (c.fee || (c.creditHours === 1 ? 100 : 300)),
                0
              );

              return (
                <div
                  key={payment._id || index}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "28px",
                    boxShadow: isPaid ? "0 4px 16px rgba(22, 163, 74, 0.06)" : "0 4px 16px rgba(234, 88, 12, 0.08)",
                    border: `1.5px solid ${isPaid ? "#bbf7d0" : isFailed ? "#fca5a5" : "#fed7aa"}`,
                  }}
                >
                  {/* Card Top Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px", background: "#e0f2fe", padding: "3px 10px", borderRadius: "12px" }}>
                          Semester #{payments.length - index}
                        </span>
                        {payment.session && (
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", background: "#f1f5f9", padding: "3px 10px", borderRadius: "12px" }}>
                            Session {payment.session}
                          </span>
                        )}
                      </div>
                      <h2 style={{ margin: "8px 0 0 0", color: "#0f172a", fontSize: "22px", fontWeight: 800 }}>
                        {payment.level} {payment.term}
                      </h2>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                        Student ID: <strong>{payment.studentId}</strong> • Department: <strong>{payment.department || "EDTE"}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "6px 16px",
                          borderRadius: "20px",
                          fontWeight: 700,
                          fontSize: "13.5px",
                          background: isPaid ? "#dcfce7" : isFailed ? "#fee2e2" : "#fff7ed",
                          color: isPaid ? "#15803d" : isFailed ? "#991b1b" : "#c2410c",
                          border: `1px solid ${isPaid ? "#86efac" : isFailed ? "#fca5a5" : "#fed7aa"}`,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {isPaid ? (
                          <>
                            <FiCheckCircle size={16} /> Paid in Full (Txn: {payment.transactionId || "N/A"})
                          </>
                        ) : (
                          <>
                            <FiAlertCircle size={16} /> Due Amount: ৳{(payment.totalAmount || 0).toLocaleString()} BDT
                          </>
                        )}
                      </span>

                      {/* Official Registration Document (Invoice & Slip) */}
                      <button
                        onClick={() => handleViewInvoiceForSemester(payment.registration || payment._id)}
                        style={{
                          padding: "10px 18px",
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "13.5px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {isPaid ? <FiPrinter size={16} /> : <FiFileText size={16} />}
                        {isPaid ? "Official Money Receipt & Slip" : "Official Registration Invoice"}
                      </button>

                      {!isPaid && (
                        <button
                          onClick={() => handlePayForSemester(payment)}
                          style={{
                            padding: "10px 20px",
                            background: "linear-gradient(135deg, #16a34a, #15803d)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "13.5px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                          }}
                        >
                          <FiCreditCard size={16} /> Pay Online (৳{payment.totalAmount?.toLocaleString()} BDT)
                        </button>
                      )}

                      {isFailed && (
                        <button
                          onClick={() => handleRetryPayment(payment._id)}
                          style={{
                            padding: "10px 16px",
                            background: "#f59e0b",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "13.5px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <FiRefreshCw size={15} /> Retry Session
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registered Courses Table */}
                  <h4 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "15px", fontWeight: 700 }}>
                    1. Registered Academic Courses Roster
                  </h4>
                  <div style={{ overflowX: "auto", marginBottom: "20px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "10px 14px" }}>Code</th>
                          <th style={{ padding: "10px 14px" }}>Course Title</th>
                          <th style={{ padding: "10px 14px" }}>Type</th>
                          <th style={{ padding: "10px 14px" }}>Credit</th>
                          <th style={{ padding: "10px 14px", textAlign: "right" }}>Course Fee (BDT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payment.selectedCourses || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>No registered courses listed for this semester.</td>
                          </tr>
                        ) : (
                          (payment.selectedCourses || []).map((c, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{c.courseCode}</td>
                              <td style={{ padding: "10px 14px", color: "#334155" }}>{c.courseTitle}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    background: c.courseType === "Sessional" ? "#fef3c7" : "#e0f2fe",
                                    color: c.courseType === "Sessional" ? "#b45309" : "#0369a1",
                                  }}
                                >
                                  {c.courseType}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px" }}>{c.creditHours}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#0284c7" }}>
                                ৳{(c.fee || (c.creditHours === 1 ? 100 : 300)).toLocaleString()} BDT
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Fixed Fees Serial List */}
                  <h4 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "15px", fontWeight: 700 }}>
                    2. Fixed Institutional Fees Schedule
                  </h4>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "8px 12px", width: "40px" }}>#</th>
                          <th style={{ padding: "8px 12px" }}>Fee Item Description</th>
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

                  {/* Grand Total Summary Box */}
                  <div
                    style={{
                      background: isPaid ? "#f0fdf4" : "#fff7ed",
                      padding: "18px 24px",
                      borderRadius: "12px",
                      border: `1.5px solid ${isPaid ? "#86efac" : "#fed7aa"}`,
                      display: "flex",
                      justify: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ fontSize: "14px", color: isPaid ? "#166534" : "#c2410c" }}>
                      Courses Subtotal: <strong>৳{coursesSubtotal.toLocaleString()} BDT</strong> • Fixed Fees: <strong>৳{FIXED_FEES_TOTAL.toLocaleString()} BDT</strong>
                    </div>
                    <div style={{ fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
                      Grand Total Fee: <span style={{ color: isPaid ? "#16a34a" : "#ea580c" }}>৳{payment.totalAmount?.toLocaleString()} BDT</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, marginLeft: "10px", color: isPaid ? "#15803d" : "#c2410c" }}>
                        ({isPaid ? "Paid in Full" : `Outstanding Due: ৳${payment.totalAmount?.toLocaleString()} BDT`})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Online Payment Gateway Checkout Modal */}
        <PaymentCheckoutModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPaymentForModal(null);
          }}
          paymentRecord={selectedPaymentForModal || payments[0]}
          selectedCourses={selectedPaymentForModal?.selectedCourses || payments[0]?.selectedCourses || []}
          totalAmount={selectedPaymentForModal?.totalAmount || payments[0]?.totalAmount || 0}
          onPaymentSuccess={() => {
            fetchPayments();
            setShowPaymentModal(false);
            setSelectedPaymentForModal(null);
          }}
        />

        {/* Official Registration Document (Invoice & Money Receipt Slip) Modal */}
        <RegistrationInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedRegIdForInvoice(null);
          }}
          registrationId={selectedRegIdForInvoice || payments[0]?.registration || payments[0]?._id}
          onPaymentSuccess={() => {
            fetchPayments();
          }}
        />
      </div>
    </div>
  );
}
