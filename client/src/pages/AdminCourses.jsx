import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX } from "react-icons/fi";

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ums/admin/courses");
      setCourses(res.data);
    } catch (err) {
      toast.error("Failed to load courses list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course record?")) return;
    try {
      await api.delete(`/ums/admin/courses/${id}`);
      toast.success("Course deleted successfully.");
      setCourses(courses.filter(c => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete course.");
    }
  };

  const startEdit = (course) => {
    setEditingId(course._id);
    setEditFormData({ ...course });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/ums/admin/courses/${id}`, editFormData);
      toast.success("Course updated successfully.");
      setCourses(courses.map(c => (c._id === id ? res.data : c)));
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update course.");
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

        // Flexible mapping preserving raw string values
        const normalized = rawJson.map((row) => {
          const findVal = (keys) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase()
              );
              if (matchedKey !== undefined && row[matchedKey] !== undefined && row[matchedKey] !== "") {
                return row[matchedKey];
              }
            }
            return "";
          };

          const rawLvl = findVal(["Level", "level", "Course Level", "Lvl", "lvl"]);
          const rawTrm = findVal(["Term", "term", "Course Term", "Trm", "trm"]);

          return {
            courseCode: String(findVal(["Course Code", "courseCode", "Code", "code"])),
            courseTitle: String(findVal(["Course Title", "courseTitle", "Title", "title", "Course Name", "Name"])),
            courseType: String(findVal(["Course Type", "courseType", "Type", "type"]) || "Theory"),
            creditHours: Number(findVal(["Credit Hours", "creditHours", "Credits", "credits", "Credit"]) || 3),
            department: String(findVal(["Department", "department", "Dept"])),
            program: String(findVal(["Program", "program"])),
            session: String(findVal(["Session", "session"])),
            level: String(rawLvl).trim(),
            term: String(rawTrm).trim(),
          };
        });

        console.log("Parsed Excel rows sample:", normalized.slice(0, 3));

        const validCourses = normalized.filter(c => c.courseCode && c.courseTitle);

        if (validCourses.length === 0) {
          toast.error("No valid course records found. Check headers (e.g. Course Code, Course Title).");
          setUploading(false);
          return;
        }

        await api.post("/ums/admin/import/courses", { courses: validCourses });
        toast.success(`Successfully imported ${validCourses.length} courses.`);
        fetchCourses();
      } catch (err) {
        toast.error(err.response?.data?.error || "Error importing courses Excel.");
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
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Manage Courses</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Import master syllabus, edit or delete courses manually</p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const sampleData = [
                  {
                    "Course Code": "EdTE 1101",
                    "Course Title": "Structured Programming",
                    "Course Type": "Theory",
                    "Credit Hours": 3,
                    "Department": "EdTE",
                    "Program": "B.Sc. in EdTE",
                    "Level": "Level-1",
                    "Term": "Term-1",
                  },
                ];
                const ws = XLSX.utils.json_to_sheet(sampleData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Courses");
                XLSX.writeFile(wb, "Course_Import_Template.xlsx");
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
            Course Code | Course Title | Course Type | Credit Hours | Department | Program | Level | Term
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
            <FiList /> Course Catalog
          </h3>

          {loading ? (
            <div>Loading courses...</div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No course catalog records. Import Excel file to begin.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                  <th style={{ padding: "12px" }}>Course Code</th>
                  <th style={{ padding: "12px" }}>Course Title</th>
                  <th style={{ padding: "12px" }}>Type</th>
                  <th style={{ padding: "12px" }}>Credits</th>
                  <th style={{ padding: "12px" }}>Department</th>
                  <th style={{ padding: "12px" }}>Program</th>
                  <th style={{ padding: "12px" }}>Level & Term</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const isEditing = editingId === course._id;

                  return (
                    <tr key={course._id} style={{ borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                      <td style={{ padding: "12px", fontWeight: "600" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.courseCode || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, courseCode: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "90px" }}
                          />
                        ) : (
                          course.courseCode
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.courseTitle || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, courseTitle: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "180px" }}
                          />
                        ) : (
                          course.courseTitle
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.courseType || "Theory"}
                            onChange={(e) => setEditFormData({ ...editFormData, courseType: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                          >
                            <option value="Theory">Theory</option>
                            <option value="Sessional">Sessional</option>
                            <option value="Lab">Lab</option>
                          </select>
                        ) : (
                          course.courseType
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData.creditHours || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, creditHours: Number(e.target.value) })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "50px" }}
                          />
                        ) : (
                          course.creditHours
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
                          course.department
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.program || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "100px" }}
                          />
                        ) : (
                          course.program || "-"
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="text"
                              placeholder="Level"
                              value={editFormData.level || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                              style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "60px" }}
                            />
                            <input
                              type="text"
                              placeholder="Term"
                              value={editFormData.term || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, term: e.target.value })}
                              style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "60px" }}
                            />
                          </div>
                        ) : (
                          <>
                            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", marginRight: "4px" }}>
                              {course.level}
                            </span>
                            <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                              {course.term}
                            </span>
                          </>
                        )}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => saveEdit(course._id)}
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
                              onClick={() => startEdit(course)}
                              style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Edit"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(course._id)}
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
