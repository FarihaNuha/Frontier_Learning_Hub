import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiSearch, FiFilter, FiClipboard, FiX } from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminRegistrationList() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [sessionFilter, setSessionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get("/ums/admin/registrations");
        setRegistrations(res.data || []);
      } catch (err) {
        toast.error("Failed to load registration list.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredRegistrations = registrations.filter((reg) => {
    // Session filter
    if (sessionFilter !== "all") {
      const s = (reg.session || "2023-24").toLowerCase();
      if (!s.includes(sessionFilter.toLowerCase())) return false;
    }
    // Level filter
    if (levelFilter !== "all") {
      const l = (reg.level || "").toLowerCase();
      if (!l.includes(levelFilter.toLowerCase())) return false;
    }
    // Term filter
    if (termFilter !== "all") {
      const t = (reg.term || "").toLowerCase();
      if (!t.includes(termFilter.toLowerCase())) return false;
    }
    // Department filter
    if (deptFilter !== "all") {
      const d = (reg.department || "").toLowerCase();
      if (!d.includes(deptFilter.toLowerCase())) return false;
    }
    // Status filter
    if (statusFilter !== "all") {
      const st = (reg.status || "").toLowerCase();
      if (!st.includes(statusFilter.toLowerCase())) return false;
    }
    // Search query (Student ID or Name)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const sid = (reg.studentId || "").toLowerCase();
      const name = (reg.user?.name || "").toLowerCase();
      if (!sid.includes(q) && !name.includes(q)) return false;
    }

    return true;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <FiClipboard size={22} />
            </div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Academic Registration Records</h1>
          </div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            Master list of all student course registration submissions and adviser approvals.
          </p>
        </div>

        {/* Dropdown Filters & Search Bar */}
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", border: "1px solid #e2e8f0" }}>
          {/* Search Box */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "240px", position: "relative" }}>
            <FiSearch size={17} color="#64748b" />
            <input
              type="text"
              placeholder="Search Student ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%", fontSize: "13.5px", background: "transparent" }}
            />
            {searchQuery && (
              <FiX size={16} color="#94a3b8" cursor="pointer" onClick={() => setSearchQuery("")} />
            )}
          </div>

          {/* Session Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569" }}>Session:</label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", background: "#ffffff", outline: "none" }}
            >
              <option value="all">All Sessions</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
              <option value="2021-22">2021-22</option>
            </select>
          </div>

          {/* Level Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569" }}>Level:</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", background: "#ffffff", outline: "none" }}
            >
              <option value="all">All Levels</option>
              <option value="Level-1">Level 1</option>
              <option value="Level-2">Level 2</option>
              <option value="Level-3">Level 3</option>
              <option value="Level-4">Level 4</option>
            </select>
          </div>

          {/* Term Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569" }}>Term:</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", background: "#ffffff", outline: "none" }}
            >
              <option value="all">All Terms</option>
              <option value="Term-1">Term 1</option>
              <option value="Term-2">Term 2</option>
            </select>
          </div>

          {/* Department Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569" }}>Dept:</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", background: "#ffffff", outline: "none" }}
            >
              <option value="all">All Depts</option>
              <option value="EDTE">EDTE</option>
              <option value="Software">Software</option>
              <option value="CSE">CSE</option>
              <option value="EEE">EEE</option>
              <option value="ETE">ETE</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569" }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#1e293b", background: "#ffffff", outline: "none" }}
            >
              <option value="all">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending Adviser Approval">Pending Approval</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Registrations Table */}
        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading registration records...</div>
          ) : filteredRegistrations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              No registration records found matching the selected filters.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "2px solid #e2e8f0", fontWeight: 700 }}>
                    <th style={{ padding: "12px 14px" }}>STUDENT ID</th>
                    <th style={{ padding: "12px 14px" }}>DEPARTMENT</th>
                    <th style={{ padding: "12px 14px" }}>SESSION</th>
                    <th style={{ padding: "12px 14px" }}>LEVEL & TERM</th>
                    <th style={{ padding: "12px 14px" }}>TOTAL CREDITS</th>
                    <th style={{ padding: "12px 14px" }}>STATUS</th>
                    <th style={{ padding: "12px 14px" }}>SUBMITTED DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontWeight: "700", color: "#3b8db3" }}>{reg.studentId}</td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{reg.department || "EDTE"}</td>
                      <td style={{ padding: "12px 14px", fontWeight: "600", color: "#0f172a" }}>{reg.session || "2023-24"}</td>
                      <td style={{ padding: "12px 14px", color: "#334155" }}>{reg.level} {reg.term}</td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{reg.totalCredits} Credits</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: reg.status === "Approved" ? "#dcfce7" : reg.status === "Pending Adviser Approval" ? "#fef3c7" : "#fee2e2",
                            color: reg.status === "Approved" ? "#15803d" : reg.status === "Pending Adviser Approval" ? "#b45309" : "#b91c1c",
                          }}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#64748b" }}>{new Date(reg.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

