import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("all");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("all");

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

  // Filter students by selected Program
  const filteredStudents = students.filter((s) => {
    if (selectedProgramFilter !== "all") {
      const pFilter = selectedProgramFilter.toLowerCase();
      const sProg = (s.program || s.degree || s.department || "").toLowerCase();
      // Match keywords (e.g. EDTE / MSc / BSc / Software / etc.)
      const isMscFilter = pFilter.includes("m.sc");
      const isMscStudent = sProg.includes("m.sc") || sProg.includes("msc") || sProg.includes("master");
      if (isMscFilter && !isMscStudent) return false;
      if (!isMscFilter && isMscStudent) return false;

      const filterKey = pFilter.replace(/[^a-z0-9]/g, "");
      const studentKey = sProg.replace(/[^a-z0-9]/g, "");
      if (!studentKey.includes(filterKey.slice(0, 6)) && !filterKey.includes(studentKey.slice(0, 6))) {
        return false;
      }
    }
    return true;
  });

  // Group students by Session
  const groupedBySession = filteredStudents.reduce((acc, s) => {
    const sess = s.session || "Session 2022-23";
    if (!acc[sess]) acc[sess] = [];
    acc[sess].push(s);
    return acc;
  }, {});

  const handleSelectSessionFilter = (sessKey) => {
    setSelectedSessionFilter(sessKey);
    if (sessKey === "all") {
      const allIds = students.map((s) => s.studentId);
      setSelectedIds(allIds);
      toast.success(`Auto-selected all ${allIds.length} students across all sessions.`);
    } else {
      const sessStudents = groupedBySession[sessKey] || [];
      const sessIds = sessStudents.map((s) => s.studentId);
      setSelectedIds(sessIds);
      toast.success(`Auto-selected all ${sessIds.length} students in ${sessKey}.`);
    }
  };

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

  const filteredSessions =
    selectedSessionFilter === "all"
      ? Object.entries(groupedBySession)
      : Object.entries(groupedBySession).filter(([sessKey]) => sessKey === selectedSessionFilter);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Sub Navigation Bar for Students & Progression */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
          <Link
            to="/admin/students"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
              color: "#64748b",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
            }}
          >
            <FiUsers size={16} />
            <span>Student Directory</span>
          </Link>
          <Link
            to="/admin/progression"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 700,
              color: "#ffffff",
              background: "#3B8DB3",
              border: "1px solid #3B8DB3",
              boxShadow: "0 2px 6px rgba(59,141,179,0.25)",
            }}
          >
            <FiTrendingUp size={16} />
            <span>Academic Progression Engine</span>
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
        </div>

        {/* Select Session Dropdown Bar */}
        {!loading && Object.keys(groupedBySession).length > 0 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FiLayers color="#3B8DB3" size={18} /> Program:
                </span>
                <select
                  value={selectedProgramFilter}
                  onChange={(e) => setSelectedProgramFilter(e.target.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#1e293b",
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    outline: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <option value="all">All Programs</option>
                  <option value="B.Sc. in Educational Technology and Engineering">B.Sc. in Educational Technology and Engineering</option>
                  <option value="M.Sc. in Educational Technology and Engineering">M.Sc. in Educational Technology and Engineering</option>
                  <option value="B.Sc. in Internet of Things and Robotics Engineering">B.Sc. in Internet of Things and Robotics Engineering</option>
                  <option value="M.Sc. in Internet of Things and Robotics Engineering">M.Sc. in Internet of Things and Robotics Engineering</option>
                  <option value="B.Sc. in Software Engineering">B.Sc. in Software Engineering</option>
                  <option value="M.Sc. in Software Engineering">M.Sc. in Software Engineering</option>
                  <option value="B.Sc. in Cyber Security Engineering">B.Sc. in Cyber Security Engineering</option>
                  <option value="M.Sc. in Cyber Security Engineering">M.Sc. in Cyber Security Engineering</option>
                  <option value="B.Sc. in Data Science Engineering">B.Sc. in Data Science Engineering</option>
                  <option value="M.Sc. in Data Science Engineering">M.Sc. in Data Science Engineering</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FiBookmark color="#3B8DB3" size={18} /> Select Session:
                </span>
                <select
                  value={selectedSessionFilter}
                  onChange={(e) => handleSelectSessionFilter(e.target.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "#1e293b",
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    outline: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <option value="all">All Sessions ({students.length})</option>
                  {Object.keys(groupedBySession).map((sessKey) => {
                    const count = (groupedBySession[sessKey] || []).length;
                    return (
                      <option key={sessKey} value={sessKey}>
                        Session {sessKey} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={{ fontSize: "12.5px", color: "#0369a1", background: "#e0f2fe", padding: "6px 14px", borderRadius: "8px", fontWeight: 700 }}>
              {selectedIds.length > 0
                ? `${selectedIds.length} Students Selected for Promotion`
                : "Select a session to auto-check students"}
            </div>
          </div>
        )}

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
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            <FiUsers size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#475569" }}>No Student Records Found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>Import student data first from the Student Directory.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {Object.keys(groupedBySession)
              .filter((sessKey) => selectedSessionFilter === "all" || selectedSessionFilter === sessKey)
              .map((sessKey) => {
                const sessionStudents = groupedBySession[sessKey];
                const sessSelected = sessionStudents.filter((s) => selectedIds.includes(s.studentId));
                const allSessSelected = sessionStudents.length > 0 && sessSelected.length === sessionStudents.length;

                const targetConfig = sessionTargets[sessKey] || { auto: true };

                return (
                  <div
                    key={sessKey}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #cbd5e1",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
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
                        {/* Target Step Selection */}
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
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "12.5px",
                              background: "#ffffff",
                              color: "#1e293b",
                              fontWeight: 600,
                              outline: "none",
                            }}
                          >
                            <option value="auto">Automatic (+1 Step)</option>
                            <option value="1-1">Level 1 - Term 1</option>
                            <option value="1-2">Level 1 - Term 2</option>
                            <option value="2-1">Level 2 - Term 1</option>
                            <option value="2-2">Level 2 - Term 2</option>
                            <option value="3-1">Level 3 - Term 1</option>
                            <option value="3-2">Level 3 - Term 2</option>
                            <option value="4-1">Level 4 - Term 1</option>
                            <option value="4-2">Level 4 - Term 2</option>
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
                            : sessSelected.length > 0
                            ? `Promote Selected (${sessSelected.length})`
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
                          <th style={{ padding: "10px 14px", minWidth: "65px" }}>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} title="Select all students in this session">
                              <input
                                type="checkbox"
                                checked={allSessSelected}
                                onChange={(e) => handleSelectAllForSession(sessKey, e.target.checked)}
                                style={{ cursor: "pointer" }}
                              />
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>All</span>
                            </label>
                          </th>
                          <th style={{ padding: "10px 14px" }}>Student ID</th>
                          <th style={{ padding: "10px 14px" }}>Name</th>
                          <th style={{ padding: "10px 14px" }}>Email</th>
                          <th style={{ padding: "10px 14px" }}>Department</th>
                          <th style={{ padding: "10px 14px" }}>Program</th>
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
                              <td style={{ padding: "10px 14px", fontWeight: "600", color: "#334155" }}>
                                {s.program || s.degree || "B.Sc. in EDTE"}
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
