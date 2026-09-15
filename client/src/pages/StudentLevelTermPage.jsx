import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiArrowLeft,
  FiBook,
  FiBookOpen,
  FiCreditCard,
  FiFileText,
  FiClipboard,
  FiLayers,
  FiActivity,
  FiAward,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import RegistrationInvoiceModal from "../components/RegistrationInvoiceModal";
import PaymentCheckoutModal from "../components/PaymentCheckoutModal";

export default function StudentLevelTermPage() {
  const { level, term } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchLevelTermDetails = async () => {
      try {
        const res = await api.get(`/registration/available-courses?level=Level-${level}&term=Term-${term}`);
        const regStatusRes = await api.get("/registration/my-status");

        const currentReg = (regStatusRes.data.registrations || []).find(
          (r) => r.level.includes(level) && r.term.includes(term)
        );

        setData({
          student: res.data.student,
          courses: res.data.courses || [],
          calendar: res.data.calendar,
          registration: currentReg,
        });

        if (currentReg && currentReg._id) {
          try {
            const invRes = await api.get(`/registration-payments/invoice/${currentReg._id}`);
            setPaymentInfo(invRes.data?.invoice);
          } catch (pErr) {
            console.error("Failed to load payment invoice:", pErr);
          }
        }
      } catch (err) {
        toast.error("Failed to load Level-Term details.");
      } finally {
        setLoading(false);
      }
    };

    fetchLevelTermDetails();
  }, [level, term]);

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
        <StudentSidebar currentPage="course-registration" />
        <div style={{ flex: 1, padding: "60px", textAlign: "center", color: "#64748b" }}>
          Loading Level-Term Details...
        </div>
      </div>
    );
  }

  const studentLevel = Number(data?.student?.currentLevel) || 1;
  const studentTerm = Number(data?.student?.currentTerm) || 1;

  const isCompletedSemester = Number(level) < studentLevel || (Number(level) === studentLevel && Number(term) < studentTerm);
  const reg = data?.registration;

  const isApproved = reg?.status === "Approved" || isCompletedSemester;
  const isPending = reg?.status === "Pending Adviser Approval";
  const isRejected = reg?.status === "Rejected";

  const coursesToDisplay = isApproved
    ? (reg?.selectedCourses?.length > 0 ? reg.selectedCourses : data?.courses || [])
    : isPending
    ? []
    : (data?.courses || []);

  const totalCredits = reg
    ? reg.totalCredits
    : (data?.courses || []).reduce((acc, c) => acc + (c.creditHours || 0), 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      <StudentSidebar currentPage="course-registration" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Navigation Back Button */}
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => navigate("/student/course-registration")}
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
            <FiArrowLeft size={16} /> Back to Course Registration
          </button>
        </div>

        {/* Main Section Content Card */}
        <div style={{ background: "#ffffff", borderRadius: "18px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
          
          {/* Header Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
                <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 800, letterSpacing: "-0.3px" }}>
                  Level {level} - Term {term}
                </h1>
                <p style={{ margin: "3px 0 0 0", color: "#3B8DB3", fontWeight: 600, fontSize: "13.5px" }}>
                  Official Academic Curriculum & Course Outline
                </p>
              </div>
            </div>

            {/* Status Pill Badge */}
            <span
              style={{
                padding: "8px 18px",
                borderRadius: "24px",
                fontSize: "13px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isApproved ? "#ccfbf1" : isPending ? "#e0f2fe" : isRejected ? "#fee2e2" : "#f1f5f9",
                color: isApproved ? "#0f766e" : isPending ? "#0369a1" : isRejected ? "#991b1b" : "#475569",
                border: `1.5px solid ${isApproved ? "#99f6e4" : isPending ? "#bae6fd" : isRejected ? "#fca5a5" : "#cbd5e1"}`,
              }}
            >
              {isApproved ? (
                <>
                  <FiCheckCircle size={15} /> Registration Approved
                </>
              ) : isPending ? (
                <>
                  <FiClock size={15} /> Pending Adviser Approval
                </>
              ) : isRejected ? (
                <>
                  <FiAlertCircle size={15} /> Registration Rejected
                </>
              ) : (
                "Not Registered"
              )}
            </span>
          </div>

          {/* Completed Semester Banner */}
          {isCompletedSemester && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #a7f3d0",
                borderLeft: "5px solid #0d9488",
                padding: "18px 22px",
                borderRadius: "14px",
                color: "#0f766e",
                fontSize: "14px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 2px 10px rgba(13, 148, 136, 0.05)",
              }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FiCheckCircle size={20} color="#0d9488" />
              </div>
              <span>
                <strong>Semester Completed:</strong> You have permanent full access to all lectures, assignments, community posts, and study resources for Level {level} Term {term}.
              </span>
            </div>
          )}

          {/* Due Payment Alert Banner */}
          {reg && reg.status !== "Rejected" && reg.status !== "rejected" && paymentInfo && !paymentInfo.isPaid && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #bae6fd",
                borderLeft: "5px solid #0284c7",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "24px",
                boxShadow: "0 4px 18px rgba(2, 132, 199, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FiCreditCard size={22} color="#0284c7" />
                </div>
                <div>
                  <div style={{ color: "#0369a1", fontWeight: 800, fontSize: "15px", marginBottom: "3px" }}>
                    Registration Fee Payment Due
                  </div>
                  <p style={{ margin: 0, color: "#334155", fontSize: "13.5px" }}>
                    Course registration is <strong>{reg.status}</strong> with an unpaid balance of{" "}
                    <strong style={{ fontSize: "16.5px", color: "#0284c7" }}>৳{(paymentInfo.dueAmount || paymentInfo.grandTotal || 0).toLocaleString()} BDT</strong>.
                    {paymentInfo.fixedFees?.some((f) => f.name.includes("Fine") || f.name.includes("Late")) ? " (Includes Admin Late Fine)" : ""}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  style={{
                    background: "#ffffff",
                    color: "#0369a1",
                    border: "1.5px solid #0284c7",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    transition: "all 0.18s ease",
                  }}
                >
                  <FiFileText size={16} /> View Official Invoice
                </button>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    background: "linear-gradient(135deg, #0284c7, #0369a1)",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(2, 132, 199, 0.25)",
                    transition: "all 0.18s ease",
                  }}
                >
                  <FiCreditCard size={16} /> Pay Online Now (bKash/Nagad/Card)
                </button>
              </div>
            </div>
          )}

          {/* Paid Status Banner */}
          {reg && paymentInfo && paymentInfo.isPaid && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #a7f3d0",
                borderLeft: "5px solid #0d9488",
                borderRadius: "14px",
                padding: "18px 22px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 2px 10px rgba(13, 148, 136, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#0f766e", fontSize: "14px", fontWeight: 700 }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FiCheckCircle size={20} color="#0d9488" />
                </div>
                <span>Registration Fee Paid in Full (Total: ৳{(paymentInfo.grandTotal || 0).toLocaleString()} BDT | Due: ৳0 BDT)</span>
              </div>
              <button
                onClick={() => setShowInvoiceModal(true)}
                style={{
                  background: "#ffffff",
                  color: "#0f766e",
                  border: "1.5px solid #0d9488",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiFileText size={15} /> View Official Invoice
              </button>
            </div>
          )}

          {/* Status Metrics Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            
            {/* Metric 1 */}
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0369a1", flexShrink: 0 }}>
                <FiActivity size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Semester Status
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                  {isCompletedSemester ? "Completed" : reg ? reg.status : "Open"}
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f766e", flexShrink: 0 }}>
                <FiBookOpen size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Semester Courses
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                  {coursesToDisplay.length} Courses Listed
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", flexShrink: 0 }}>
                <FiAward size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Credit Summary
                </div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                  {totalCredits} Credits
                </div>
              </div>
            </div>
          </div>

          {/* Rejection Alert Box */}
          {isRejected && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: "5px solid #ef4444", color: "#991b1b", padding: "18px 22px", borderRadius: "14px", marginBottom: "28px", boxShadow: "0 2px 10px rgba(239, 68, 68, 0.05)" }}>
              <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>Registration Request Rejected</div>
              <div><strong>Reason:</strong> {reg.rejectionReason}</div>
            </div>
          )}

          {/* Prescribed Curriculum Courses Section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <FiLayers size={18} color="#3b8db3" />
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 800 }}>
                Curriculum Course Outline
              </h3>
            </div>

            {coursesToDisplay.length === 0 ? (
              <div
                style={{
                  padding: "36px 24px",
                  textAlign: "center",
                  background: isPending ? "#f0f9ff" : "#f8fafc",
                  borderRadius: "14px",
                  border: isPending ? "1.5px solid #bae6fd" : "1px solid #e2e8f0",
                  boxShadow: isPending ? "0 4px 16px rgba(2, 132, 199, 0.05)" : "none",
                }}
              >
                {isPending ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiClock size={24} color="#0284c7" />
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 6px 0", color: "#0369a1", fontSize: "16px", fontWeight: 800 }}>
                        Registration Pending Adviser Approval
                      </h4>
                      <p style={{ margin: 0, color: "#334155", fontSize: "13.5px", maxWidth: "600px", lineHeight: "1.6" }}>
                        Your course registration for <strong style={{ color: "#0284c7" }}>Level {level} Term {term}</strong> is currently pending Adviser approval. Registered course details and syllabus will unlock as soon as your Adviser approves your registration.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "14px" }}>
                    No courses found for {data?.student?.department ? `Department of ${data.student.department}` : "your department"} Level {level} Term {term}.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#e2e8f0", borderBottom: "2px solid #cbd5e1", color: "#0f172a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>Course Code</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>Course Title</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>Course Type</th>
                      <th style={{ padding: "14px 16px", fontWeight: 700 }}>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesToDisplay.map((c, i) => {
                      const isLab = Number(c.creditHours) === 1 || (c.courseType || "").toLowerCase().includes("sessional") || (c.courseType || "").toLowerCase().includes("lab");
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: i === coursesToDisplay.length - 1 ? "none" : "1px solid #f1f5f9",
                            background: i % 2 === 0 ? "#ffffff" : "#fafafa",
                            fontSize: "13.5px",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "6px", fontSize: "12.5px" }}>
                              {c.courseCode || c.displayCode}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b" }}>
                            {c.courseTitle || c.name}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11.5px", fontWeight: "700", background: isLab ? "#ccfbf1" : "#e0f2fe", color: isLab ? "#0f766e" : "#0369a1" }}>
                              {isLab ? "Sessional / Lab" : "Theory"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0f172a" }}>
                            {c.creditHours} Credits
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action Register Button if open */}
          {!isCompletedSemester && !reg && (
            <div style={{ textAlign: "center", padding: "32px 0 0 0" }}>
              <button
                onClick={() => navigate(`/student/registration/${level}/${term}`)}
                style={{
                  background: "linear-gradient(135deg, #3b8db3, #2C4B66)",
                  color: "#ffffff",
                  border: "none",
                  padding: "14px 32px",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(59, 141, 179, 0.3)",
                  transition: "all 0.18s ease",
                }}
              >
                Register Courses Now
              </button>
            </div>
          )}

          {isRejected && (
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                onClick={() => navigate(`/student/registration/${level}/${term}`)}
                style={{
                  background: "linear-gradient(135deg, #d97706, #b45309)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.3)",
                }}
              >
                Re-edit & Resubmit Registration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Official Registration Invoice Modal */}
      <RegistrationInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        registrationId={reg?._id}
        onPaymentSuccess={() => {
          setShowInvoiceModal(false);
          window.location.reload();
        }}
      />

      {/* Online Payment Gateway Checkout Modal */}
      <PaymentCheckoutModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentRecord={{
          registration: reg?._id,
          session: reg?.session,
          level: reg?.level,
          term: reg?.term,
          selectedCourses: reg?.selectedCourses,
        }}
        selectedCourses={reg?.selectedCourses || []}
        totalAmount={paymentInfo?.dueAmount || paymentInfo?.grandTotal || 4900}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          toast.success("Payment completed successfully!");
          window.location.reload();
        }}
      />
    </div>
  );
}
