import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX, FiUsers, FiTrendingUp, FiSearch, FiFilter, FiPlus } from "react-icons/fi";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const uniqueDepts = Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort();
  const uniqueSessions = Array.from(new Set(students.map((s) => s.session).filter(Boolean))).sort();

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      [s.studentId, s.name, s.universityEmail, s.department, s.program, s.batch, s.session]
        .some((f) => String(f || "").toLowerCase().includes(query));

    const matchesDept = deptFilter === "all" || (s.department || "").toLowerCase() === deptFilter.toLowerCase();
    const matchesSession = sessionFilter === "all" || (s.session || "").toLowerCase() === sessionFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (s.accountStatus || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesDept && matchesSession && matchesStatus;
  });

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

  const handleAddStudent = async () => {
    const newStudent = {
      studentId: `STD-${Date.now().toString().slice(-4)}`,
      name: "New Student",
      universityEmail: `student${Date.now().toString().slice(-4)}@uftb.edu.bd`,
      department: "EDTE",
      program: "B.Sc. in Educational Technology and Engineering",
      batch: "6th",
      session: "2025-26",
      currentLevel: 1,
      currentTerm: 1,
      accountStatus: "inactive",
      isNewRow: true,
    };

    try {
      const res = await api.post("/ums/admin/import/students", { students: [newStudent] });
      toast.success("New student row created!");
      if (res.data?.students) {
        setStudents([...students, ...res.data.students.map(s => ({ ...s, isNewRow: true }))]);
      } else {
        fetchStudents();
      }
    } catch (err) {
      toast.error("Failed to add new student row.");
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

          const rawLvlTerm = String(
            findVal([
              "Current Level-Term",
              "Current Level- Term",
              "Current Level - Term",
              "Level-Term",
              "LevelTerm",
              "Current Level/Term",
              "Level/Term",
            ]) || ""
          ).trim();

          let lvl = 0;
          let trm = 0;

          if (rawLvlTerm) {
            const lvlMatch = rawLvlTerm.match(/level\s*(\d+)|l\s*(\d+)/i);
            const trmMatch = rawLvlTerm.match(/term\s*(\d+)|t\s*(\d+)/i);
            if (lvlMatch) lvl = Number(lvlMatch[1] || lvlMatch[2]);
            if (trmMatch) trm = Number(trmMatch[1] || trmMatch[2]);

            if (!lvl || !trm) {
              const digits = rawLvlTerm.match(/(\d+)\D+(\d+)/);
              if (digits) {
                if (!lvl) lvl = Number(digits[1]);
                if (!trm) trm = Number(digits[2]);
              }
            }
          }

          if (!lvl) {
            const rawLvl = findVal(["Current Level", "currentLevel", "Level", "level"]);
            const m = String(rawLvl).match(/\d+/);
            if (m) lvl = Number(m[0]);
          }

          if (!trm) {
            const rawTrm = findVal(["Current Term", "currentTerm", "Term", "term"]);
            const m = String(rawTrm).match(/\d+/);
            if (m) trm = Number(m[0]);
          }

          const sessVal = String(findVal(["Session", "session"]) || "2022-23");

          return {
            studentId: String(findVal(["Student ID", "studentId", "StudentID", "ID", "id"])),
            name: String(findVal(["Name", "Full Name", "name", "Student Name"])),
            universityEmail: String(findVal(["University Email", "universityEmail", "Email", "email", "Student Email"])),
            department: String(findVal(["Department", "department", "Dept"])),
            program: String(findVal(["Program", "program"])),
            batch: String(findVal(["Batch", "batch"])),
            session: sessVal,
            admissionSemester: String(findVal(["Admission Semester", "admissionSemester", "Semester", "semester"])) || `${sessVal.split("-")[0] || "Spring"} 2022`,
            currentLevel: lvl || 1,
            currentTerm: trm || 1,
            accountStatus: String(findVal(["Account Status", "accountStatus", "Status", "status"]) || "inactive"),
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
        {/* Sub Navigation Bar for Students & Progression */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px" }}>
          <Link
            to="/admin/students"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
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
            <FiUsers size={16} />
            <span>Student Directory</span>
          </Link>
          <Link
            to="/admin/progression"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
              color: "#64748b",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
            }}
          >
            <FiTrendingUp size={16} />
            <span>Academic Progression Engine</span>
          </Link>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Manage Students</h1>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const sampleData = [
                  {
                    "Student ID": "2202001",
                    "Name": "Bulbul",
                    "University Email": "bulbul@gmail.com",
                    "Department": "EDTE",
                    "Program": "BSc. Eng in EdTE",
                    "Batch": "5th",
                    "Session": "2022-23",
                    "Current Level-Term": "Level 3- Term 2",
                    "Account Status": "active",
                  },
                  {
                    "Student ID": "2202002",
                    "Name": "Eliyas",
                    "University Email": "eliyas@gmail.com",
                    "Department": "EDTE",
                    "Program": "BSc. Eng in EdTE",
                    "Batch": "5th",
                    "Session": "2022-23",
                    "Current Level-Term": "Level 3- Term 2",
                    "Account Status": "active",
                  },
                ];
                const ws = XLSX.utils.json_to_sheet(sampleData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Students");
                XLSX.writeFile(wb, "Students_info.xlsx");
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
              onClick={handleAddStudent}
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
              <span>Add New Student</span>
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
            Student ID | Name | University Email | Department | Program | Batch | Session | Current Level-Term | Account Status
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
              placeholder="Search by ID, Name, Email, Dept, Session..."
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, background: "#ffffff", color: "#334155" }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Signed Up)</option>
              <option value="inactive">Inactive (Not Signed Up)</option>
            </select>

            {(searchQuery || deptFilter !== "all" || sessionFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDeptFilter("all");
                  setSessionFilter("all");
                  setStatusFilter("all");
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
            <FiList /> Student List ({filteredStudents.length})
          </h3>
          {loading ? (
            <div>Loading students list...</div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No students match your search/filter criteria.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #cbd5e1", color: "#475569", fontWeight: "700", background: "#f8fafc" }}>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Student ID</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Name</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>University Email</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Department</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Program</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Batch</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Session</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Current Level-Term</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>Account Status</th>
                  <th style={{ padding: "12px 10px", whiteSpace: "nowrap", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredStudents].sort((a, b) => {
                  const isNewA = a.isNewRow || String(a.studentId || "").startsWith("STD-");
                  const isNewB = b.isNewRow || String(b.studentId || "").startsWith("STD-");
                  if (isNewA && !isNewB) return 1;
                  if (!isNewA && isNewB) return -1;

                  const sessA = String(a.session || "");
                  const sessB = String(b.session || "");
                  const sessCompare = sessA.localeCompare(sessB, undefined, { numeric: true, sensitivity: "base" });
                  if (sessCompare !== 0) return sessCompare;

                  const idA = String(a.studentId || "");
                  const idB = String(b.studentId || "");
                  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
                }).map((student) => {
                  const isEditing = editingId === student._id;

                  return (
                    <tr key={student._id} style={{ borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                      {/* 1. Student ID */}
                      <td style={{ padding: "12px 10px", fontWeight: "700", color: "#3B8DB3", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.studentId || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "90px" }}
                          />
                        ) : (
                          student.studentId
                        )}
                      </td>

                      {/* 2. Name */}
                      <td style={{ padding: "12px 10px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.name || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "130px" }}
                          />
                        ) : (
                          student.name
                        )}
                      </td>

                      {/* 3. University Email */}
                      <td style={{ padding: "12px 10px", color: "#0284c7", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editFormData.universityEmail || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, universityEmail: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "170px" }}
                          />
                        ) : (
                          student.universityEmail
                        )}
                      </td>

                      {/* 4. Department Dropdown */}
                      <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.department || "EDTE"}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: "600" }}
                          >
                            <option value="EDTE">EDTE</option>
                            <option value="IRE">IRE</option>
                            <option value="CySE">CySE</option>
                            <option value="DSE">DSE</option>
                            <option value="SWE">SWE</option>
                          </select>
                        ) : (
                          student.department
                        )}
                      </td>

                      {/* 5. Program Dropdown */}
                      <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.program || "B.Sc. in Educational Technology and Engineering"}
                            onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", width: "170px" }}
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
                        ) : (
                          student.program
                        )}
                      </td>

                      {/* 6. Batch */}
                      <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.batch || ""}
                            onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "60px" }}
                          />
                        ) : (
                          student.batch
                        )}
                      </td>

                      {/* 7. Session Dropdown */}
                      <td style={{ padding: "12px 10px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>
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
                          student.session
                        )}
                      </td>

                      {/* 8. Current Level-Term */}
                      <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <input
                              type="number"
                              placeholder="Level"
                              value={editFormData.currentLevel || 1}
                              onChange={(e) => setEditFormData({ ...editFormData, currentLevel: Number(e.target.value) })}
                              style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "45px", textAlign: "center" }}
                            />
                            <span>-</span>
                            <input
                              type="number"
                              placeholder="Term"
                              value={editFormData.currentTerm || 1}
                              onChange={(e) => setEditFormData({ ...editFormData, currentTerm: Number(e.target.value) })}
                              style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "45px", textAlign: "center" }}
                            />
                          </div>
                        ) : (
                          <span style={{ padding: "3px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", background: "#e0f2fe", color: "#0369a1" }}>
                            Level {student.currentLevel}- Term {student.currentTerm}
                          </span>
                        )}
                      </td>

                      {/* 9. Account Status */}
                      <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <select
                            value={editFormData.accountStatus || "inactive"}
                            onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: (student.accountStatus || "").toLowerCase() === "active" ? "#dcfce7" : "#fee2e2",
                            color: (student.accountStatus || "").toLowerCase() === "active" ? "#15803d" : "#991b1b"
                          }}>
                            {(student.accountStatus || "").toLowerCase() === "active" ? "active" : "inactive"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
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
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              onClick={() => startEdit(student)}
                              style={{ background: "#3b8db3", color: "#fff", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Edit"
                            >
                              <FiEdit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(student._id)}
                              style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
                              title="Delete"
                            >
                              <FiTrash2 size={15} />
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
