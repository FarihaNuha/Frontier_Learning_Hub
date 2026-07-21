import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUpload,
  FiFileText,
  FiUser,
  FiLogOut,
  FiList,
  FiCalendar,
  FiArrowLeft,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiBookOpen,
  FiInfo,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherAssessmentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: courseId } = useParams(); // Selected course context if navigated from course dashboard

  const [assessments, setAssessments] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseCode, setSelectedCourseCode] = useState(null);
  const [showRules, setShowRules] = useState(false);
  
  // Upload results summary state
  const [summary, setSummary] = useState(null);
  
  // Deletion UI states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCourse = async (courseCode) => {
    setDeleting(true);
    try {
      await api.delete(`/assessments/course/${courseCode}`);
      toast.success(`Marksheet for ${courseCode} deleted successfully`);
      setDeleteTarget(null);
      setSelectedCourseCode(null);
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete marksheet");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/assessments/record/${id}`);
      toast.success("Student assessment record deleted");
      setDeleteTarget(null);
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
    if (courseId) {
      api.get(`/courses/${courseId}`)
        .then((res) => {
          if (res.data.course?.displayCode) {
            setSelectedCourseCode(res.data.course.displayCode);
          }
        })
        .catch(() => {});
    }
  }, [courseId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assessments/teacher");
      setAssessments(res.data.assessments);
    } catch (error) {
      toast.error("Failed to load assessment marks");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSummary(null); // Clear summary on new file select
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setSummary(null);
    try {
      const res = await api.post("/assessments/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Marksheet processed successfully!");
      setSummary(res.data);
      setFile(null);
      // Reset file input element
      const fileInput = document.getElementById("xlsx-file");
      if (fileInput) fileInput.value = "";
      
      fetchAssessments();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to process marksheet");
    } finally {
      setUploading(false);
    }
  };

  // Group assessments by courseCode
  const courseGroups = assessments.reduce((acc, item) => {
    const code = item.courseCode;
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(item);
    return acc;
  }, {});

  const uniqueCourses = Object.keys(courseGroups);

  const filteredUniqueCourses = uniqueCourses.filter((code) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchesCode = code.toLowerCase().includes(q);
    const matchesStudent = (courseGroups[code] || []).some(
      (item) =>
        item.studentIdNumber.toLowerCase().includes(q) ||
        (item.studentId?.name || "").toLowerCase().includes(q)
    );
    return matchesCode || matchesStudent;
  });

  // Filter assessments based on selected course and search query
  const filteredAssessments = assessments.filter((item) => {
    const matchesCourse = selectedCourseCode
      ? item.courseCode.toLowerCase() === selectedCourseCode.toLowerCase()
      : true;

    const matchesSearch =
      item.studentIdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.studentId?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCourse && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      <TeacherSidebar
        currentPage="assessment"
        courseId={courseId}
      />

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>Assessment Marksheet Management</h1>
            <p style={{ color: "#6b89a0", marginTop: 4 }}>
              Upload and manage student marks dynamically using Excel files
            </p>
          </div>
        </div>

        {/* UPLOAD MARKSHEET BOX */}
        <div className="table-container" style={{ padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, color: "#2c4b66", marginBottom: 12 }}>
            Upload Assessment Sheet
          </h2>
          <p style={{ fontSize: 13, color: "#6b89a0", marginBottom: 16 }}>
            Upload an Excel (`.xlsx` or `.csv`) sheet. The system will automatically detect the Course Code (e.g. `Course Code: ENG 205`) and extract student marks for Quiz, Assignment, Presentation, and Attendance. Duplicates are automatically skipped.
          </p>

          {/* EXCEL FORMAT RULES & GUIDELINES CARD */}
          <div style={{
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
            border: "1px solid #bae6fd",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
          }}>
            <div 
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} 
              onClick={() => setShowRules(!showRules)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FiInfo size={20} color="#0284c7" />
                <strong style={{ color: "#0369a1", fontSize: 15 }}>Excel Marksheet Upload Format & Rules Guide</strong>
              </div>
              <span style={{ fontSize: 13, color: "#0284c7", fontWeight: 600 }}>
                {showRules ? "Hide Guidelines ▲" : "View Rules & Format Guide ▼"}
              </span>
            </div>
            {showRules && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #bae6fd", fontSize: 13, color: "#334155" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 14 }}>
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <strong style={{ color: "#0369a1", display: "block", marginBottom: 4 }}>1. Course Code Tag</strong>
                    Include a cell in the first 5 rows containing: <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Course Code: CSE 201</code>
                  </div>
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <strong style={{ color: "#0369a1", display: "block", marginBottom: 4 }}>2. Required Student ID Column</strong>
                    Header must be named <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Student ID</code> or <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>ID of the Student</code>.
                  </div>
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <strong style={{ color: "#0369a1", display: "block", marginBottom: 4 }}>3. Score Component Columns</strong>
                    Headers for <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Attendance</code>, <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Quiz</code>, <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Assignment</code>, <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Presentation</code>, and <code style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>Total</code>.
                  </div>
                </div>
                <strong style={{ color: "#0369a1", fontSize: 13, display: "block", marginBottom: 6 }}>Sample Excel Layout:</strong>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", fontSize: 12, border: "1px solid #cbd5e1" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Row</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Col A</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Col B</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Col C</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Col D</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Col E</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>Col F</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>1</td>
                        <td colSpan="6" style={{ border: "1px solid #cbd5e1", padding: "6px 10px", color: "#0284c7", fontWeight: "bold" }}>Course Code: ET 317</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>2</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>Student ID</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>Attendance</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>Quiz</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>Assignment</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>Presentation</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>Total</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: "bold" }}>3</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>2202022</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>30</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>26</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>25</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px" }}>25</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "6px 10px", color: "#16a34a", fontWeight: "bold" }}>106</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="file-upload-area" style={{ width: "100%" }}>
              <input
                type="file"
                id="xlsx-file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <label 
                htmlFor="xlsx-file" 
                style={{ 
                  cursor: "pointer", 
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  gap: 10, 
                  padding: "36px 20px",
                  border: "2px dashed var(--pastel-blue-deep)",
                  borderRadius: 16,
                  background: "rgba(59, 141, 179, 0.05)",
                  transition: "all 0.3s ease",
                  textAlign: "center"
                }}
                className="upload-dropzone"
              >
                <FiUpload size={32} color="var(--pastel-blue-primary)" style={{ marginBottom: 4 }} />
                <strong style={{ fontSize: 16, color: "var(--pastel-blue-primary)" }}>
                  {file ? file.name : "Choose Excel or CSV File"}
                </strong>
                <span style={{ fontSize: 12, color: "#6b89a0" }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click here to upload student marksheet"}
                </span>
              </label>
            </div>
            <button
              type="submit"
              className="btn-success"
              disabled={uploading || !file}
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                justifyContent: "center",
                gap: 8, 
                height: 48, 
                padding: "0 24px",
                fontSize: 15,
                fontWeight: 600,
                width: "100%",
                maxWidth: 280,
                alignSelf: "center",
                borderRadius: 12
              }}
            >
              {uploading ? "Processing Marksheet..." : "Upload & Process"}
            </button>
          </form>

          {/* UPLOAD SUMMARY DETAILS */}
          {summary && (
            <div
              style={{
                marginTop: 20,
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h4 style={{ color: "#0369a1", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <FiCheckCircle /> Marksheet Processing Summary
              </h4>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14 }}>
                <p><strong>Detected Course Code:</strong> <span className="status-badge ontime">{summary.courseCode}</span></p>
                <p><strong>Total Rows:</strong> {summary.totalProcessed}</p>
                <p><strong>Successfully Saved:</strong> <span style={{ color: "#16a34a", fontWeight: "bold" }}>{summary.savedCount}</span></p>
                <p><strong>Duplicate Rows Skipped:</strong> <span style={{ color: "#dc2626", fontWeight: "bold" }}>{summary.duplicateCount}</span></p>
              </div>
              {summary.duplicateCount > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#ef4444" }}>
                  <FiAlertCircle size={12} /> Note: Marks for {summary.duplicateCount} students were already stored for this course and were ignored.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ASSESSMENT MARKS LIST */}
        <div className="table-container">
          {selectedCourseCode === null ? (
            // CARDS GRID VIEW
            <div>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #E2EEF6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: "#2c4b66" }}>
                  Course Marksheets ({uniqueCourses.length})
                </h2>
                
                {/* GLOBAL COURSE CARDS SEARCH BAR */}
                <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
                  <input
                    type="text"
                    placeholder="Search course code, session, or student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 34px",
                      borderRadius: 8,
                      border: "1.5px solid #d4e7f5",
                      fontSize: 13,
                      width: "100%",
                      outline: "none",
                      background: "#f8fafc",
                    }}
                  />
                  <FiSearch
                    size={16}
                    color="#6B89A0"
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                </div>
              </div>

              {loading ? (
                <div className="loading-state" style={{ padding: "40px 0" }}>
                  <div className="spinner" style={{ margin: "0 auto" }}></div>
                </div>
              ) : uniqueCourses.length === 0 ? (
                <div className="empty-state" style={{ padding: "60px 0" }}>
                  <FiFileText size={48} color="#6B89A0" />
                  <h3>No course marksheets uploaded yet</h3>
                  <p>Please select and upload an Excel marksheet file above.</p>
                </div>
              ) : filteredUniqueCourses.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <FiSearch size={40} color="#6B89A0" />
                  <h3>No matching marksheets found</h3>
                  <p>No course or student matches "{searchQuery}"</p>
                </div>
              ) : (
                <div style={{ padding: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                    {filteredUniqueCourses.map((code) => {
                      const studentCount = courseGroups[code].length;
                      return (
                        <div
                          key={code}
                          onClick={() => setSelectedCourseCode(code)}
                          className="assessment-course-card"
                        >
                          {/* Card Accent Line */}
                          <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "6px",
                            height: "100%",
                            background: "#3B8DB3"
                          }}></div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <span style={{
                              background: "#E8F4FD",
                              color: "#3B8DB3",
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "13px",
                              fontWeight: 700,
                              letterSpacing: "0.5px"
                            }}>
                              {code}
                            </span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: "course", value: code });
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "4px",
                                  transition: "background 0.2s"
                                }}
                                title="Delete Marksheet"
                              >
                                <FiTrash2 size={18} />
                              </button>
                              <FiBookOpen size={24} color="#3B8DB3" />
                            </div>
                          </div>

                          <h3 style={{ fontSize: "18px", color: "#2c4b66", margin: "0 0 8px 0", fontWeight: 600 }}>
                            Assessment Marksheet
                          </h3>
                          <p style={{ color: "#6b89a0", fontSize: "14px", margin: 0 }}>
                            Students Uploaded: <strong style={{ color: "#2c4b66" }}>{studentCount}</strong>
                          </p>

                          <div style={{
                            marginTop: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#3B8DB3",
                            fontSize: "13px",
                            fontWeight: 600
                          }}>
                            <span>View Student Marks</span>
                            <span>→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // SELECTED COURSE DETAILED TABLE VIEW
            <div>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #E2EEF6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setSelectedCourseCode(null)}
                    className="btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      height: "auto",
                      border: "1px solid #d4e7f5",
                      background: "#fff"
                    }}
                  >
                    <FiArrowLeft size={14} /> Back to Courses
                  </button>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#2c4b66" }}>
                    Marksheet for <span className="status-badge ontime" style={{ background: "#E8F4FD", color: "#3B8DB3", fontWeight: 700, marginLeft: 6 }}>{selectedCourseCode}</span>
                  </h2>
                </div>

                {/* SEARCH & ACTIONS */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => setDeleteTarget({ type: "course", value: selectedCourseCode })}
                    className="btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      height: "auto",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#ef4444",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <FiTrash2 size={14} /> Delete Marksheet
                  </button>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search student ID or Name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: "8px 12px 8px 36px",
                        border: "1px solid #E2EEF6",
                        borderRadius: 8,
                        fontSize: 14,
                        width: 220,
                      }}
                    />
                    <FiSearch
                      size={16}
                      color="#6B89A0"
                      style={{ position: "absolute", left: 12, top: 11 }}
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="loading-state" style={{ padding: "40px 0" }}>
                  <div className="spinner" style={{ margin: "0 auto" }}></div>
                </div>
              ) : filteredAssessments.length === 0 ? (
                <div className="empty-state" style={{ padding: "60px 0" }}>
                  <FiFileText size={48} color="#6B89A0" />
                  <h3>No assessment records found</h3>
                  <p>Search query returned zero results</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Course Code</th>
                        <th>Attendance Score</th>
                        <th>Quiz Score</th>
                        <th>Assignment Score</th>
                        <th>Presentation Score</th>
                        <th>Total CA Marks</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssessments.map((record) => (
                        <tr key={record._id}>
                          <td style={{ fontWeight: 700 }}>{record.studentIdNumber}</td>
                          <td style={{ fontWeight: 600 }}>{record.studentId?.name || "N/A"}</td>
                          <td>
                            <span className="status-badge ontime" style={{ background: "#E8F4FD", color: "#3B8DB3" }}>
                              {record.courseCode}
                            </span>
                          </td>
                          <td>{record.attendance}</td>
                          <td>{record.quiz}</td>
                          <td>{record.assignment}</td>
                          <td>{record.presentation}</td>
                          <td style={{ fontWeight: 700, color: "#10b981" }}>{record.totalMarks}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => setDeleteTarget({ type: "single", value: record })}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#ef4444",
                                padding: "4px",
                                display: "inline-flex",
                                alignItems: "center"
                              }}
                              title="Delete record"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="preview-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px", height: "auto" }}>
            <div className="preview-modal-header" style={{ borderBottom: "1px solid #fee2e2" }}>
              <h3 style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <FiAlertCircle size={20} />
                Confirm Deletion
              </h3>
            </div>
            <div className="preview-modal-body" style={{ padding: "20px" }}>
              {deleteTarget.type === "course" ? (
                <p style={{ margin: 0, fontSize: "15px", color: "#2C4B66", lineHeight: "1.5" }}>
                  Are you sure you want to delete the entire assessment marksheet for course{" "}
                  <strong>{deleteTarget.value}</strong>? This will permanently remove all student marks associated with this marksheet. This action cannot be undone.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: "15px", color: "#2C4B66", lineHeight: "1.5" }}>
                  Are you sure you want to delete the assessment record for student{" "}
                  <strong>{deleteTarget.value.studentId?.name || deleteTarget.value.studentIdNumber}</strong> ({deleteTarget.value.studentIdNumber}) in course{" "}
                  <strong>{deleteTarget.value.courseCode}</strong>? This action cannot be undone.
                </p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "14px" }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget.type === "course") {
                    handleDeleteCourse(deleteTarget.value);
                  } else {
                    handleDeleteSingle(deleteTarget.value._id);
                  }
                }}
                className="btn-danger"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer"
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
