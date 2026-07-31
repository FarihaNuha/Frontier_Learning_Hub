import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiCheckSquare, FiSquare, FiArrowLeft, FiAlertCircle, FiCreditCard, FiFileText } from "react-icons/fi";
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

export default function CourseRegistrationPage() {
  const { level, term } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1 = select, 2 = summary
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdRegId, setCreatedRegId] = useState(null);

  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        const res = await api.get(`/registration/available-courses?level=Level-${level}&term=Term-${term}`);
        setData(res.data);
        if (res.data?.student) {
          const s = res.data.student;
          if (String(s.currentLevel) !== String(level) || String(s.currentTerm) !== String(term)) {
            toast.error(`Registration Restricted: You are currently assigned to Level-${s.currentLevel} Term-${s.currentTerm}. You cannot register for Level-${level} Term-${term}.`);
            navigate("/student/level-term", { replace: true });
          }
        }
      } catch (err) {
        toast.error("Failed to load available course list.");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailable();
  }, [level, term, navigate]);

  const toggleCourse = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const allCourseIds = (data?.courses || []).map((c) => c._id);
  const isAllSelected = allCourseIds.length > 0 && allCourseIds.every((id) => selectedIds.includes(id));

  // Auto pre-select all available courses when data initially loads
  useEffect(() => {
    if (data?.courses?.length > 0 && selectedIds.length === 0) {
      setSelectedIds(data.courses.map((c) => c._id));
    }
  }, [data]);

  const handleToggleSelectAll = () => {
    if (data?.calendar?.isOpen === false) return;
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allCourseIds);
    }
  };

  const selectedCourses = (data?.courses || []).filter((c) => selectedIds.includes(c._id));
  const totalSelectedCredits = selectedCourses.reduce((acc, c) => acc + c.creditHours, 0);

  const minCred = data?.calendar?.minCredits || 9;
  const maxCred = data?.calendar?.maxCredits || 25;

  const handleProceedSummary = () => {
    if (totalSelectedCredits < minCred) {
      toast.error(`Minimum credit limit is ${minCred} credits. Selected: ${totalSelectedCredits}`);
      return;
    }
    if (totalSelectedCredits > maxCred) {
      toast.error(`Maximum credit limit is ${maxCred} credits. Selected: ${totalSelectedCredits}`);
      return;
    }
    setStep(2);
  };

  const handleSubmitRegistration = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/registration/submit", { selectedCourseIds: selectedIds });
      setCreatedRegId(res.data.registration?._id);
      toast.success("Registration request submitted to Adviser!");
      return res.data.registration;
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration submission failed.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenOnlinePayment = async () => {
    const reg = await handleSubmitRegistration();
    if (reg) {
      setShowPaymentModal(true);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <button
        onClick={() => (step === 2 ? setStep(1) : navigate(-1))}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          color: "#64748b",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "24px",
        }}
      >
        <FiArrowLeft size={16} /> Back
      </button>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading courses...</div>
      ) : step === 1 ? (
        /* Step 1: Course Selection Page */
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "26px" }}>
            Course Registration - Level {level} Term {term}
          </h1>
          <p style={{ margin: "4px 0 20px 0", color: "#64748b" }}>
            Select courses for your level & term. Total selected credits must be between {minCred} and {maxCred}.
          </p>

          {data?.calendar && !data.calendar.isOpen && (
            <div
              style={{
                background: "#fff1f2",
                border: "1.5px solid #fecdd3",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
              }}
            >
              <FiAlertCircle size={24} color="#e11d48" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: "0 0 4px 0", color: "#be123c", fontSize: "15px", fontWeight: 700 }}>
                  Registration Period Closed
                </h4>
                <p style={{ margin: 0, color: "#9f1239", fontSize: "13.5px", lineHeight: "1.5" }}>
                  {data.calendar.message || `Registration for Session ${data.student?.session} (${level} ${term}) is currently CLOSED by UMS Admin.`}
                </p>
              </div>
            </div>
          )}

          <div style={{ overflowX: "auto", marginBottom: "24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "12px 10px" }}>
                    <div
                      onClick={handleToggleSelectAll}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: data?.calendar?.isOpen === false ? "not-allowed" : "pointer",
                        userSelect: "none",
                      }}
                      title={isAllSelected ? "Deselect All Courses" : "Select All Courses"}
                    >
                      {isAllSelected ? (
                        <FiCheckSquare size={18} color="#3b8db3" />
                      ) : (
                        <FiSquare size={18} color="#94a3b8" />
                      )}
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Select All</span>
                    </div>
                  </th>
                  <th style={{ padding: "12px 10px" }}>Code</th>
                  <th style={{ padding: "12px 10px" }}>Title</th>
                  <th style={{ padding: "12px 10px" }}>Credits</th>
                  <th style={{ padding: "12px 10px" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {(data?.courses || []).map((c) => {
                  const isSelected = selectedIds.includes(c._id);
                  return (
                    <tr
                      key={c._id}
                      onClick={() => data?.calendar?.isOpen !== false && toggleCourse(c._id)}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: data?.calendar?.isOpen === false ? "not-allowed" : "pointer",
                        background: isSelected ? "#f0f9ff" : "transparent",
                        opacity: data?.calendar?.isOpen === false ? 0.7 : 1,
                      }}
                    >
                      <td style={{ padding: "12px 10px" }}>
                        {isSelected ? <FiCheckSquare size={18} color="#3b8db3" /> : <FiSquare size={18} color="#94a3b8" />}
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: "600", color: "#0f172a" }}>{c.courseCode}</td>
                      <td style={{ padding: "12px 10px" }}>{c.courseTitle}</td>
                      <td style={{ padding: "12px 10px" }}>{c.creditHours}</td>
                      <td style={{ padding: "12px 10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "600", background: c.creditHours === 1 ? "#fef3c7" : "#e0f2fe", color: c.creditHours === 1 ? "#b45309" : "#0369a1" }}>
                          {c.creditHours === 1 ? "Sessional" : "Theory"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "15px", color: "#475569" }}>
              Total Selected Credits: <strong>{totalSelectedCredits}</strong> / {maxCred}
            </span>
          </div>

          <button
            onClick={handleProceedSummary}
            disabled={data?.calendar?.isOpen === false}
            style={{
              width: "100%",
              background: data?.calendar?.isOpen === false ? "#94a3b8" : "#3b8db3",
              color: "#ffffff",
              border: "none",
              padding: "14px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "16px",
              cursor: data?.calendar?.isOpen === false ? "not-allowed" : "pointer",
            }}
          >
            {data?.calendar?.isOpen === false ? "Registration Closed by Admin" : "Proceed to Registration Summary"}
          </button>
        </div>
      ) : (
        /* Step 2: Registration Summary Page */
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "26px" }}>Registration Summary & Academic Slip</h1>
          <p style={{ margin: "4px 0 24px 0", color: "#64748b" }}>
            Review your selected courses (with individual course fees) and institutional fees before submitting to your Adviser.
          </p>

          {/* Selected Courses Table with Individual Fees Side-by-Side */}
          <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px" }}>1. Selected Academic Courses</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", marginBottom: "24px", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", background: "#f8fafc" }}>
                <th style={{ padding: "10px" }}>Code</th>
                <th style={{ padding: "10px" }}>Course Title</th>
                <th style={{ padding: "10px" }}>Type</th>
                <th style={{ padding: "10px" }}>Credits</th>
                <th style={{ padding: "10px", textAlign: "right" }}>Course Fee (BDT)</th>
              </tr>
            </thead>
            <tbody>
              {selectedCourses.map((c) => {
                const isLab = Number(c.creditHours) === 1 || (c.courseType || "").toLowerCase().includes("sessional") || (c.courseType || "").toLowerCase().includes("lab");
                const courseFee = isLab ? 100 : 300;
                return (
                  <tr key={c._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: "600", color: "#0f172a" }}>{c.courseCode}</td>
                    <td style={{ padding: "10px" }}>{c.courseTitle}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "600", background: isLab ? "#fef3c7" : "#e0f2fe", color: isLab ? "#b45309" : "#0369a1" }}>
                        {isLab ? "Sessional" : "Theory"}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>{c.creditHours}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#3b8db3" }}>৳{courseFee} BDT</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Payment Fee Breakdown */}
          {(() => {
            let theoryCount = 0;
            let labCount = 0;
            selectedCourses.forEach((c) => {
              if (Number(c.creditHours) === 1 || (c.courseType || "").toLowerCase().includes("sessional") || (c.courseType || "").toLowerCase().includes("lab")) {
                labCount++;
              } else {
                theoryCount++;
              }
            });
            const courseSubtotal = theoryCount * 300 + labCount * 100;
            const grandTotalFee = courseSubtotal + FIXED_FEES_TOTAL;

            return (
              <div>
                {/* Fixed Fees Serial Table */}
                <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px" }}>2. Fixed Institutional & Administrative Fees</h3>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1.5px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 14px", width: "50px" }}>#</th>
                        <th style={{ padding: "10px 14px" }}>Fee Item Description</th>
                        <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIXED_REGISTRATION_FEES.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "8px 14px", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "8px 14px", color: "#1e293b", fontWeight: 500 }}>{item.name}</td>
                          <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>৳{item.amount.toLocaleString()} BDT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total Calculation Summary */}
                <div style={{ background: "#f0fdf4", padding: "20px", borderRadius: "12px", border: "1.5px solid #86efac", marginBottom: "24px" }}>
                  <h3 style={{ margin: "0 0 14px 0", color: "#166534", fontSize: "16px" }}>Total Registration Fee Summary</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#334155" }}>
                    <span>Selected Academic Courses Subtotal ({theoryCount} Theory × ৳300 + {labCount} Lab × ৳100):</span>
                    <strong>৳{courseSubtotal.toLocaleString()} BDT</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#334155" }}>
                    <span>Fixed Institutional Fees Subtotal (13 Items):</span>
                    <strong>৳{FIXED_FEES_TOTAL.toLocaleString()} BDT</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px dashed #86efac", paddingTop: "12px", marginTop: "10px", fontSize: "18px", color: "#0f172a", fontWeight: 800 }}>
                    <span>Grand Total Course Registration Fee:</span>
                    <span style={{ color: "#16a34a" }}>৳{grandTotalFee.toLocaleString()} BDT</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Optional Payment Banner */}
          <div style={{ background: "#e0f2fe", padding: "14px 18px", borderRadius: "10px", color: "#0369a1", fontSize: "13.5px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <FiAlertCircle size={20} />
            <span>
              <strong>Note:</strong> Online payment is optional. Submitting registration will send it to your adviser immediately without requiring payment. You can pay online anytime.
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              onClick={async () => {
                const reg = await handleSubmitRegistration();
                if (reg) {
                  toast.success("Registration submitted!");
                }
              }}
              disabled={submitting}
              style={{
                flex: 1,
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "15px",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit Registration (Payment Later)"}
            </button>

            <button
              onClick={async () => {
                const reg = await handleSubmitRegistration();
                if (reg) setShowInvoiceModal(true);
              }}
              disabled={submitting}
              style={{
                flex: 1,
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14.5px",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FiFileText size={18} /> View Official Invoice
            </button>

            <button
              onClick={handleOpenOnlinePayment}
              disabled={submitting}
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "15px",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <FiCreditCard size={18} /> Pay Online Now
            </button>
          </div>
        </div>
      )}

      {/* Online Payment Gateway Checkout Modal */}
      <PaymentCheckoutModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          navigate("/student/dashboard");
        }}
        selectedCourses={selectedCourses}
        totalAmount={selectedCourses.reduce((acc, c) => acc + (Number(c.creditHours) === 1 ? 100 : 300), 0) + FIXED_FEES_TOTAL}
        onPaymentSuccess={() => {
          setTimeout(() => {
            navigate("/student/registration-payments");
          }, 1500);
        }}
      />

      {/* Official Registration Invoice Modal */}
      <RegistrationInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          navigate("/student/dashboard");
        }}
        registrationId={createdRegId}
      />
    </div>
  );
}
