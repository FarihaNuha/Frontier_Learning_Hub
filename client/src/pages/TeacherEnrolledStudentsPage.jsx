import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiArrowLeft,
  FiUserCheck,
  FiBookOpen,
  FiX,
  FiDownload,
} from "react-icons/fi";
import TeacherSidebar from "../components/TeacherSidebar";
import "../styles/dashboard.css";

export default function TeacherEnrolledStudentsPage() {
  const { id: courseIdParam } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdParam || "");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch teacher's assigned courses to populate dropdown
  useEffect(() => {
    api
      .get("/courses/my")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.courses || [];
        setCourses(list);
        if (!selectedCourseId && list.length > 0) {
          setSelectedCourseId(list[0]._id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch student roster for selected course
  useEffect(() => {
    if (!selectedCourseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get(`/courses/${selectedCourseId}/enrolled-students`)
      .then((res) => {
        setStudents(res.data.students || []);
      })
      .catch((err) => {
        toast.error("Failed to load enrolled students roster.");
      })
      .finally(() => setLoading(false));
  }, [selectedCourseId]);

  // Unique Filter Options
  const uniqueBatches = Array.from(new Set(students.map((s) => s.batch).filter(Boolean)));
  const uniqueSessions = Array.from(new Set(students.map((s) => s.session).filter(Boolean)));

  // Filtering & Search
  const filteredStudents = students.filter((s) => {
    if (batchFilter !== "all" && s.batch !== batchFilter) return false;
    if (sessionFilter !== "all" && s.session !== sessionFilter) return false;
    if (statusFilter !== "all" && s.academicStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (s.name || "").toLowerCase().includes(term) ||
      (s.studentId || "").toLowerCase().includes(term) ||
      (s.email || "").toLowerCase().includes(term) ||
      (s.department || "").toLowerCase().includes(term)
    );
  });

  const exportRosterCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error("No students to export.");
      return;
    }
    let csv = "Student ID,Student Name,Email,Department,Batch,Session,Academic Status,Registration Status\n";
    filteredStudents.forEach((s) => {
      csv += `"${s.studentId}","${s.name}","${s.email}","${s.department}","${s.batch}","${s.session}","${s.academicStatus}","${s.registrationStatus}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Enrolled_Students_Roster.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Enrolled students roster exported!");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      <TeacherSidebar currentPage="enrolled-students" courseId={selectedCourseId} />

      <div
        style={{
          flex: 1,
          padding: "40px",
          overflowY: "auto",
        }}
      >
        {/* Top Header */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(59,141,179,0.25)",
                }}
              >
                <FiUsers size={22} />
              </div>
              <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
                Enrolled Students Roster
              </h1>
            </div>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
              View and manage active enrolled students for your assigned course.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Course Selector Dropdown */}
            <div style={{ position: "relative" }}>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #3B8DB3",
                  background: "#ffffff",
                  color: "#1e293b",
                  fontSize: "14px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <option value="" disabled>
                  Select Course
                </option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.displayCode || c.courseCode} - {c.name || c.courseTitle}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={exportRosterCSV}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                background: "#3b8db3",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59,141,179,0.2)",
              }}
            >
              <FiDownload size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            marginBottom: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", width: "300px" }}>
            <FiSearch
              size={16}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Search ID, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 36px 10px 36px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13.5px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchTerm && (
              <FiX
                size={14}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", cursor: "pointer" }}
                onClick={() => setSearchTerm("")}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Batch Filter */}
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
              }}
            >
              <option value="all">All Batches</option>
              {uniqueBatches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>

            {/* Session Filter */}
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
              }}
            >
              <option value="all">All Sessions</option>
              {uniqueSessions.map((s) => (
                <option key={s} value={s}>
                  Session {s}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div style={{ background: "#ffffff", borderRadius: "14px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              Loading enrolled students roster...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              <FiUsers size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
              <h3>No enrolled students found</h3>
              <p style={{ fontSize: "14px", margin: 0 }}>
                {searchTerm ? "No student matches your filter criteria." : "No students are currently enrolled in this course."}
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontSize: "13px", fontWeight: 700 }}>
                  <th style={{ padding: "14px 20px" }}>Student ID</th>
                  <th style={{ padding: "14px 20px" }}>Student Name</th>
                  <th style={{ padding: "14px 20px" }}>Department</th>
                  <th style={{ padding: "14px 20px" }}>Batch & Session</th>
                  <th style={{ padding: "14px 20px" }}>Academic Status</th>
                  <th style={{ padding: "14px 20px" }}>Registration Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student._id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 700, color: "#3b8db3", fontSize: "14px" }}>
                      {student.studentId}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "14px",
                          }}
                        >
                          {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>{student.name}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", color: "#475569", fontSize: "13.5px" }}>
                      {student.department}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#475569", fontSize: "13.5px" }}>
                      {student.batch !== "N/A" ? `Batch ${student.batch}` : ""} {student.session !== "N/A" ? `(${student.session})` : ""}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "12px",
                          background: student.academicStatus.toLowerCase() === "active" ? "#dcfce7" : "#fef3c7",
                          color: student.academicStatus.toLowerCase() === "active" ? "#166534" : "#b45309",
                          textTransform: "capitalize",
                        }}
                      >
                        {student.academicStatus}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "12px",
                          background: student.registrationStatus === "Approved" ? "#e0f2fe" : "#fee2e2",
                          color: student.registrationStatus === "Approved" ? "#0369a1" : "#991b1b",
                        }}
                      >
                        {student.registrationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
