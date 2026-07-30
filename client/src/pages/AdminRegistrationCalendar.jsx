import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiCalendar, FiPlus, FiCheck, FiEdit, FiTrash2, FiX, FiClock } from "react-icons/fi";
import "../styles/dashboard.css";

export default function AdminRegistrationCalendar() {
  const [calendars, setCalendars] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [activeStudentLevelTermInfo, setActiveStudentLevelTermInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const initialFormData = {
    program: "B.Sc. in Educational Technology and Engineering",
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

  const populateFormWithRule = (rule) => {
    if (!rule) return;
    const startStr = rule.startDate ? new Date(rule.startDate).toISOString().split("T")[0] : "";
    const endStr = rule.endDate ? new Date(rule.endDate).toISOString().split("T")[0] : "";

    setFormData({
      program: rule.program || "B.Sc. in Educational Technology and Engineering",
      session: rule.session || "2023-24",
      department: rule.department || "Educational Technology and Engineering",
      level: rule.level || "Level-1",
      term: rule.term || "Term-1",
      startDate: startStr || new Date().toISOString().split("T")[0],
      endDate: endStr || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      maxCredits: rule.maxCredits || 24,
      minCredits: rule.minCredits || 9,
      lateFinePerDay: rule.lateFinePerDay || 50,
      isOpen: Boolean(rule.isOpen),
    });
  };

  const fetchCalendars = async () => {
    setLoading(true);
    try {
      const [resCal, resStud] = await Promise.all([
        api.get("/ums/admin/calendar"),
        api.get("/ums/admin/students")
      ]);

      const list = resCal.data || [];
      setCalendars(list);
      setAllStudents(resStud.data.students || resStud.data || []);

      // Pre-fill form with the LAST / LATEST saved rule by default
      if (list.length > 0) {
        const latestRule = list[list.length - 1];
        populateFormWithRule(latestRule);
      }
    } catch (err) {
      toast.error("Failed to load registration calendar rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, []);

  // Helper for matching student program & session with form values (Department selection is freely selectable by Admin)
  const matchStudentToForm = (s, formProg, formDept, sessRegex) => {
    if (!s.session || !sessRegex.test(s.session)) return false;

    const pForm = (formProg || "").toLowerCase();
    const sProg = (s.program || s.degree || "").toLowerCase();

    // Degree Level Check (B.Sc vs M.Sc)
    const isMscForm = pForm.includes("m.sc") || pForm.includes("msc") || pForm.includes("master");
    const isMscStudent = sProg.includes("m.sc") || sProg.includes("msc") || sProg.includes("master");
    if (isMscForm !== isMscStudent) return false;

    return true;
  };

  // Auto-detect current Level & Term for selected Session & Department
  useEffect(() => {
    if (!formData.session || allStudents.length === 0) return;

    const sessDigits = (formData.session || "").match(/\d+/g);
    const sessRegex = sessDigits && sessDigits.length >= 2
      ? new RegExp(`${sessDigits[0]}.*${sessDigits[1]}`, "i")
      : new RegExp(formData.session, "i");

    const matches = allStudents.filter((s) => matchStudentToForm(s, formData.program, formData.department, sessRegex));

    if (matches.length > 0) {
      const sample = matches[0];
      const targetLevel = `Level-${sample.currentLevel}`;
      const targetTerm = `Term-${sample.currentTerm}`;
      setActiveStudentLevelTermInfo({
        level: targetLevel,
        term: targetTerm,
        count: matches.length
      });
      // Auto-preset level & term if creating a new rule or changing session
      if (!editingId) {
        setFormData((prev) => ({
          ...prev,
          level: targetLevel,
          term: targetTerm,
        }));
      }
    } else {
      setActiveStudentLevelTermInfo(null);
    }
  }, [formData.session, formData.department, formData.program, allStudents, editingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation: Start Date MUST be before End Date
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error("Please select valid Start and End dates.");
      return;
    }

    if (start >= end) {
      toast.error("Start Date must be strictly before End Date!");
      return;
    }

    // 2. Validation: Check if matching students exist in Student Directory for this combination
    if (!activeStudentLevelTermInfo) {
      toast.error(`Validation Error: No students found in Session "${formData.session}" for Program "${formData.program}" and Department "${formData.department}". Cannot create a registration rule for a non-existent student group!`);
      return;
    }

    // 3. Validation: Ensure selected Level and Term match Student Directory active level & term
    const normFormLevel = (formData.level || "").replace(/\s+/g, "").toLowerCase();
    const normFormTerm = (formData.term || "").replace(/\s+/g, "").toLowerCase();
    const normInfoLevel = (activeStudentLevelTermInfo.level || "").replace(/\s+/g, "").toLowerCase();
    const normInfoTerm = (activeStudentLevelTermInfo.term || "").replace(/\s+/g, "").toLowerCase();

    if (normFormLevel !== normInfoLevel || normFormTerm !== normInfoTerm) {
      toast.error(`Validation Error: Students in Session ${formData.session} from Student Directory are currently at ${activeStudentLevelTermInfo.level} ${activeStudentLevelTermInfo.term}. You cannot open registration for ${formData.level} ${formData.term}!`);
      return;
    }

    try {
      let savedRule = null;
      if (editingId) {
        const res = await api.put(`/ums/admin/calendar/${editingId}`, formData);
        toast.success("Registration Calendar rule updated!");
        savedRule = res.data;
        setEditingId(null);
      } else {
        const res = await api.post("/ums/admin/calendar", formData);
        toast.success("Registration Calendar rule saved!");
        savedRule = res.data;
      }

      const resAll = await api.get("/ums/admin/calendar");
      const updatedList = resAll.data || [];
      setCalendars(updatedList);

      // Retain the last updated rule info in the form
      if (savedRule) {
        populateFormWithRule(savedRule);
      } else if (updatedList.length > 0) {
        populateFormWithRule(updatedList[updatedList.length - 1]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save calendar rule.");
    }
  };

  const handleEdit = (cal) => {
    setEditingId(cal._id);
    populateFormWithRule(cal);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    if (calendars.length > 0) {
      populateFormWithRule(calendars[calendars.length - 1]);
    } else {
      setFormData(initialFormData);
    }
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

  // Helper to determine status automatically based strictly on Start Date and End Date
  const getRuleStatus = (cal) => {
    if (!cal.startDate || !cal.endDate) return "Closed";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(cal.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(cal.endDate);
    end.setHours(23, 59, 59, 999);

    if (today < start || today > end) {
      return "Closed";
    }

    return "Open";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Registration Calendar Config</h1>
        </div>

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
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Program</label>
              <select
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              >
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

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Session</label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              >
                <option value="2020-21">2020-21</option>
                <option value="2021-22">2021-22</option>
                <option value="2022-23">2022-23</option>
                <option value="2023-24">2023-24</option>
                <option value="2024-25">2024-25</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                style={{ width: "100%", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              >
                <option value="All Departments">All Departments</option>
                <option value="Educational Technology and Engineering">Educational Technology and Engineering (EDTE)</option>
                <option value="Internet of Things and Robotics Engineering">Internet of Things and Robotics Engineering (IRE)</option>
                <option value="Software Engineering">Software Engineering (SWE)</option>
                <option value="Cyber Security Engineering">Cyber Security Engineering (CySE)</option>
                <option value="Data Science Engineering">Data Science Engineering (DSE)</option>
              </select>
            </div>

            {activeStudentLevelTermInfo && (
              <div style={{ gridColumn: "span 2", background: "#e0f2fe", border: "1px solid #bae6fd", padding: "10px 14px", borderRadius: "8px", color: "#0369a1", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>ℹ️ Session {formData.session} ({formData.department}) students are currently enrolled in <strong>{activeStudentLevelTermInfo.level} {activeStudentLevelTermInfo.term}</strong> ({activeStudentLevelTermInfo.count} Students). Level & Term auto-filled!</span>
              </div>
            )}
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

            <div style={{ gridColumn: "span 2", display: "flex", gap: "12px", marginTop: "8px" }}>
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
                    <th style={{ padding: "12px 14px" }}>PROGRAM</th>
                    <th style={{ padding: "12px 14px" }}>DEPARTMENT</th>
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
                  {calendars.map((cal) => {
                    const statusText = getRuleStatus(cal);
                    const isOpenStatus = statusText === "Open";

                    return (
                      <tr key={cal._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1e293b" }}>{cal.program || "B.Sc. in EDTE"}</td>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0369a1" }}>
                          {cal.department || "All Departments"}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>{cal.session}</td>
                        <td style={{ padding: "12px 14px", color: "#334155" }}>{cal.level} {cal.term}</td>
                        <td style={{ padding: "12px 14px", color: "#475569" }}>{new Date(cal.startDate).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 14px", color: "#475569" }}>{new Date(cal.endDate).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 14px", color: "#475569" }}>{cal.minCredits} - {cal.maxCredits} Credits</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, background: isOpenStatus ? "#dcfce7" : "#fee2e2", color: isOpenStatus ? "#15803d" : "#b91c1c" }}>
                            {statusText}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
