import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCheckSquare,
  FiSquare,
  FiArrowLeft,
  FiAlertCircle,
  FiCreditCard,
  FiFileText,
  FiBookOpen,
  FiLayers,
  FiCheckCircle,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
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
          const reqL = Number(level);
          const reqT = Number(term);
          const studL = Number(s.currentLevel) || 1;
          const studT = Number(s.currentTerm) || 1;
          const isAllowed = reqL < studL || (reqL === studL && reqT <= studT);
          if (!isAllowed) {
            toast.error(`Registration Restricted: Level-${level} Term-${term} is a future semester.`);
            navigate("/student/course-registration", { replace: true });
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
      const res = await api.post("/registration/submit", {
        selectedCourseIds: selectedIds,
        level: Number(level),
        term: Number(term)
      });
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
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      <StudentSidebar currentPage="course-registration" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Navigation Back Button */}
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate(-1))}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#3b8db3",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "13.5px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              transition: "all 0.18s ease",
            }}
          >
            <FiArrowLeft size={16} /> {step === 2 ? "Back to Course Selection" : "Back"}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading courses...</div>
        ) : step === 1 ? (
          /* Step 1: Course Selection Page */
          <div style={{ background: "#ffffff", borderRadius: "18px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #3b8db3, #2C4B66)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(59, 141, 179, 0.25)",
                }}
              >
                <FiBookOpen size={24} />
              </div>
              <div>
                <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 800 }}>
                  Course Registration - Level {level} Term {term}
                </h1>
                <p style={{ margin: "4px 0 0 0", color: "#3B8DB3", fontWeight: 600, fontSize: "13.5px" }}>
                  Select courses for your level & term. Total selected credits must be between <strong>{minCred}</strong> and <strong>{maxCred}</strong>.
                </p>
              </div>
            </div>

            {data?.calendar && !data.calendar.isOpen && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderLeft: "5px solid #e11d48",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  boxShadow: "0 2px 10px rgba(225, 29, 72, 0.05)",
                }}
              >
                <FiAlertCircle size={22} color="#e11d48" style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "#be123c", fontSize: "15px", fontWeight: 800 }}>
                    Registration Period Closed
                  </h4>
                  <p style={{ margin: 0, color: "#9f1239", fontSize: "13.5px", lineHeight: "1.5" }}>
                    {data.calendar.message || `Registration for Session ${data.student?.session} (${level} ${term}) is currently CLOSED by Admin.`}
                  </p>
                </div>
              </div>
            )}

            {/* Courses Table */}
            <div style={{ borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.03)", marginBottom: "24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#e2e8f0", borderBottom: "2px solid #cbd5e1", color: "#0f172a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "14px 16px" }}>
                      <div
                        onClick={handleToggleSelectAll}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
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
                    <th style={{ padding: "14px 16px", fontWeight: 700 }}>Course Code</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700 }}>Course Title</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700 }}>Credits</th>
                    <th style={{ padding: "14px 16px", fontWeight: 700 }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.courses || []).map((c, idx) => {
                    const isSelected = selectedIds.includes(c._id);
                    const isLab = Number(c.creditHours) === 1 || (c.courseType || "").toLowerCase().includes("sessional") || (c.courseType || "").toLowerCase().includes("lab");
                    return (
                      <tr
                        key={c._id}
                        onClick={() => data?.calendar?.isOpen !== false && toggleCourse(c._id)}
                        style={{
                          borderBottom: idx === (data?.courses?.length - 1) ? "none" : "1px solid #f1f5f9",
                          cursor: data?.calendar?.isOpen === false ? "not-allowed" : "pointer",
                          background: isSelected ? "#f0f9ff" : idx % 2 === 0 ? "#ffffff" : "#fafafa",
                          opacity: data?.calendar?.isOpen === false ? 0.7 : 1,
                          fontSize: "13.5px",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          {isSelected ? <FiCheckSquare size={18} color="#3b8db3" /> : <FiSquare size={18} color="#94a3b8" />}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                          <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "6px", fontSize: "12.5px" }}>
                            {c.courseCode}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>{c.courseTitle}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0f172a" }}>{c.creditHours} Credits</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11.5px", fontWeight: "700", background: isLab ? "#ccfbf1" : "#e0f2fe", color: isLab ? "#0f766e" : "#0369a1" }}>
                            {isLab ? "Sessional / Lab" : "Theory"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Credits Summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "#E8F4FD", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "15px", color: "#475569", fontWeight: 600 }}>
                Total Selected Credits: <strong style={{ color: "#0f172a", fontSize: "17px" }}>{totalSelectedCredits}</strong> / {maxCred}
              </span>
              <span style={{ fontSize: "13px", color: totalSelectedCredits >= minCred && totalSelectedCredits <= maxCred ? "#0f766e" : "#dc2626", fontWeight: 700 }}>
                {totalSelectedCredits < minCred ? `(Minimum ${minCred} credits required)` : totalSelectedCredits > maxCred ? `(Maximum ${maxCred} credits allowed)` : "✓ Within Credit Limits"}
              </span>
            </div>

            <button
              onClick={handleProceedSummary}
              disabled={data?.calendar?.isOpen === false}
              style={{
                width: "100%",
                background: data?.calendar?.isOpen === false ? "#94a3b8" : "linear-gradient(135deg, #0284c7, #0369a1)",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "15px",
                cursor: data?.calendar?.isOpen === false ? "not-allowed" : "pointer",
                boxShadow: data?.calendar?.isOpen === false ? "none" : "0 4px 16px rgba(2, 132, 199, 0.25)",
                transition: "all 0.18s ease",
              }}
            >
              {data?.calendar?.isOpen === false ? "Registration Closed by Admin" : "Proceed to Registration Summary"}
            </button>
          </div>
        ) : (
          /* Step 2: Registration Summary Page */
          <div style={{ background: "#ffffff", borderRadius: "18px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                }}
              >
                <FiFileText size={24} />
              </div>
              <div>
                <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 800 }}>
                  Registration Summary & Academic Slip
                </h1>
                <p style={{ margin: "4px 0 0 0", color: "#3B8DB3", fontWeight: 600, fontSize: "13.5px" }}>
                  Review your selected courses and institutional fee breakdown before submitting to your Adviser.
                </p>
              </div>
            </div>

            {/* Student Profile Overview Card */}
            <div style={{ background: "#E8F4FD", padding: "20px 24px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "13.5px", color: "#334155" }}>
                <div><strong>Student Name:</strong> {data?.student?.name}</div>
                <div><strong>Student ID:</strong> {data?.student?.studentId}</div>
                <div><strong>Department:</strong> {data?.student?.department}</div>
                <div><strong>Target Level-Term:</strong> Level {level} Term {term}</div>
              </div>
            </div>

            {/* Selected Courses Table */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <FiBookOpen size={18} color="#0284c7" />
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: 800 }}>1. Selected Curriculum Courses</h3>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#e2e8f0", color: "#0f172a", borderBottom: "1.5px solid #e2e8f0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Course Code</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Course Title</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Credits</th>
                      <th style={{ padding: "12px 16px", fontWeight: 700 }}>Type</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>Fee (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCourses.map((c, idx) => {
                      const isLab = Number(c.creditHours) === 1 || (c.courseType || "").toLowerCase().includes("sessional") || (c.courseType || "").toLowerCase().includes("lab");
                      const fee = isLab ? 100 : 300;
                      return (
                        <tr key={c._id} style={{ borderBottom: idx === selectedCourses.length - 1 ? "none" : "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "6px", fontSize: "12px" }}>
                              {c.courseCode}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 600 }}>{c.courseTitle}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>{c.creditHours} Credits</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", background: isLab ? "#ccfbf1" : "#e0f2fe", color: isLab ? "#0f766e" : "#0369a1" }}>
                              {isLab ? "Lab (৳100)" : "Theory (৳300)"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>৳{fee} BDT</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

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
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <FiLayers size={18} color="#0284c7" />
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: 800 }}>2. Fixed Institutional & Administrative Fees</h3>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", marginBottom: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#e2e8f0", color: "#0f172a", borderBottom: "1.5px solid #e2e8f0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          <th style={{ padding: "12px 16px", width: "50px", fontWeight: 700 }}>#</th>
                          <th style={{ padding: "12px 16px", fontWeight: 700 }}>Fee Item Description</th>
                          <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>Amount (BDT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FIXED_REGISTRATION_FEES.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: idx === FIXED_REGISTRATION_FEES.length - 1 ? "none" : "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                            <td style={{ padding: "10px 16px", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: "10px 16px", color: "#1e293b", fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>৳{item.amount.toLocaleString()} BDT</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Grand Total Calculation Summary */}
                  <div style={{ background: "#f0f9ff", padding: "24px", borderRadius: "16px", border: "1.5px solid #bae6fd", marginBottom: "28px", boxShadow: "0 4px 16px rgba(2, 132, 199, 0.06)" }}>
                    <h3 style={{ margin: "0 0 16px 0", color: "#0369a1", fontSize: "17px", fontWeight: 800 }}>Total Registration Fee Summary</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px", color: "#334155" }}>
                      <span>Selected Academic Courses Subtotal ({theoryCount} Theory × ৳300 + {labCount} Lab × ৳100):</span>
                      <strong style={{ color: "#0f172a" }}>৳{courseSubtotal.toLocaleString()} BDT</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px", color: "#334155" }}>
                      <span>Fixed Institutional Fees Subtotal (13 Items):</span>
                      <strong style={{ color: "#0f172a" }}>৳{FIXED_FEES_TOTAL.toLocaleString()} BDT</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px dashed #bae6fd", paddingTop: "14px", marginTop: "12px", fontSize: "18px", color: "#0f172a", fontWeight: 800 }}>
                      <span>Grand Total Course Registration Fee:</span>
                      <span style={{ color: "#0284c7", fontSize: "20px" }}>৳{grandTotalFee.toLocaleString()} BDT</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Optional Payment Banner */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderLeft: "5px solid #0284c7", padding: "16px 20px", borderRadius: "12px", color: "#0369a1", fontSize: "13.5px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "12px" }}>
              <FiAlertCircle size={22} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>
                <strong>Note:</strong> Online payment is optional. Submitting registration will send it to your adviser immediately without requiring payment. You can pay online anytime.
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
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
                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                  color: "#ffffff",
                  border: "none",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "14.5px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(2, 132, 199, 0.25)",
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
                  background: "#ffffff",
                  color: "#0369a1",
                  border: "1.5px solid #0284c7",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
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
                  background: "linear-gradient(135deg, #3b8db3, #2C4B66)",
                  color: "#ffffff",
                  border: "none",
                  padding: "14px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "14.5px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(59, 141, 179, 0.25)",
                }}
              >
                <FiCreditCard size={18} /> Pay Online Now
              </button>
            </div>
          </div>
        )}
      </div>

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
