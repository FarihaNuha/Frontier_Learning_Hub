import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiList, FiAlertCircle, FiTrash2, FiEdit2, FiCheck, FiX, FiSearch, FiFilter, FiUsers, FiBookmark, FiPlus } from "react-icons/fi";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Academic Year Section states
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("all");

  // Inline editing states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [adviserSessionFilter, setAdviserSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const uniqueDepts = Array.from(new Set(teachers.map((t) => t.department).filter(Boolean))).sort();
  const uniqueAdviserSessions = Array.from(new Set(teachers.map((t) => t.adviserSession).filter(Boolean))).sort();

  const filteredTeachers = teachers.filter((t) => {
    const query = searchQuery.toLowerCase().trim();
    const coursesStr = (t.assignedCourses || []).map(c => `${c.courseName} ${c.levelTerm} ${c.session}`).join(" ");
    const matchesSearch =
      !query ||
      [t.teacherId, t.name, t.email, t.department, t.adviserSession, coursesStr]
        .some((f) => String(f || "").toLowerCase().includes(query));

    const matchesDept = deptFilter === "all" || (t.department || "").toLowerCase() === deptFilter.toLowerCase();
    const matchesAdvSess = adviserSessionFilter === "all" || (t.adviserSession || "").toLowerCase() === adviserSessionFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (t.accountStatus || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesDept && matchesAdvSess && matchesStatus;
  });

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get("/ums/admin/teachers/academic-years");
      if (res.data?.academicYears) {
        setAcademicYears(res.data.academicYears);
      }
    } catch (err) {}
  };

  const fetchTeachers = async (year = selectedAcademicYear) => {
    setLoading(true);
    try {
      const url = year && year !== "all" ? `/ums/admin/teachers?academicYear=${encodeURIComponent(year)}` : "/ums/admin/teachers";
      const res = await api.get(url);
      setTeachers(res.data);
    } catch (err) {
      toast.error("Failed to load teachers list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
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

  const handleAddTeacher = async () => {
    const newTeacher = {
      teacherId: `T-${Date.now().toString().slice(-4)}`,
      name: "New Teacher",
      email: `teacher${Date.now().toString().slice(-4)}@uftb.edu.bd`,
      department: "EDTE",
      assignedLevelTerm: "Level 1- Term 1",
      assignedSession: "2025-26",
      assignedCourses: [
        {
          courseName: "New Course",
          levelTerm: "Level 1- Term 1",
          session: "2025-26"
        }
      ],
      adviserSession: "None",
      isNewRow: true
    };

    try {
      const res = await api.post("/ums/admin/import/teachers", { teachers: [newTeacher] });
      toast.success("New teacher row created!");
      if (res.data?.teachers) {
        setTeachers([...teachers, ...res.data.teachers.map(t => ({ ...t, isNewRow: true }))]);
      } else {
        fetchTeachers();
      }
    } catch (err) {
      toast.error("Failed to add new teacher row.");
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
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawGrid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        let extractedAcademicYear = "July, 2026";

        if (rawGrid.length > 0) {
          const row1Str = (rawGrid[0] || []).join(" ");
          const match = row1Str.match(/Academic\s*Year\s*:?\s*([^,]+,[^\n\r]+|[^\n\r]+)/i);
          if (match && match[1] && match[1].trim()) {
            extractedAcademicYear = match[1].replace(/Academic\s*Year\s*:?/i, "").trim();
          }
        }

        const row0Str = (rawGrid[0] || []).join(" ");
        const isRow0Header = row0Str.toLowerCase().includes("academic year");

        let rawJson = [];
        if (isRow0Header) {
          const headers = (rawGrid[1] || []).map(h => String(h).trim());
          for (let i = 2; i < rawGrid.length; i++) {
            const rowArr = rawGrid[i];
            const obj = {};
            headers.forEach((h, colIdx) => {
              if (h) obj[h] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]).trim() : "";
            });
            rawJson.push(obj);
          }
        } else {
          rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        }

        const findVal = (row, keys) => {
          const rowKeys = Object.keys(row);
          for (const key of keys) {
            const matchedKey = rowKeys.find(
              (k) => String(k).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === String(key).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
            );
            if (matchedKey !== undefined && row[matchedKey] !== undefined && row[matchedKey] !== "") {
              return String(row[matchedKey]).trim();
            }
          }
          return "";
        };

        let lastTeacherId = "";
        let lastName = "";
        let lastEmail = "";
        let lastDept = "";
        let lastProgram = "";
        let lastAdviserSession = "";
        let lastLevelTerm = "";
        let lastSession = "";

        const normalized = rawJson.map((row) => {
          const tid = findVal(row, ["Teacher ID", "teacherId", "TeacherID", "ID", "id"]);
          const name = findVal(row, ["Full Name", "Name", "name", "Teacher Name"]);
          const email = findVal(row, ["Email", "email", "University Email", "universityEmail"]);
          const dept = findVal(row, ["Department", "department", "Dept"]);
          const program = findVal(row, ["Program", "program", "Degree"]);
          const advSession = findVal(row, ["Adviser Session", "adviserSession", "Advisor Session"]);
          const levelTerm = findVal(row, ["Assigned Level Term", "Assigned Level-Term", "assignedLevelTerm", "Level-Term", "Level Term"]);
          const session = findVal(row, ["Assigned Session", "assignedSession", "Session"]);
          const courses = findVal(row, ["Assigned Courses", "assignedCourses", "Courses", "Course"]);

          if (tid) lastTeacherId = tid;
          if (name) lastName = name;
          if (email) lastEmail = email;
          if (dept) lastDept = dept;
          if (program) lastProgram = program;
          if (advSession) lastAdviserSession = advSession;
          if (levelTerm) lastLevelTerm = levelTerm;
          if (session) lastSession = session;

          return {
            teacherId: lastTeacherId,
            name: lastName,
            email: lastEmail,
            department: lastDept,
            program: lastProgram || "BSc. Eng in EDTE",
            assignedLevelTerm: lastLevelTerm,
            assignedSession: lastSession,
            assignedCourses: courses,
            adviserSession: lastAdviserSession,
          };
        });

        const validTeachers = normalized.filter(t =>
          (t.teacherId || t.name || t.email) && t.assignedCourses
        );

        if (validTeachers.length === 0) {
          toast.error("No valid teacher records found. Check headers (e.g. Teacher ID, Name, Email, Assigned Courses).");
          setUploading(false);
          return;
        }

        await api.post("/ums/admin/import/teachers", {
          academicYear: extractedAcademicYear,
          teachers: validTeachers
        });
        toast.success(`Successfully imported section for Academic Year: ${extractedAcademicYear}`);
        fetchAcademicYears();
        fetchTeachers();
      } catch (err) {
        toast.error(err.response?.data?.error || "Error importing teachers Excel.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };


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
              fontWeight: 700,
              color: "#ffffff",
              background: "#3B8DB3",
              border: "1px solid #3B8DB3",
              boxShadow: "0 2px 6px rgba(59,141,179,0.25)",
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
              fontWeight: 600,
              color: "#64748b",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
            }}
          >
            <FiBookmark size={16} />
            <span>Adviser Alignment</span>
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Teacher Directory</h1>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                const wsData = [
                  ["", "", "", "", "Academic Year: July, 2026", "", "", ""],
                  [
                    "Teacher ID",
                    "Name",
                    "Email",
                    "Department",
                    "Program",
                    "Assigned Courses",
                    "Assigned Level-Term",
                    "Assigned Session"
                  ],
                  ["1", "Aditya Rajbongshi", "farihanuha356@gmail.com", "EDTE", "BSc. Eng in EDTE", "Android and Web Application Development", "Level 2- Term 2", "2023-24"],
                  ["", "", "", "", "", "Android and Web Application Development Sessional", "Level 2- Term 2", "2023-24"],
                  ["2", "Rabbi Khan", "farihatasnim0903@gmail.com", "EDTE", "BSc. Eng in EDTE", "Object Oriented Programming Language", "Level 1 - Term 2", "2024-25"],
                  ["", "", "", "", "", "Educational Measurement and Evaluation", "Level 2- Term 2", "2023-24"],
                  ["", "", "", "", "", "Blended Education Design and Development", "Level 3- Term 2", "2022-23"],
                  ["", "", "", "", "", "Blended Education Design and Development Sessional", "Level 3- Term 2", "2022-23"],
                  ["", "", "", "", "", "Educational Research and Data Analysis", "Level 4 Term 1", "2021-22"],
                  ["3", "Munira Akter Lata", "lata@gmail.com", "EDTE", "BSc. Eng in EDTE", "Computer Networking", "Level 3- Term 2", "2022-23"],
                  ["", "", "", "", "", "Computer Networking Sessional", "Level 3- Term 2", "2022-23"],
                  ["4", "Sunjida Akter", "sunjida@gmail.com", "EDTE", "BSc. Eng in EDTE", "Cloud Computing", "Level 3- Term 2", "2022-23"],
                  ["", "", "", "", "", "Cloud Computing Sessional", "Level 3- Term 2", "2022-23"],
                  ["5", "Kanon sir", "kanon@gmail.com", "FDTE", "BSc. Eng in FDTE", "STEAM Education Design and Development", "Level 3- Term 2", "2022-23"],
                  ["", "", "", "", "", "STEAM Education Design and Development Sessional", "Level 3- Term 2", "2022-23"],
                  ["6", "Ashraf Uzzaman", "ashraf@gmail.com", "EDTE", "BSc. Eng in EDTE", "Introduction to Education", "Level 1 - Term 1", "2025-26"],
                  ["7", "Rubel Sheikh", "rubel@gmail.com", "EDTE", "BSc. Eng in EDTE", "Discrete Mathematics and Graph Theory", "Level 1 - Term 2", "2024-25"],
                  ["8", "Rezaul Sir", "rezaul@gmail.com", "EDTE", "BSc. Eng in EDTE", "Structured Programming Language", "Level 1 - Term 1", "2025-26"]
                ];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
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

            <button
              onClick={handleAddTeacher}
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
              <span>Add New Teacher</span>
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

        <div style={{
          background: "#e0f2fe",
          border: "1px solid #bae6fd",
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "24px",
          color: "#0369a1"
        }}>
          <div style={{ fontWeight: "600", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
            📋 Required Excel Column Format (Row 1: Academic Year Header, Row 2: Table Columns):
          </div>
          <div style={{ fontSize: "13px", fontFamily: "monospace", background: "#ffffff", padding: "8px 12px", borderRadius: "6px", color: "#0f172a" }}>
            [Row 1 Cell E1]: Academic Year: July, 2026 | [Row 2]: Teacher ID | Name | Email | Department | Program | Assigned Courses | Assigned Level Term | Assigned Session
          </div>
        </div>

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
          <div style={{ flex: "1 1 240px", position: "relative" }}>
            <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
            <input
              type="text"
              placeholder="Search by ID, Name, Email, Dept, Course..."
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

            {/* Academic Year Section Dropdown */}
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAcademicYear(val);
                fetchTeachers(val);
              }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #3B8DB3", fontSize: "13px", fontWeight: 700, background: "#f0f9ff", color: "#0369a1" }}
            >
              <option value="all">All Academic Year Sections</option>
              {academicYears.map((ay) => (
                <option key={ay} value={ay}>
                  📅 Section: {ay}
                </option>
              ))}
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, background: "#ffffff", color: "#334155" }}
            >
              <option value="all">All Depts</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, background: "#ffffff", color: "#334155" }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Signed Up)</option>
              <option value="inactive">Inactive (Not Signed Up)</option>
            </select>

            {(searchQuery || deptFilter !== "all" || statusFilter !== "all" || selectedAcademicYear !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDeptFilter("all");
                  setStatusFilter("all");
                  setSelectedAcademicYear("all");
                  fetchTeachers("all");
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
            <FiList /> Teacher Directory ({filteredTeachers.length})
          </h3>

          {loading ? (
            <div>Loading teachers list...</div>
          ) : filteredTeachers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <FiAlertCircle size={36} style={{ marginBottom: "12px" }} />
              <div>No teachers match your search/filter criteria.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                  <th style={{ padding: "12px" }}>Teacher ID</th>
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Department</th>
                  <th style={{ padding: "12px" }}>Program</th>
                  <th style={{ padding: "12px" }}>Assigned Courses</th>
                  <th style={{ padding: "12px" }}>Assigned Level Term</th>
                  <th style={{ padding: "12px" }}>Assigned Session</th>
                  <th style={{ padding: "12px" }}>Account Status</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredTeachers].sort((a, b) => {
                  const isNewA = a.isNewRow || String(a.teacherId || "").startsWith("T-");
                  const isNewB = b.isNewRow || String(b.teacherId || "").startsWith("T-");
                  if (isNewA && !isNewB) return 1;
                  if (!isNewA && isNewB) return -1;

                  const getMinSession = (t) => {
                    if (t.assignedCourses && t.assignedCourses.length > 0) {
                      const sessList = t.assignedCourses.map(c => c.session).filter(Boolean);
                      if (sessList.length > 0) return sessList.sort()[0];
                    }
                    return t.assignedSession || "";
                  };
                  const sessA = getMinSession(a);
                  const sessB = getMinSession(b);
                  const sessCompare = sessA.localeCompare(sessB, undefined, { numeric: true, sensitivity: "base" });
                  if (sessCompare !== 0) return sessCompare;

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
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "65px" }}
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
                          <span style={{ fontWeight: "600" }}>{teacher.department}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.program || "BSc. Eng in EDTE"}
                            onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12.5px", width: "130px" }}
                          />
                        ) : (
                          <span style={{ fontWeight: "600", color: "#475569" }}>{teacher.program || "BSc. Eng in EDTE"}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", minWidth: "240px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(editFormData.assignedCourses || []).map((c, cIdx) => (
                              <div key={cIdx} style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                  <input
                                    type="text"
                                    placeholder="Course Title"
                                    value={c.courseName || ""}
                                    onChange={(e) => {
                                      const updated = [...(editFormData.assignedCourses || [])];
                                      updated[cIdx] = { ...updated[cIdx], courseName: e.target.value };
                                      setEditFormData({ ...editFormData, assignedCourses: updated });
                                    }}
                                    style={{ padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", flex: 1 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (editFormData.assignedCourses || []).filter((_, i) => i !== cIdx);
                                      setEditFormData({ ...editFormData, assignedCourses: updated });
                                    }}
                                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", padding: "3px 6px", cursor: "pointer", fontSize: "11px" }}
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <select
                                    value={c.levelTerm || "Level 1- Term 1"}
                                    onChange={(e) => {
                                      const updated = [...(editFormData.assignedCourses || [])];
                                      updated[cIdx] = { ...updated[cIdx], levelTerm: e.target.value };
                                      setEditFormData({ ...editFormData, assignedCourses: updated });
                                    }}
                                    style={{ padding: "3px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "11px", flex: 1 }}
                                  >
                                    <option value="Level 1- Term 1">Level 1- Term 1</option>
                                    <option value="Level 1- Term 2">Level 1- Term 2</option>
                                    <option value="Level 2- Term 1">Level 2- Term 1</option>
                                    <option value="Level 2- Term 2">Level 2- Term 2</option>
                                    <option value="Level 3- Term 1">Level 3- Term 1</option>
                                    <option value="Level 3- Term 2">Level 3- Term 2</option>
                                    <option value="Level 4- Term 1">Level 4- Term 1</option>
                                    <option value="Level 4- Term 2">Level 4- Term 2</option>
                                  </select>
                                  <select
                                    value={c.session || "2023-24"}
                                    onChange={(e) => {
                                      const updated = [...(editFormData.assignedCourses || [])];
                                      updated[cIdx] = { ...updated[cIdx], session: e.target.value };
                                      setEditFormData({ ...editFormData, assignedCourses: updated });
                                    }}
                                    style={{ padding: "3px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "11px", width: "85px" }}
                                  >
                                    <option value="2020-21">2020-21</option>
                                    <option value="2021-22">2021-22</option>
                                    <option value="2022-23">2022-23</option>
                                    <option value="2023-24">2023-24</option>
                                    <option value="2024-25">2024-25</option>
                                    <option value="2025-26">2025-26</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(editFormData.assignedCourses || []), { courseName: "", levelTerm: "Level 1- Term 1", session: "2023-24" }];
                                setEditFormData({ ...editFormData, assignedCourses: updated });
                              }}
                              style={{ background: "#3b8db3", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <FiPlus size={12} /> Add Course
                            </button>
                          </div>
                        ) : teacher.assignedCourses && teacher.assignedCourses.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {teacher.assignedCourses.map((c, idx) => (
                              <div key={idx} style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12.5px", fontWeight: "600", color: "#1e293b" }}>
                                {typeof c === "object" ? (c.courseName || c.courseTitle || c.name || "New Course") : String(c)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", minWidth: "140px" }}>
                        {teacher.assignedCourses && teacher.assignedCourses.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {teacher.assignedCourses.map((c, idx) => (
                              <div key={idx} style={{ padding: "4px 0" }}>
                                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "700" }}>
                                  {typeof c === "object" && c.levelTerm ? c.levelTerm : (teacher.assignedLevelTerm || "-")}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", minWidth: "100px" }}>
                        {teacher.assignedCourses && teacher.assignedCourses.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {teacher.assignedCourses.map((c, idx) => (
                              <div key={idx} style={{ padding: "4px 0" }}>
                                <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "700" }}>
                                  {typeof c === "object" && c.session ? c.session : (teacher.assignedSession || "-")}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: (teacher.accountStatus || "").toLowerCase() === "active" ? "#dcfce7" : "#fee2e2",
                          color: (teacher.accountStatus || "").toLowerCase() === "active" ? "#15803d" : "#991b1b"
                        }}>
                          {(teacher.accountStatus || "").toLowerCase() === "active" ? "active" : "inactive"}
                        </span>
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
                              style={{ background: "#e0f2fe", color: "#0284c7", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}
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
