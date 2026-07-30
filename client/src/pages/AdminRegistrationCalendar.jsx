import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiCalendar, FiPlus, FiCheck, FiEdit, FiTrash2, FiX, FiClock } from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminRegistrationCalendar() {
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const initialFormData = {
    session: "2023-24",
    department: "Educational Technology and Engineering",
    level: "Level-1",
    term: "Term-1",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    maxCredits: 24,
    minCredits: 9,
    lateFinePerDay: 50,
    isOpen: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  const fetchCalendars = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/calendar");
      setCalendars(res.data || []);
    } catch (err) {
      toast.error("Failed to load registration calendar rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/ums/admin/calendar/${editingId}`, formData);
        toast.success("Registration Calendar rule updated!");
        setEditingId(null);
      } else {
        await api.post("/ums/admin/calendar", formData);
        toast.success("Registration Calendar rule saved!");
      }
      setFormData(initialFormData);
      fetchCalendars();
    } catch (err) {
      toast.error("Failed to save calendar rule.");
    }
  };

  const handleEdit = (cal) => {
    setEditingId(cal._id);
    const startStr = cal.startDate ? new Date(cal.startDate).toISOString().split("T")[0] : "";
    const endStr = cal.endDate ? new Date(cal.endDate).toISOString().split("T")[0] : "";

    setFormData({
      session: cal.session || "2023-24",
      department: cal.department || "Educational Technology and Engineering",
      level: cal.level || "Level-1",
      term: cal.term || "Term-1",
      startDate: startStr,
      endDate: endStr,
      maxCredits: cal.maxCredits || 24,
      minCredits: cal.minCredits || 9,
      lateFinePerDay: cal.lateFinePerDay || 50,
      isOpen: Boolean(cal.isOpen),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this registration window rule?")) return;

    try {
      await api.delete(`/ums/admin/calendar/${id}`);
      toast.success("Registration rule deleted successfully!");
      if (editingId === id) {
        handleCancelEdit();
      }
      fetchCalendars();
    } catch (err) {
      toast.error("Failed to delete registration rule.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Registration Calendar Config</h1>
        <p style={{ color: "#64748b", margin: "4px 0 32px 0" }}>
          Set registration deadlines, credit limits & toggle semester registration window
        </p>

        {/* Configure Form */}
        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", marginBottom: "32px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>
              {editingId ? "✏️ Edit Registration Window Rule" : "Configure Registration Window Rule"}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <FiX size={14} /> Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Session</label>
              <input type="text" value={formData.session} onChange={(e) => setFormData({ ...formData, session: e.target.value })} required style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Department</label>
              <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Level</label>
              <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}>
                <option value="Level-1">Level-1</option>
                <option value="Level-2">Level-2</option>
                <option value="Level-3">Level-3</option>
                <option value="Level-4">Level-4</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Term</label>
              <select value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}>
                <option value="Term-1">Term-1</option>
                <option value="Term-2">Term-2</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Start Date</label>
              <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>End Date</label>
              <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Min Credit Limit</label>
              <input type="number" value={formData.minCredits} onChange={(e) => setFormData({ ...formData, minCredits: Number(e.target.value) })} style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Max Credit Limit</label>
              <input type="number" value={formData.maxCredits} onChange={(e) => setFormData({ ...formData, maxCredits: Number(e.target.value) })} style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }} />
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", gap: "12px", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600 }}>
                <input type="checkbox" checked={formData.isOpen} onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })} />
                <span>Registration Open Status</span>
              </label>
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", gap: "12px" }}>
              <button type="submit" style={{ background: editingId ? "#0369a1" : "#3b8db3", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13.5px" }}>
                {editingId ? "Update Registration Rule" : "Save Registration Rule"}
              </button>

              {editingId && (
                <button type="button" onClick={handleCancelEdit} style={{ background: "#ffffff", color: "#64748b", border: "1px solid #cbd5e1", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13.5px" }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Calendar Rules Table */}
        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#0f172a" }}>Active Registration Window Rules</h3>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading rules...</div>
          ) : calendars.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No active registration window rules found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                    <th style={{ padding: "12px 14px" }}>SESSION</th>
                    <th style={{ padding: "12px 14px" }}>LEVEL & TERM</th>
                    <th style={{ padding: "12px 14px" }}>START DATE</th>
                    <th style={{ padding: "12px 14px" }}>END DATE</th>
                    <th style={{ padding: "12px 14px" }}>LIMITS (MIN - MAX)</th>
                    <th style={{ padding: "12px 14px" }}>STATUS</th>
                    <th style={{ padding: "12px 14px", textAlign: "center" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {calendars.map((cal) => (
                    <tr key={cal._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{cal.session}</td>
                      <td style={{ padding: "12px 14px", color: "#334155" }}>{cal.level} {cal.term}</td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{new Date(cal.startDate).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{new Date(cal.endDate).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{cal.minCredits} - {cal.maxCredits} Credits</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, background: cal.isOpen ? "#dcfce7" : "#fee2e2", color: cal.isOpen ? "#15803d" : "#b91c1c" }}>
                          {cal.isOpen ? "Open" : "Closed"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                          <button
                            onClick={() => handleEdit(cal)}
                            title="Edit Rule"
                            style={{
                              background: "#e0f2fe",
                              color: "#0369a1",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "12.5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FiEdit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cal._id)}
                            title="Delete Rule"
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontWeight: 700,
                              fontSize: "12.5px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FiTrash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
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
