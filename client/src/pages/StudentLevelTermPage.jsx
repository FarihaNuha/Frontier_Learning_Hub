import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiCheckCircle, FiClock, FiAlertCircle, FiArrowLeft, FiBook, FiExternalLink, FiBookOpen, FiCreditCard, FiFileText } from "react-icons/fi";
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

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading Level-Term Details...</div>;

  const studentLevel = Number(data?.student?.currentLevel) || 1;
  const studentTerm = Number(data?.student?.currentTerm) || 1;

  const isCompletedSemester = Number(level) < studentLevel || (Number(level) === studentLevel && Number(term) < studentTerm);
  const reg = data?.registration;

  const isApproved = reg?.status === "Approved" || isCompletedSemester;
  const isPending = reg?.status === "Pending Adviser Approval";
  const isRejected = reg?.status === "Rejected";

  const coursesToDisplay = reg?.selectedCourses?.length > 0 ? reg.selectedCourses : data?.courses || [];

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <button
        onClick={() => navigate("/student/dashboard")}
        style={{
          background: "none",
          border: "none",
          color: "#3b8db3",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontWeight: "600",
          marginBottom: "20px",
        }}
      >
        <FiArrowLeft /> Back to Academic Dashboard
      </button>

      <div style={{ background: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "26px" }}>Level {level} - Term {term}</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Academic Course Roster & Learning Resources</p>
          </div>

          <span
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontWeight: "700",
              fontSize: "13px",
              background: isCompletedSemester || isApproved ? "#dcfce7" : isPending ? "#fef3c7" : isRejected ? "#fee2e2" : "#e0f2fe",
              color: isCompletedSemester || isApproved ? "#15803d" : isPending ? "#b45309" : isRejected ? "#b91c1c" : "#0369a1",
            }}
          >
            {isCompletedSemester ? "Semester Complete" : reg ? reg.status : "Registration Open"}
          </span>
        </div>

        {/* Completed Banner */}
        {isCompletedSemester && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "10px", color: "#166534", fontSize: "14px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
            <FiCheckCircle size={20} />
            <span>
              <strong>Semester Completed:</strong> You have permanent full access to all lectures, assignments, community posts, and study resources for Level {level} Term {term}.
            </span>
          </div>
        )}

        {/* Due Payment Alert Banner & Online Banking Button */}
        {reg && paymentInfo && !paymentInfo.isPaid && (
          <div
            style={{
              background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
              border: "1px solid #fed7aa",
              borderRadius: "14px",
              padding: "20px 24px",
              marginBottom: "24px",
              boxShadow: "0 4px 14px rgba(234,88,12,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c2410c", fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                <FiCreditCard size={18} />
                <span>Registration Fee Payment Due</span>
              </div>
              <p style={{ margin: 0, color: "#9a3412", fontSize: "13.5px" }}>
                Course registration is <strong>{reg.status}</strong> with an unpaid balance of{" "}
                <strong style={{ fontSize: "16px", color: "#ea580c" }}>৳{(paymentInfo.dueAmount || paymentInfo.grandTotal || 0).toLocaleString()} BDT</strong>.
                {paymentInfo.fixedFees?.some((f) => f.name.includes("Fine") || f.name.includes("Late")) ? " (Includes Admin Late Fine)" : ""}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowInvoiceModal(true)}
                style={{
                  background: "#ffffff",
                  color: "#0284c7",
                  border: "1px solid #0284c7",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiFileText size={16} /> View Official Invoice
              </button>

              <button
                onClick={() => setShowPaymentModal(true)}
                style={{
                  background: "linear-gradient(135deg, #16a34a, #15803d)",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
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
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#166534", fontSize: "14px", fontWeight: 600 }}>
              <FiCheckCircle size={20} color="#16a34a" />
              <span>Registration Fee Paid in Full (Total: ৳{(paymentInfo.grandTotal || 0).toLocaleString()} BDT | Due: ৳0 BDT)</span>
            </div>
            <button
              onClick={() => setShowInvoiceModal(true)}
              style={{
                background: "#ffffff",
                color: "#166534",
                border: "1px solid #166534",
                padding: "8px 14px",
                borderRadius: "6px",
                fontWeight: "600",
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

        {/* Status Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Semester Status</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginTop: "4px" }}>
              {isCompletedSemester ? "Completed" : reg ? reg.status : "Open"}
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Total Semester Courses</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginTop: "4px" }}>
              {coursesToDisplay.length} Courses Listed
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Credit Summary</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginTop: "4px" }}>
              {reg ? `${reg.totalCredits} Credits` : `Min: ${data?.calendar?.minCredits || 9} | Max: ${data?.calendar?.maxCredits || 25}`}
            </div>
          </div>
        </div>

        {isRejected && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
            <strong>Rejection Reason:</strong> {reg.rejectionReason}
          </div>
        )}

        {/* Course Roster Table with Direct LMS Classroom Links */}
        <div>
          <h3 style={{ color: "#1e293b", marginBottom: "12px" }}>Academic Course Roster & Study Materials</h3>
          {coursesToDisplay.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No courses found for Level {level} Term {term}.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "13px" }}>
                    <th style={{ padding: "10px" }}>Code</th>
                    <th style={{ padding: "10px" }}>Title</th>
                    <th style={{ padding: "10px" }}>Type</th>
                    <th style={{ padding: "10px" }}>Credits</th>
                    <th style={{ padding: "10px" }}>Classroom Access</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesToDisplay.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "13.5px" }}>
                      <td style={{ padding: "12px 10px", fontWeight: "600", color: "#0f172a" }}>{c.courseCode || c.displayCode}</td>
                      <td style={{ padding: "12px 10px" }}>{c.courseTitle || c.name}</td>
                      <td style={{ padding: "12px 10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", background: Number(c.creditHours) === 1 ? "#fef3c7" : "#e0f2fe", color: Number(c.creditHours) === 1 ? "#b45309" : "#0369a1" }}>
                          {Number(c.creditHours) === 1 ? "Sessional" : "Theory"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>{c.creditHours}</td>
                      <td style={{ padding: "12px 10px" }}>
                        <button
                          onClick={() => navigate("/courses")}
                          style={{
                            padding: "6px 12px",
                            background: "#3b8db3",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FiBookOpen size={13} /> Access Classroom
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isCompletedSemester && !reg && (
          <div style={{ textAlign: "center", padding: "24px 0 0 0" }}>
            <button
              onClick={() => navigate(`/student/registration/${level}/${term}`)}
              style={{
                background: "#3b8db3",
                color: "#ffffff",
                border: "none",
                padding: "14px 28px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59, 141, 179, 0.25)",
              }}
            >
              Register Courses Now
            </button>
          </div>
        )}

        {isRejected && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={() => navigate(`/student/registration/${level}/${term}`)}
              style={{
                background: "#d97706",
                color: "#ffffff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Re-edit & Resubmit Registration
            </button>
          </div>
        )}
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
