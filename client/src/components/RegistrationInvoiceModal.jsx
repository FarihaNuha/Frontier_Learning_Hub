import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiX, FiCheckCircle, FiAlertCircle, FiFileText, FiDownload } from "react-icons/fi";

export default function RegistrationInvoiceModal({
  isOpen,
  onClose,
  registrationId = null,
  onPaymentSuccess,
}) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm 4mm 6mm;
          }
          html, body {
            visibility: hidden !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .invoice-modal-overlay {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            overflow: visible !important;
          }
          .invoice-printable-container {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .invoice-printable-container * {
            visibility: visible !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          table {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

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
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 24px",
              background: "#1e293b",
              color: "#ffffff",
              borderRadius: "20px 20px 0 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14.5px" }}>
              <FiFileText size={18} color="#38bdf8" /> Official Registration Invoice & Fee Statement
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handlePrint}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  color: "#ffffff",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiDownload size={14} /> Print / Save PDF (1 Page)
              </button>
              <button
                onClick={onClose}
                style={{
                  background: "#334155",
                  color: "#94a3b8",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: "6px",
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
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading invoice details...</div>
          ) : !invoice ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#ef4444" }}>Invoice details unavailable.</div>
          ) : (
            <div style={{ padding: "24px 28px" }}>
              {/* Document Header */}
              <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "14px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "20px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.5px" }}>
                    {invoice.universityName}
                  </h1>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", marginTop: "2px" }}>
                    {invoice.departmentName} DEPARTMENT • ACADEMIC REGISTRATION STATEMENT
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                    {invoice.invoiceNo}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                    Date: <strong>{invoice.submittedDate}</strong>
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: "4px",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 800,
                      background: invoice.isPaid ? "#dcfce7" : "#fffbe6",
                      color: invoice.isPaid ? "#15803d" : "#b45309",
                      border: `1px solid ${invoice.isPaid ? "#86efac" : "#ffe58f"}`,
                    }}
                  >
                    {invoice.isPaid ? "PAID IN FULL" : "UNPAID / DUE"}
                  </div>
                </div>
              </div>

              {/* Student Information Box */}
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 16px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase" }}>Student Name</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{invoice.studentName}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase" }}>Student ID</span>
                  <strong style={{ fontSize: "13px", color: "#0284c7" }}>{invoice.studentId}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase" }}>Level & Term</span>
                  <strong style={{ fontSize: "13px", color: "#334155" }}>{invoice.level} {invoice.term} ({invoice.session})</strong>
                </div>
              </div>

              {/* Table 1: Registered Academic Courses */}
              <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#0f172a", fontWeight: 700, borderLeft: "3.5px solid #0284c7", paddingLeft: "8px" }}>
                1. Itemized Academic Course Fees
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "14px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "1.5px solid #cbd5e1", fontWeight: 700 }}>
                    <th style={{ padding: "6px 10px" }}>Code</th>
                    <th style={{ padding: "6px 10px" }}>Course Title</th>
                    <th style={{ padding: "6px 10px" }}>Type</th>
                    <th style={{ padding: "6px 10px" }}>Credit</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.coursesWithFee || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "5px 10px", fontWeight: 700, color: "#0f172a" }}>{c.courseCode}</td>
                      <td style={{ padding: "5px 10px", color: "#334155" }}>{c.courseTitle}</td>
                      <td style={{ padding: "5px 10px" }}>{c.courseType}</td>
                      <td style={{ padding: "5px 10px" }}>{c.creditHours}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600 }}>৳{c.fee} BDT</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: "6px 10px", textAlign: "right", color: "#475569" }}>Course Subtotal:</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: "#0284c7" }}>৳{invoice.courseSubtotal?.toLocaleString()} BDT</td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: Fixed Institutional Fees (Compact 2-Column Schedule) */}
              <h4 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#0f172a", fontWeight: 700, borderLeft: "3.5px solid #0284c7", paddingLeft: "8px" }}>
                2. Mandatory Institutional & Administrative Fees (৳{invoice.fixedFeesTotal?.toLocaleString()} BDT)
              </h4>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", fontSize: "11.5px" }}>
                  {(invoice.fixedFees || []).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "5px 10px",
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f1f5f9",
                        borderRight: idx % 2 === 0 ? "1px solid #f1f5f9" : "none",
                        background: Math.floor(idx / 2) % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <span style={{ color: "#334155" }}>{idx + 1}. {item.name}</span>
                      <strong style={{ color: "#0f172a" }}>৳{item.amount.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total & Due Amount Calculation Box */}
              <div
                style={{
                  background: invoice.isPaid ? "#f0fdf4" : "#fffbe6",
                  border: `1.5px solid ${invoice.isPaid ? "#86efac" : "#ffe58f"}`,
                  borderRadius: "10px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                  <div>
                    <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 700 }}>TOTAL REGISTRATION CHARGES</div>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginTop: "1px" }}>
                      ৳{invoice.grandTotal?.toLocaleString()} BDT
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 700 }}>TOTAL AMOUNT PAID</div>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: invoice.isPaid ? "#16a34a" : "#64748b", marginTop: "1px" }}>
                      ৳{invoice.paidAmount?.toLocaleString()} BDT
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 2", borderTop: "1px dashed #cbd5e1", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 800, color: invoice.isPaid ? "#15803d" : "#b45309" }}>
                        CURRENT DUE BALANCE:
                      </div>
                      {invoice.isPaid && invoice.transactionId && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                          Txn ID: {invoice.transactionId} • Paid via {invoice.paymentMethod} on {invoice.paymentDate}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: "20px", fontWeight: 900, color: invoice.isPaid ? "#15803d" : "#b91c1c" }}>
                      ৳{invoice.dueAmount?.toLocaleString()} BDT
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures & Footer (Visible on Print) */}
              <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                <div style={{ textAlign: "center", width: "180px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: "30px", marginBottom: "4px" }}></div>
                  Student Signature
                </div>
                <div style={{ textAlign: "center", width: "200px" }}>
                  <div style={{ borderBottom: "1px solid #94a3b8", height: "30px", marginBottom: "4px" }}></div>
                  Accounts / Registrar Authorization
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
