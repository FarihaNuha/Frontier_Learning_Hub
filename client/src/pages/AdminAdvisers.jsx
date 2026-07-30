import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX } from "react-icons/fi";

export default function AdminAdvisers() {
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

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
      setAdvisers(advisers.filter(a => a._id !== id));
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
      setAdvisers(advisers.map(a => (a._id === id ? res.data : a)));
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update adviser.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet);

        // Flexible header mapping
        const normalized = rawJson.map((row) => {
          const findVal = (keys) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase()
              );
              if (matchedKey !== undefined && row[matchedKey] !== undefined) {
                return row[matchedKey];
              }
            }
            return "";
          };

          return {
            teacherEmail: String(findVal(["Teacher Email", "teacherEmail", "Email", "email", "University Email"])),
            department: String(findVal(["Department", "department", "Dept"])),
            program: String(findVal(["Program", "program", "Degree"])),
            session: String(findVal(["Session", "session"])),
            assignedBatch: String(findVal(["Assigned Batch", "assignedBatch", "Batch", "batch"])),
          };
        });

        const validAdvisers = normalized.filter(a => a.teacherEmail && a.session && a.assignedBatch);

        if (validAdvisers.length === 0) {
          toast.error("No valid adviser allocation records. Verify headers (Teacher Email, Session, Assigned Batch).");
          setUploading(false);
          return;
        }

        await api.post("/ums/admin/import/advisers", { advisers: validAdvisers });
        toast.success(`Successfully imported ${validAdvisers.length} advisers.`);
        fetchAdvisers();
      } catch (err) {
        toast.error(err.response?.data?.error || "Error importing advisers Excel.");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Adviser Assignments</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Import teacher-batch adviser pairings, edit or delete records manually</p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const sampleData = [
                  {
                    "Teacher Email": "aditya@gmail.com",
                    "Department": "EdTE",
                    "Program": "B.Sc. in EdTE",
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
            Teacher Email | Department | Program | Session | Assigned Batch
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
            <FiList /> Advisement Allocations
          </h3>

          {loading ? (
            <div>Loading adviser list...</div>
          ) : advisers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No adviser matches found. Import Excel file allocation list.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                  <th style={{ padding: "12px" }}>Teacher Email</th>
                  <th style={{ padding: "12px" }}>Department</th>
                  <th style={{ padding: "12px" }}>Program</th>
                  <th style={{ padding: "12px" }}>Session</th>
                  <th style={{ padding: "12px" }}>Assigned Batch</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {advisers.map((adv) => {
                  const isEditing = editingId === adv._id;

                  return (
                    <tr key={adv._id} style={{ borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                      <td style={{ padding: "12px", fontWeight: "600" }}>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editFormData.teacherEmail || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, teacherEmail: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "180px" }}
                          />
                        ) : (
                          adv.teacherEmail
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.department || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "100px" }}
                          />
                        ) : (
                          adv.department
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.program || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "140px" }}
                          />
                        ) : (
                          adv.program
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.session || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, session: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "90px" }}
                          />
                        ) : (
                          adv.session
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.assignedBatch || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, assignedBatch: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "80px" }}
                          />
                        ) : (
                          adv.assignedBatch
                        )}
                      </td>
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
                              style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
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
