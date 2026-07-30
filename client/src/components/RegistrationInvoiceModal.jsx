import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiPrinter, FiX, FiCheckCircle, FiAlertCircle, FiCreditCard, FiFileText } from "react-icons/fi";
import PaymentCheckoutModal from "./PaymentCheckoutModal";

export default function RegistrationInvoiceModal({
  isOpen,
  onClose,
  registrationId = null,
  onPaymentSuccess,
}) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInvoice();
    }
  }, [isOpen, registrationId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const endpoint = registrationId
        ? `/registration-payments/invoice/${registrationId}`
        : `/registration-payments/invoice/current`;
      const res = await api.get(endpoint);
      setInvoice(res.data.invoice);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load registration invoice.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div
        className="invoice-modal-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(5px)",
          zIndex: 3000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          className="invoice-printable-container"
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            maxWidth: "780px",
            width: "100%",
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
            position: "relative",
            border: "1px solid #cbd5e1",
          }}
        >
          {/* Top Bar Action Buttons (Hidden during Print) */}
          <div
            className="no-print"
            style={{
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              background: "#1e293b",
              color: "#ffffff",
              borderRadius: "20px 20px 0 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px" }}>
              <FiFileText size={18} color="#38bdf8" /> Official Registration Invoice & Fee Statement
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handlePrint}
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiPrinter size={15} /> Print / Save PDF Invoice
              </button>
              <button
                onClick={onClose}
                style={{
                  background: "#334155",
                  color: "#94a3b8",
                  border: "none",
                  padding: "8px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "80px", textAlign: "center", color: "#64748b" }}>Loading invoice details...</div>
          ) : !invoice ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#ef4444" }}>Invoice details unavailable.</div>
          ) : (
            <div style={{ padding: "32px 36px" }}>
              {/* Document Header */}
              <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "22px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.5px" }}>
                    {invoice.universityName}
                  </h1>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0284c7", marginTop: "2px" }}>
                    {invoice.departmentName} DEPARTMENT • ACADEMIC REGISTRATION INVOICE
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Official Statement of Fees & Academic Course Registrations
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                    {invoice.invoiceNo}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Date: <strong>{invoice.submittedDate}</strong>
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      background: invoice.isPaid ? "#dcfce7" : "#fee2e2",
                      color: invoice.isPaid ? "#15803d" : "#b91c1c",
                      border: `1px solid ${invoice.isPaid ? "#86efac" : "#fca5a5"}`,
                    }}
                  >
                    {invoice.isPaid ? "✓ PAID IN FULL" : "⚠ UNPAID / DUE"}
                  </div>
                </div>
              </div>

              {/* Student Information Box */}
              <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px 20px", border: "1px solid #e2e8f0", marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Student Name</span>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>{invoice.studentName}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Student ID</span>
                  <strong style={{ fontSize: "14px", color: "#0284c7" }}>{invoice.studentId}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Academic Session</span>
                  <strong style={{ color: "#334155" }}>{invoice.session}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Level & Term</span>
                  <strong style={{ color: "#334155" }}>{invoice.level} {invoice.term}</strong>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Email Address</span>
                  <span style={{ color: "#334155" }}>{invoice.studentEmail}</span>
                </div>
              </div>

              {/* Table 1: Registered Academic Courses */}
              <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#0f172a", fontWeight: 700, borderLeft: "4px solid #0284c7", paddingLeft: "10px" }}>
                1. Itemized Academic Course Fees
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", marginBottom: "20px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "2px solid #cbd5e1", fontWeight: 700 }}>
                    <th style={{ padding: "8px 12px" }}>Code</th>
                    <th style={{ padding: "8px 12px" }}>Course Title</th>
                    <th style={{ padding: "8px 12px" }}>Type</th>
                    <th style={{ padding: "8px 12px" }}>Credit</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.coursesWithFee || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>{c.courseCode}</td>
                      <td style={{ padding: "8px 12px", color: "#334155" }}>{c.courseTitle}</td>
                      <td style={{ padding: "8px 12px" }}>{c.courseType}</td>
                      <td style={{ padding: "8px 12px" }}>{c.creditHours}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>৳{c.fee} BDT</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", color: "#475569" }}>Course Subtotal:</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#0284c7" }}>৳{invoice.courseSubtotal?.toLocaleString()} BDT</td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: Fixed Institutional Fees */}
              <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#0f172a", fontWeight: 700, borderLeft: "4px solid #0284c7", paddingLeft: "10px" }}>
                2. Mandatory Institutional & Administrative Fees
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "24px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "6px 10px", width: "30px" }}>#</th>
                    <th style={{ padding: "6px 10px" }}>Fee Description</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.fixedFees || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "6px 10px", color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 10px", color: "#334155" }}>{item.name}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>৳{item.amount.toLocaleString()} BDT</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: "8px 10px", textAlign: "right", color: "#475569" }}>Mandatory Fees Subtotal:</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#0284c7" }}>৳{invoice.fixedFeesTotal?.toLocaleString()} BDT</td>
                  </tr>
                </tbody>
              </table>

              {/* Grand Total & Due Amount Calculation Box */}
              <div
                style={{
                  background: invoice.isPaid ? "#f0fdf4" : "#fffbe6",
                  border: `2px solid ${invoice.isPaid ? "#86efac" : "#ffe58f"}`,
                  borderRadius: "14px",
                  padding: "20px 24px",
                  marginBottom: "28px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px" }}>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>TOTAL REGISTRATION CHARGES</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                      ৳{invoice.grandTotal?.toLocaleString()} BDT
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>TOTAL AMOUNT PAID</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: invoice.isPaid ? "#16a34a" : "#64748b", marginTop: "2px" }}>
                      ৳{invoice.paidAmount?.toLocaleString()} BDT
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 2", borderTop: "1px dashed #cbd5e1", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: invoice.isPaid ? "#15803d" : "#b45309" }}>
                        CURRENT DUE BALANCE:
                      </div>
                      {invoice.isPaid && invoice.transactionId && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          Txn ID: {invoice.transactionId} • Paid via {invoice.paymentMethod} on {invoice.paymentDate}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: "24px", fontWeight: 900, color: invoice.isPaid ? "#15803d" : "#b91c1c" }}>
                      ৳{invoice.dueAmount?.toLocaleString()} BDT
                    </div>
                  </div>
                </div>
              </div>

              {/* Pay Online Action Button if Unpaid */}
              {!invoice.isPaid && (
                <div className="no-print" style={{ marginBottom: "28px", textAlign: "center" }}>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    style={{
                      background: "linear-gradient(135deg, #16a34a, #15803d)",
                      color: "#ffffff",
                      border: "none",
                      padding: "12px 32px",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(22, 163, 74, 0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FiCreditCard size={18} /> Pay ৳{invoice.dueAmount?.toLocaleString()} BDT Online Now
                  </button>
                </div>
              )}

              {/* Signatures & Footer (Visible on Print) */}
              <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: "40px", marginBottom: "4px" }}></div>
                  Student Signature
                </div>
                <div style={{ textAlign: "center", width: "220px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: "40px", marginBottom: "4px" }}></div>
                  Accounts / Registrar Authorization
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Online Payment Modal */}
      {showPaymentModal && invoice && (
        <PaymentCheckoutModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={invoice.dueAmount}
          selectedCourses={invoice.coursesWithFee}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            fetchInvoice();
            if (onPaymentSuccess) onPaymentSuccess();
          }}
        />
      )}
    </>
  );
}
