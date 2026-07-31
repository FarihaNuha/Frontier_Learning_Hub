import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX, FiUsers, FiBookmark, FiSearch, FiFilter, FiPlus } from "react-icons/fi";

export default function AdminAdvisers() {
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");

  const fetchAdvisers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/advisers");
      setAdvisers(res.data);
    } catch (err) {
      toast.error("Failed to load advisers list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this adviser record?")) return;
    try {
      await api.delete(`/ums/admin/advisers/${id}`);
      toast.success("Adviser deleted successfully.");
      setAdvisers(advisers.filter((a) => a._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete adviser.");
    }
  };

  const startEdit = (adviser) => {
    setEditingId(adviser._id);
    setEditFormData({ ...adviser });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/ums/admin/advisers/${id}`, editFormData);
      toast.success("Adviser updated successfully.");
      setAdvisers(advisers.map((a) => (a._id === id ? res.data : a)));
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update adviser.");
    }
  };

  const handleAddAdviser = async () => {
    const newAdviser = {
      teacherId: `A-${Date.now().toString().slice(-4)}`,
      teacherName: "New Adviser",
      teacherEmail: `adviser${Date.now().toString().slice(-4)}@uftb.edu.bd`,
      department: "EDTE",
      program: "B.Sc. in Educational Technology and Engineering",
      session: "2025-26",
      assignedBatch: "6th",
      isNewRow: true,
    };

    try {
      const res = await api.post("/ums/admin/import/advisers", { advisers: [newAdviser] });
      toast.success("New adviser row created!");
      if (res.data?.advisers) {
        setAdvisers([...advisers, ...res.data.advisers.map(a => ({ ...a, isNewRow: true }))]);
      } else {
        fetchAdvisers();
      }
    } catch (err) {
      toast.error("Failed to add new adviser row.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet);

        const normalized = rawJson.map((row) => {
          const findVal = (keys) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const matchedKey = rowKeys.find(
                (k) => String(k).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === String(key).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
              );
              if (matchedKey !== undefined && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return row[matchedKey];
              }
            }
            return "";
          };

          return {
            teacherId: String(findVal(["ID", "Teacher ID", "id", "teacherId"])).trim(),
            teacherName: String(findVal(["Teacher", "Teacher Name", "Name", "teacherName", "name"])).trim(),
            teacherEmail: String(findVal(["Email", "teacherEmail", "Teacher Email", "email", "University Email"])).trim(),
            department: String(findVal(["Department", "department", "Dept"])).trim(),
            program: String(findVal(["Program", "program", "Degree"])).trim(),
            session: String(findVal(["Session", "session"])).trim(),
            assignedBatch: String(findVal(["Assigned Batch", "assignedBatch", "Batch", "batch"])).trim(),
          };
        });

        await api.post("/ums/admin/import/advisers", { advisers: normalized });
        toast.success("Advisers imported successfully!");
        fetchAdvisers();
      } catch (err) {
        console.error("Adviser upload error:", err);
        toast.error(err.response?.data?.error || err.message || "Failed to import advisers Excel file.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const uniqueDepts = Array.from(new Set(advisers.map((a) => a.department).filter(Boolean))).sort();
  const uniqueSessions = Array.from(new Set(advisers.map((a) => a.session).filter(Boolean))).sort();

  const filteredAdvisers = advisers.filter((a) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      [a.teacherId, a.teacherName, a.teacherEmail, a.department, a.program, a.session, a.assignedBatch]
        .some((f) => String(f || "").toLowerCase().includes(query));

    const matchesDept = deptFilter === "all" || (a.department || "").toLowerCase() === deptFilter.toLowerCase();
    const matchesSess = sessionFilter === "all" || (a.session || "").toLowerCase() === sessionFilter.toLowerCase();

    return matchesSearch && matchesDept && matchesSess;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        {/* Top Sub Navigation Bar for Teachers & Adviser Alignment */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
          <Link
            to="/admin/teachers"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
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
            <span>Teacher Directory</span>
          </Link>
          <Link
            to="/admin/advisers"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
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
            <FiBookmark size={16} />
            <span>Adviser Alignment</span>
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Adviser Alignment</h1>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const sampleData = [
                  {
                    "ID": "1",
                    "Teacher": "Aditya Rajbongshi",
                    "Email": "farihanuha356@gmail.com",
                    "Department": "EDTE",
                    "Program": "B.Sc. in Educational Technology and Engineering",
                    "Session": "2022-23",
                    "Assigned Batch": "5th",
                  },
                ];
                const ws = XLSX.utils.json_to_sheet(sampleData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Advisers");
                XLSX.writeFile(wb, "Adviser_Import_Template.xlsx");
              }}
              style={{
                background: "#ffffff",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                padding: "12px 16px",
                borderRadius: "8px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <FiUpload style={{ transform: "rotate(180deg)" }} size={18} />
              <span>Download Template</span>
            </button>

            <button
              onClick={handleAddAdviser}
              style={{
                background: "#10b981",
                color: "#ffffff",
                border: "none",
                padding: "12px 18px",
                borderRadius: "8px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
              }}
            >
              <FiPlus size={18} />
              <span>Add New Adviser</span>
            </button>

            <label style={{
              background: "var(--pastel-blue-deep, #3B8DB3)",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "8px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59, 141, 179, 0.2)"
            }}>
              <FiUpload size={18} />
              <span>{uploading ? "Uploading..." : "Upload Excel"}</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Format Guide Banner */}
        <div style={{
          background: "#e0f2fe",
          border: "1px solid #bae6fd",
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "24px",
          color: "#0369a1"
        }}>
          <div style={{ fontWeight: "600", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
            📋 Required Excel Column Format:
          </div>
          <div style={{ fontSize: "13px", fontFamily: "monospace", background: "#ffffff", padding: "8px 12px", borderRadius: "6px", color: "#0f172a" }}>
            ID | Teacher | Email | Department | Program | Session | Assigned Batch
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          display: "flex",
          gap: "14px",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <div style={{ flex: "1 1 260px", position: "relative" }}>
            <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
            <input
              type="text"
              placeholder="Search by ID, Teacher, Email, Dept, Session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 38px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13.5px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
              <FiFilter size={15} /> Filters:
            </span>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, background: "#ffffff", color: "#334155" }}
            >
              <option value="all">All Depts</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Session Filter */}
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, background: "#ffffff", color: "#334155" }}
            >
              <option value="all">All Sessions</option>
              {uniqueSessions.map(s => <option key={s} value={s}>Session {s}</option>)}
            </select>

            {(searchQuery || deptFilter !== "all" || sessionFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDeptFilter("all");
                  setSessionFilter("all");
                }}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)",
          overflowX: "auto"
        }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
            <FiList /> Adviser Alignment Roster ({filteredAdvisers.length})
          </h3>

          {loading ? (
            <div>Loading adviser list...</div>
          ) : filteredAdvisers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No adviser records match your search/filter criteria.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                  <th style={{ padding: "12px" }}>ID</th>
                  <th style={{ padding: "12px" }}>Teacher</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Department</th>
                  <th style={{ padding: "12px" }}>Program</th>
                  <th style={{ padding: "12px" }}>Session</th>
                  <th style={{ padding: "12px" }}>Assigned Batch</th>
                  <th style={{ padding: "12px" }}>Account Status</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredAdvisers].sort((a, b) => {
                  const isNewA = a.isNewRow || String(a.teacherId || "").startsWith("A-");
                  const isNewB = b.isNewRow || String(b.teacherId || "").startsWith("A-");
                  if (isNewA && !isNewB) return 1;
                  if (!isNewA && isNewB) return -1;

                  const sessA = String(a.session || "");
                  const sessB = String(b.session || "");
                  const sessCompare = sessA.localeCompare(sessB, undefined, { numeric: true, sensitivity: "base" });
                  if (sessCompare !== 0) return sessCompare;

                  const idA = String(a.teacherId || "");
                  const idB = String(b.teacherId || "");
                  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
                }).map((adv) => {
                  const isEditing = editingId === adv._id;

                  return (
                    <tr key={adv._id} style={{ borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                      {/* 1. ID */}
                      <td style={{ padding: "12px", fontWeight: "500" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.teacherId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "60px" }}
                          />
                        ) : (
                          adv.teacherId || "-"
                        )}
                      </td>

                      {/* 2. Teacher */}
                      <td style={{ padding: "12px", fontWeight: "600" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.teacherName || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, teacherName: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "130px" }}
                          />
                        ) : (
                          adv.teacherName || "-"
                        )}
                      </td>

                      {/* 3. Email */}
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editFormData.teacherEmail || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, teacherEmail: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "160px" }}
                          />
                        ) : (
                          adv.teacherEmail
                        )}
                      </td>

                      {/* 4. Department Dropdown */}
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.department || "EDTE"}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600 }}
                          >
                            <option value="EDTE">EDTE</option>
                            <option value="IRE">IRE</option>
                            <option value="CySE">CySE</option>
                            <option value="DSE">DSE</option>
                            <option value="SWE">SWE</option>
                          </select>
                        ) : (
                          <span style={{ fontWeight: "600" }}>{adv.department}</span>
                        )}
                      </td>

                      {/* 5. Program Dropdown */}
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.program || "B.Sc. in EDTE"}
                            onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", width: "170px" }}
                          >
                            <option value="B.Sc. in EDTE">B.Sc. in EDTE</option>
                            <option value="M.Sc. in EDTE">M.Sc. in EDTE</option>
                            <option value="B.Sc. in IRE">B.Sc. in IRE</option>
                            <option value="M.Sc. in IRE">M.Sc. in IRE</option>
                            <option value="B.Sc. in CySE">B.Sc. in CySE</option>
                            <option value="M.Sc. in CySE">M.Sc. in CySE</option>
                            <option value="B.Sc. in DSE">B.Sc. in DSE</option>
                            <option value="M.Sc. in DSE">M.Sc. in DSE</option>
                            <option value="B.Sc. in SWE">B.Sc. in SWE</option>
                            <option value="M.Sc. in SWE">M.Sc. in SWE</option>
                          </select>
                        ) : (
                          adv.program
                        )}
                      </td>

                      {/* 6. Session Dropdown */}
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.session || "2023-24"}
                            onChange={(e) => setEditFormData({ ...editFormData, session: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: "600" }}
                          >
                            <option value="2020-21">2020-21</option>
                            <option value="2021-22">2021-22</option>
                            <option value="2022-23">2022-23</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2024-25">2024-25</option>
                            <option value="2025-26">2025-26</option>
                          </select>
                        ) : (
                          <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>
                            {adv.session}
                          </span>
                        )}
                      </td>

                      {/* 7. Assigned Batch */}
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.assignedBatch || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, assignedBatch: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "80px" }}
                          />
                        ) : (
                          <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>
                            {adv.assignedBatch}
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: (adv.accountStatus || "").toLowerCase() === "active" ? "#dcfce7" : "#fee2e2",
                          color: (adv.accountStatus || "").toLowerCase() === "active" ? "#15803d" : "#991b1b"
                        }}>
                          {(adv.accountStatus || "").toLowerCase() === "active" ? "active" : "inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => saveEdit(adv._id)}
                              style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Save"
                            >
                              <FiCheck size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{ background: "#64748b", color: "#fff", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Cancel"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => startEdit(adv)}
                              style={{ background: "#e0f2fe", color: "#0284c7", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Edit"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(adv._id)}
                              style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Delete"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
