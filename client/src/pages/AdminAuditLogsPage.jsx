import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiShield, FiSearch, FiClock, FiUser } from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/academic/admin/audit-logs")
      .then((res) => setLogs(res.data.logs || []))
      .catch((err) => toast.error("Failed to load audit logs."))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.userName || "").toLowerCase().includes(q) ||
      (l.userEmail || "").toLowerCase().includes(q) ||
      (l.details || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <FiShield size={22} />
            </div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>System Audit Trail Logs</h1>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Audit log tracking every registration, result publication, CGPA calculation, transcript download, promotion, and graduation.
          </p>
        </div>

        {/* Search Filter */}
        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <FiSearch size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search audit logs by action, user name, email, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }}
          />
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading audit logs...</div>
        ) : (
          <div style={{ background: "#ffffff", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                  <th style={{ padding: "10px 14px" }}>Timestamp</th>
                  <th style={{ padding: "10px 14px" }}>Action</th>
                  <th style={{ padding: "10px 14px" }}>Performed By</th>
                  <th style={{ padding: "10px 14px" }}>Role</th>
                  <th style={{ padding: "10px 14px" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{l.action}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{l.userName || "System"} ({l.userEmail || "N/A"})</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, background: "#e0f2fe", color: "#0369a1", textTransform: "capitalize" }}>
                        {l.role}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#334155" }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
