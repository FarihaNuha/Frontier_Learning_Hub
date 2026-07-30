import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiBookOpen, FiLock, FiCheckCircle, FiArrowRight, FiClipboard } from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function AcademicRegistrationPage() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/registration/my-status");
        setStudentData(res.data.student);
        setRegistrations(res.data.registrations || []);
      } catch (err) {
        // If no student record found, still show the page
        console.warn("Could not load registration status:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const currentLvl = studentData ? Number(studentData.currentLevel) || 1 : 1;
  const currentTrm = studentData ? Number(studentData.currentTerm) || 1 : 1;

  const levelTermCards = [
    { level: 1, term: 1 },
    { level: 1, term: 2 },
    { level: 2, term: 1 },
    { level: 2, term: 2 },
    { level: 3, term: 1 },
    { level: 3, term: 2 },
    { level: 4, term: 1 },
    { level: 4, term: 2 },
  ];

  const getCardStatus = (lvl, trm) => {
    if (lvl < currentLvl || (lvl === currentLvl && trm < currentTrm)) return "completed";
    if (lvl === currentLvl && trm === currentTrm) return "unlocked";
    return "locked";
  };

  const getRegistrationStatus = (lvl, trm) => {
    const match = registrations.find(
      (r) =>
        r.level.toLowerCase().includes(`level-${lvl}`) &&
        r.term.toLowerCase().includes(`term-${trm}`)
    );
    return match ? match.status : null;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="course-registration" />
      <div
        style={{
          flex: 1,
          padding: "40px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b8db3, #2C4B66)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <FiClipboard size={22} />
            </div>
            <div>
              <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
                Course Registration
              </h1>
              <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                {studentData
                  ? `${studentData.name} (${studentData.studentId}) | ${studentData.department}`
                  : "Select your Level-Term to register courses"}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "300px",
              color: "#64748b",
            }}
          >
            Loading academic status...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
            }}
          >
            {levelTermCards.map((card) => {
              const cardState = getCardStatus(card.level, card.term);
              const regStatus = getRegistrationStatus(card.level, card.term);
              const isUnlocked = cardState === "unlocked";
              const isCompleted = cardState === "completed";
              const isLocked = cardState === "locked";
              const canEnter = isUnlocked || isCompleted;

              return (
                <div
                  key={`${card.level}-${card.term}`}
                  onClick={() => {
                    if (canEnter) {
                      navigate(`/student/level-term/${card.level}/${card.term}`);
                    }
                  }}
                  style={{
                    background: isUnlocked
                      ? "#ffffff"
                      : isCompleted
                      ? "#ffffff"
                      : "#f8fafc",
                    border: isUnlocked
                      ? "2px solid #3b8db3"
                      : isCompleted
                      ? "2px solid #22c55e"
                      : "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "24px",
                    boxShadow: canEnter
                      ? "0 8px 24px rgba(59, 141, 179, 0.12)"
                      : "0 2px 8px rgba(0,0,0,0.04)",
                    cursor: canEnter ? "pointer" : "default",
                    opacity: isLocked ? 0.55 : 1,
                    position: "relative",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (canEnter) {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = isCompleted
                        ? "0 12px 32px rgba(34, 197, 94, 0.2)"
                        : "0 12px 32px rgba(59, 141, 179, 0.25)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = canEnter
                      ? "0 8px 24px rgba(59, 141, 179, 0.12)"
                      : "0 2px 8px rgba(0,0,0,0.04)";
                  }}
                >
                  {/* Status Badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "18px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: isUnlocked
                          ? "#e0f2fe"
                          : isCompleted
                          ? "#dcfce7"
                          : "#e2e8f0",
                        color: isUnlocked
                          ? "#0369a1"
                          : isCompleted
                          ? "#166534"
                          : "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isUnlocked ? (
                        <FiBookOpen size={22} />
                      ) : isCompleted ? (
                        <FiCheckCircle size={22} />
                      ) : (
                        <FiLock size={22} />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        background: isUnlocked
                          ? "#3b8db3"
                          : isCompleted
                          ? "#22c55e"
                          : "#cbd5e1",
                        color: "#ffffff",
                        textTransform: "uppercase",
                      }}
                    >
                      {isUnlocked ? "Current" : isCompleted ? "Completed" : "Locked"}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: "0 0 6px 0",
                      color: canEnter ? "#0f172a" : "#475569",
                      fontSize: "17px",
                      fontWeight: 700,
                    }}
                  >
                    Level {card.level} - Term {card.term}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: isUnlocked
                        ? regStatus
                          ? "#16a34a"
                          : "#0369a1"
                        : isCompleted
                        ? "#166534"
                        : "#94a3b8",
                      fontWeight: regStatus || isCompleted ? 600 : 400,
                    }}
                  >
                    {isUnlocked
                      ? regStatus
                        ? `Status: ${regStatus}`
                        : "Registration Open"
                      : isCompleted
                      ? "Semester Complete • Full Access"
                      : "Future Semester"}
                  </p>

                  {canEnter && (
                    <div
                      style={{
                        marginTop: "18px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: isCompleted ? "#16a34a" : "#3b8db3",
                        fontWeight: 600,
                        fontSize: "13px",
                      }}
                    >
                      <span>{isCompleted ? "View Courses & Resources" : "Enter Level-Term"}</span>
                      <FiArrowRight size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
