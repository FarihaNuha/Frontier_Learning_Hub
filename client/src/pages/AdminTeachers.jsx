import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX } from "react-icons/fi";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/teachers");
      setTeachers(res.data);
    } catch (err) {
      toast.error("Failed to load teachers list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher record?")) return;
    try {
      await api.delete(`/ums/admin/teachers/${id}`);
      toast.success("Teacher deleted successfully.");
      setTeachers(teachers.filter(t => t._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete teacher.");
    }
  };

  const startEdit = (teacher) => {
    setEditingId(teacher._id);
    setEditFormData({ ...teacher });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/ums/admin/teachers/${id}`, editFormData);
      toast.success("Teacher updated successfully.");
      setTeachers(teachers.map(t => (t._id === id ? res.data : t)));
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update teacher.");
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
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // defval:"" so merged/blank cells return "" instead of undefined
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // Flexible field matching
        const findVal = (row, keys) => {
          for (const key of keys) {
            const matchedKey = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === key.toLowerCase()
            );
            if (matchedKey !== undefined && row[matchedKey] !== undefined && row[matchedKey] !== "") {
              return String(row[matchedKey]).trim();
            }
          }
          return "";
        };

        // Carry-forward state for merged cell rows
        let lastTeacherId = "";
        let lastName = "";
        let lastEmail = "";
        let lastDept = "";
        let lastAdviserSession = "";
        let lastLevelTerm = "";
        let lastSession = "";

        const normalized = rawJson.map((row) => {
          // Update carry-forward values only when the cell has real data
          const tid = findVal(row, ["Teacher ID", "teacherId", "TeacherID", "ID", "id"]);
          const name = findVal(row, ["Full Name", "Name", "name", "Teacher Name"]);
          const email = findVal(row, ["Email", "email", "University Email", "universityEmail"]);
          const dept = findVal(row, ["Department", "department", "Dept"]);
          const advSession = findVal(row, ["Adviser Session", "adviserSession", "Advisor Session"]);
          const levelTerm = findVal(row, ["Assigned Level Term", "Assigned Level-Term", "assignedLevelTerm", "Level-Term", "Level Term"]);
          const session = findVal(row, ["Assigned Session", "assignedSession", "Session"]);
          const courses = findVal(row, ["Assigned Courses", "assignedCourses", "Courses", "Course"]);

          if (tid) lastTeacherId = tid;
          if (name) lastName = name;
          if (email) lastEmail = email;
          if (dept) lastDept = dept;
          if (advSession) lastAdviserSession = advSession;
          if (levelTerm) lastLevelTerm = levelTerm;
          if (session) lastSession = session;

          return {
            teacherId: lastTeacherId,
            name: lastName,
            email: lastEmail,
            department: lastDept,
            assignedLevelTerm: lastLevelTerm,
            assignedSession: lastSession,
            assignedCourses: courses,
            adviserSession: lastAdviserSession,
          };
        });

        // Filter valid rows (must have some identity AND a course)
        const validTeachers = normalized.filter(t =>
          (t.teacherId || t.name || t.email) && t.assignedCourses
        );

        if (validTeachers.length === 0) {
          toast.error("No valid teacher records found. Check headers (e.g. Teacher ID, Name, Email, Assigned Courses).");
          setUploading(false);
          return;
        }

        await api.post("/ums/admin/import/teachers", { teachers: validTeachers });
        toast.success(`Successfully imported teachers with ${validTeachers.length} course rows.`);
        fetchTeachers();
      } catch (err) {
        toast.error(err.response?.data?.error || "Error importing teachers Excel.");
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
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Manage Teachers</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Import teacher directory, edit or delete records manually</p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const sampleData = [
                  {
                    "Teacher ID": "1",
                    "Name": "Aditya Rajbongshi",
                    "Email": "aditya@gmail.com",
                    "Department": "EdTE",
                    "Assigned Courses": "Android and Web Application Development",
                    "Assigned Level Term": "Level 2- Term 2",
                    "Assigned Session": "2023-24",
                    "Advisor Session": "2022-23",
                  },
                ];
                const ws = XLSX.utils.json_to_sheet(sampleData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Teachers");
                XLSX.writeFile(wb, "Teacher_Import_Template.xlsx");
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
            Teacher ID | Name | Email | Department | Assigned Courses | Assigned Level Term | Assigned Session | Advisor Session
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
            <FiList /> Teacher List & Assigned Courses
          </h3>

          {loading ? (
            <div>Loading teachers list...</div>
          ) : teachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No teachers imported yet. Upload Excel sheet to populate.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                  <th style={{ padding: "12px" }}>ID</th>
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Dept</th>
                  <th style={{ padding: "12px" }}>Advisor Session</th>
                  <th style={{ padding: "12px" }}>Assigned Courses</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...teachers].sort((a, b) => {
                  const idA = String(a.teacherId || "");
                  const idB = String(b.teacherId || "");
                  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
                }).map((teacher) => {
                  const isEditing = editingId === teacher._id;

                  return (
                    <tr key={teacher._id} style={{ borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "top" }}>
                      <td style={{ padding: "12px", fontWeight: "500" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.teacherId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "70px" }}
                          />
                        ) : (
                          teacher.teacherId
                        )}
                      </td>
                      <td style={{ padding: "12px", fontWeight: "600" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.name || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "130px" }}
                          />
                        ) : (
                          teacher.name
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editFormData.email || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "160px" }}
                          />
                        ) : (
                          teacher.email
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.department || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "80px" }}
                          />
                        ) : (
                          teacher.department
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.adviserSession || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, adviserSession: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "90px" }}
                          />
                        ) : (
                          teacher.adviserSession || "-"
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {teacher.assignedCourses && teacher.assignedCourses.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {teacher.assignedCourses.map((c, idx) => (
                              <div key={idx} style={{
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                padding: "6px 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px"
                              }}>
                                <span style={{ fontWeight: "500", color: "#1e293b" }}>
                                  {typeof c === "object" ? c.courseName : c}
                                </span>
                                {typeof c === "object" && (c.levelTerm || c.session) && (
                                  <div style={{ display: "flex", gap: "6px", fontSize: "11px" }}>
                                    {c.levelTerm && (
                                      <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px" }}>
                                        {c.levelTerm}
                                      </span>
                                    )}
                                    {c.session && (
                                      <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 6px", borderRadius: "4px" }}>
                                        {c.session}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => saveEdit(teacher._id)}
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
                              onClick={() => startEdit(teacher)}
                              style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Edit"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(teacher._id)}
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
