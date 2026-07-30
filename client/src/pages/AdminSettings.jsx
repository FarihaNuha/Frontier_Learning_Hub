import React from "react";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminSettings() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Settings</h1>
          <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Admin Profile and System settings</p>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>System Configuration</h3>
          <p style={{ color: "#475569", lineHeight: "1.6" }}>
            Settings related to University email validation pattern restrictions and automatic session termination preferences.
          </p>
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "20px", marginTop: "20px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>UMS Integration Mode</label>
              <select style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", maxWidth: "300px" }} defaultValue="excel">
                <option value="excel">Excel Import Mode (Active)</option>
                <option value="direct">Direct Database Connection</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>Authorized Domains</label>
              <input type="text" style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", maxWidth: "300px" }} defaultValue="*.edu, *.edu.bd" disabled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
