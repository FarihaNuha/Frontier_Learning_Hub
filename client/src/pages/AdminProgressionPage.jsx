import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiTrendingUp,
  FiUsers,
  FiCheckCircle,
  FiArrowRight,
  FiBookmark,
  FiLayers,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminProgressionPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processingSession, setProcessingSession] = useState(null);

  // Per session level/term selections
  const [sessionTargets, setSessionTargets] = useState({});

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/students");
      setStudents(res.data.students || res.data || []);
    } catch (err) {
      toast.error("Failed to load students for progression.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Group students by Session
  const groupedBySession = students.reduce((acc, s) => {
    const sess = s.session || "Session 2022-23";
    if (!acc[sess]) acc[sess] = [];
    acc[sess].push(s);
    return acc;
  }, {});

  const handleSelectAllForSession = (sessKey, isChecked) => {
    const sessStudentIds = (groupedBySession[sessKey] || []).map((s) => s.studentId);
    if (isChecked) {
      // Add all from this session
      setSelectedIds((prev) => Array.from(new Set([...prev, ...sessStudentIds])));
    } else {
      // Remove all from this session
      setSelectedIds((prev) => prev.filter((id) => !sessStudentIds.includes(id)));
    }
  };

  const handleToggleSelect = (sId) => {
    if (selectedIds.includes(sId)) {
      setSelectedIds(selectedIds.filter((id) => id !== sId));
    } else {
      setSelectedIds([...selectedIds, sId]);
    }
  };

  const handlePromoteSession = async (sessKey) => {
    const sessStudents = groupedBySession[sessKey] || [];
    const sessSelectedIds = sessStudents
      .map((s) => s.studentId)
      .filter((id) => selectedIds.includes(id));

    // If none explicitly selected, select all for this session
    const idsToPromote = sessSelectedIds.length > 0 ? sessSelectedIds : sessStudents.map((s) => s.studentId);

    if (idsToPromote.length === 0) {
      toast.error(`No students to promote in ${sessKey}`);
      return;
    }

    const targetConfig = sessionTargets[sessKey] || { auto: true };

    setProcessingSession(sessKey);
    try {
      await api.post("/academic/admin/promote", {
        studentIds: idsToPromote,
        autoNextStep: targetConfig.auto !== false,
        targetLevel: targetConfig.level || null,
        targetTerm: targetConfig.term || null,
      });

      toast.success(`Successfully promoted ${idsToPromote.length} students in ${sessKey}!`);
      // Clear selections for this session
      setSelectedIds((prev) => prev.filter((id) => !idsToPromote.includes(id)));
      fetchStudents();
    } catch (err) {
      toast.error("Promotion failed: " + (err.response?.data?.error || err.message));
    } finally {
      setProcessingSession(null);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3B8DB3, #2C4B66)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <FiTrendingUp size={22} />
            </div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Academic Progression Engine</h1>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Session-wise student batch progression. Select a session table and promote all students +1 Level/Term with one click.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
            Loading student progression roster...
          </div>
        ) : Object.keys(groupedBySession).length === 0 ? (
          <div
            style={{
              padding: "60px",
              background: "#ffffff",
              borderRadius: "16px",
              textAlign: "center",
              color: "#94a3b8",
              border: "1px solid #e2e8f0",
            }}
          >
            <FiUsers size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3>No student records found</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {Object.entries(groupedBySession).map(([sessKey, sessionStudents]) => {
              const allSessSelected =
                sessionStudents.length > 0 &&
                sessionStudents.every((s) => selectedIds.includes(s.studentId));

              const sessSelectedCount = sessionStudents.filter((s) =>
                selectedIds.includes(s.studentId)
              ).length;

              const targetConfig = sessionTargets[sessKey] || { auto: true };

              return (
                <div
                  key={sessKey}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                    border: "1px solid #cbd5e1",
                    overflow: "hidden",
                  }}
                >
                  {/* Session Table Header Bar */}
                  <div
                    style={{
                      background: "#f0f9ff",
                      padding: "16px 20px",
                      borderBottom: "1.5px solid #bae6fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FiBookmark size={20} color="#0369a1" />
                      <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0369a1" }}>
                        Session: {sessKey}
                      </h2>
                      <span
                        style={{
                          background: "#e0f2fe",
                          color: "#0369a1",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {sessionStudents.length} Students
                      </span>
                    </div>

                    {/* Controls & Action Button */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                      {/* Promotion Mode Selection */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155" }}>
                          Target Step:
                        </label>
                        <select
                          value={targetConfig.auto ? "auto" : `${targetConfig.level || 2}-${targetConfig.term || 1}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "auto") {
                              setSessionTargets({ ...sessionTargets, [sessKey]: { auto: true } });
                            } else {
                              const [l, t] = val.split("-");
                              setSessionTargets({
                                ...sessionTargets,
                                [sessKey]: { auto: false, level: l, term: t },
                              });
                            }
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #93c5fd",
                            fontSize: "12.5px",
                            background: "#ffffff",
                            fontWeight: 600,
                            outline: "none",
                          }}
                        >
                          <option value="auto">⚡ Automatic (+1 Level/Term Step)</option>
                          <option value="1-1">Level 1 Term 1</option>
                          <option value="1-2">Level 1 Term 2</option>
                          <option value="2-1">Level 2 Term 1</option>
                          <option value="2-2">Level 2 Term 2</option>
                          <option value="3-1">Level 3 Term 1</option>
                          <option value="3-2">Level 3 Term 2</option>
                          <option value="4-1">Level 4 Term 1</option>
                          <option value="4-2">Level 4 Term 2</option>
                        </select>
                      </div>

                      {/* Promote Button */}
                      <button
                        onClick={() => handlePromoteSession(sessKey)}
                        disabled={processingSession === sessKey}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 18px",
                          background: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(22,163,74,0.25)",
                        }}
                      >
                        <FiArrowRight size={16} />
                        {processingSession === sessKey
                          ? "Promoting..."
                          : sessSelectedCount > 0
                          ? `Promote Selected (${sessSelectedCount})`
                          : `Promote All ${sessKey} Students`}
                      </button>
                    </div>
                  </div>

                  {/* Table for Session */}
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                          <th style={{ padding: "10px 14px", width: "40px" }}>
                            <input
                              type="checkbox"
                              checked={allSessSelected}
                              onChange={(e) => handleSelectAllForSession(sessKey, e.target.checked)}
                            />
                          </th>
                          <th style={{ padding: "10px 14px" }}>Student ID</th>
                          <th style={{ padding: "10px 14px" }}>Name</th>
                          <th style={{ padding: "10px 14px" }}>Email</th>
                          <th style={{ padding: "10px 14px" }}>Department</th>
                          <th style={{ padding: "10px 14px" }}>Session</th>
                          <th style={{ padding: "10px 14px" }}>Current Level</th>
                          <th style={{ padding: "10px 14px" }}>Current Term</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionStudents.map((s) => {
                          const isChecked = selectedIds.includes(s.studentId);
                          return (
                            <tr
                              key={s._id}
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                background: isChecked ? "#f0f9ff" : "transparent",
                              }}
                            >
                              <td style={{ padding: "10px 14px" }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelect(s.studentId)}
                                />
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: "700", color: "#3b8db3" }}>
                                {s.studentId}
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: "600" }}>{s.name}</td>
                              <td style={{ padding: "10px 14px", color: "#64748b" }}>
                                {s.universityEmail}
                              </td>
                              <td style={{ padding: "10px 14px", color: "#475569" }}>
                                {s.department}
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: "600", color: "#0f172a" }}>
                                {s.session}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    background: "#e0f2fe",
                                    color: "#0369a1",
                                  }}
                                >
                                  Level {s.currentLevel}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    background: "#fef3c7",
                                    color: "#b45309",
                                  }}
                                >
                                  Term {s.currentTerm}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
