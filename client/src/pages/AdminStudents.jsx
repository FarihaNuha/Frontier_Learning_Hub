import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX } from "react-icons/fi";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/students");
      setStudents(res.data);
    } catch (err) {
      toast.error("Failed to load students list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student record?")) return;
    try {
      await api.delete(`/ums/admin/students/${id}`);
      toast.success("Student deleted successfully.");
      setStudents(students.filter(s => s._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete student.");
    }
  };

  const startEdit = (student) => {
    setEditingId(student._id);
    setEditFormData({ ...student });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/ums/admin/students/${id}`, editFormData);
      toast.success("Student updated successfully.");
      setStudents(students.map(s => (s._id === id ? res.data : s)));
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update student.");
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

        // Flexible and robust field mapping
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
            studentId: String(findVal(["Student ID", "studentId", "StudentID", "ID", "id"])),
            name: String(findVal(["Full Name", "Name", "name", "Student Name"])),
            universityEmail: String(findVal(["University Email", "universityEmail", "Email", "email", "Student Email"])),
            department: String(findVal(["Department", "department", "Dept"])),
            program: String(findVal(["Program", "program"])),
            batch: String(findVal(["Batch", "batch"])),
            session: String(findVal(["Session", "session"])),
            admissionSemester: String(findVal(["Admission Semester", "admissionSemester", "Semester", "semester"])),
            currentLevel: Number(findVal(["Current Level", "currentLevel", "Level", "level"]) || 1),
            currentTerm: Number(findVal(["Current Term", "currentTerm", "Term", "term"]) || 1),
            accountStatus: String(findVal(["Account Status", "accountStatus", "Status", "status"]) || "Pending"),
          };
        });

        const validStudents = normalized.filter(s => s.studentId && s.name && s.universityEmail);

        if (validStudents.length === 0) {
          toast.error("No valid student records found in sheet. Make sure headers are correct (e.g. Student ID, Name, University Email).");
          setUploading(false);
          return;
        }

        await api.post("/ums/admin/import/students", { students: validStudents });
        toast.success(`Successfully imported ${validStudents.length} students.`);
        fetchStudents();
      } catch (err) {
        toast.error(err.response?.data?.error || "Error reading Excel file.");
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
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Manage Students</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Import student roster, edit or delete records manually</p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const sampleData = [
                  {
                    "Student ID": "2202001",
                    "Full Name": "John Doe",
                    "University Email": "john2202001@std.uftb.ac.bd",
                    "Department": "Software",
                    "Program": "B.Sc. in SWE",
                    "Batch": "40th",
                    "Session": "2022-23",
                    "Admission Semester": "Spring 2022",
                    "Current Level": 1,
                    "Current Term": 1,
                    "Account Status": "Pending",
                  },
                ];
                const ws = XLSX.utils.json_to_sheet(sampleData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Students");
                XLSX.writeFile(wb, "Student_Import_Template.xlsx");
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
            Student ID | Full Name | University Email | Department | Program | Batch | Session | Admission Semester | Current Level | Current Term | Account Status
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
            <FiList /> Student List
          </h3>

          {loading ? (
            <div>Loading students list...</div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No students imported yet. Upload an Excel roster to populate.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                  <th style={{ padding: "12px" }}>Student ID</th>
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Department</th>
                  <th style={{ padding: "12px" }}>Batch</th>
                  <th style={{ padding: "12px" }}>L-T</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isEditing = editingId === student._id;

                  return (
                    <tr key={student._id} style={{ borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                      <td style={{ padding: "12px", fontWeight: "500" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.studentId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "100px" }}
                          />
                        ) : (
                          student.studentId
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.name || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "140px" }}
                          />
                        ) : (
                          student.name
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editFormData.universityEmail || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, universityEmail: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "180px" }}
                          />
                        ) : (
                          student.universityEmail
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
                          student.department
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.batch || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "70px" }}
                          />
                        ) : (
                          student.batch
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="number"
                              placeholder="L"
                              value={editFormData.currentLevel || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, currentLevel: Number(e.target.value) })}
                              style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "40px" }}
                            />
                            <input
                              type="number"
                              placeholder="T"
                              value={editFormData.currentTerm || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, currentTerm: Number(e.target.value) })}
                              style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "40px" }}
                            />
                          </div>
                        ) : (
                          `L${student.currentLevel}-T${student.currentTerm}`
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.accountStatus || "Pending"}
                            onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Active">Active</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: student.accountStatus === "Active" ? "#d1fae5" : "#fee2e2",
                            color: student.accountStatus === "Active" ? "#065f46" : "#991b1b"
                          }}>
                            {student.accountStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => saveEdit(student._id)}
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
                              onClick={() => startEdit(student)}
                              style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Edit"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
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
