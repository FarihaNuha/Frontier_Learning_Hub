import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { BACKEND_URL } from "../services/api";
import toast from "react-hot-toast";
import axios from "axios";
import * as docx from "docx-preview";
import {
  FiPlus,
  FiList,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiEye,
  FiArrowLeft,
  FiFile,
  FiUpload,
  FiDownload,
  FiUser,
  FiLogOut,
  FiFileText,
  FiBookOpen,
  FiCalendar,
  FiX,
  FiClipboard,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherAssignmentPage({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams(); // ← URL থেকে courseId নিন

  // URL থেকে আসা courseId ব্যবহার করুন
  const finalCourseId = propCourseId || urlCourseId;
  const finalCourseCode = propCourseCode || "";

  console.log("=== TeacherAssignmentPage Debug ===");
  console.log("URL Course ID:", urlCourseId);
  console.log("Props Course ID:", propCourseId);
  console.log("Final Course ID:", finalCourseId);

  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewSubmissions, setViewSubmissions] = useState(null);
  const [submissionsData, setSubmissionsData] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [gradeForm, setGradeForm] = useState({
    id: null,
    marks: "",
    feedback: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: user?.department || "Software",
    deadline: "",
    totalMarks: 100,
  });
  const [courseInfo, setCourseInfo] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewType, setPreviewType] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const docContainerRef = useRef(null);

  useEffect(() => {
    if (!previewFile || !previewFile.id) return;

    let active = true;
    let url = null;

    const loadFile = async () => {
      setPreviewLoading(true);
      setPreviewError(false);
      try {
        const fileURLParam = previewFile.fileURL ? `?fileURL=${encodeURIComponent(previewFile.fileURL)}` : "";
        const endpoint = previewFile.type === "submission"
          ? `/assignments/submission/view-base64/${previewFile.id}${fileURLParam}`
          : `/assignments/view-base64/${previewFile.id}`;

        const response = await api.get(endpoint);
        const { base64, fileType, previewType: type, previewHtml: html, previewText: txt, mimeType } = response.data;
        
        // Decode base64 to binary blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const rawBlob = new Blob([byteArray], { type: mimeType || fileType || "application/pdf" });
        
        if (active) {
          url = URL.createObjectURL(rawBlob);
          setPreviewBlobUrl(url);
          setPreviewBlob(rawBlob);
          setPreviewType(type || (previewFile.fileURL?.toLowerCase().endsWith(".pdf") ? "pdf" : "unsupported"));
          setPreviewHtml(html);
          setPreviewText(txt);
        }
      } catch (err) {
        console.error("Failed to load preview blob:", err);
        if (active) setPreviewError(true);
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    loadFile();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
      setPreviewBlobUrl(null);
      setPreviewBlob(null);
      setPreviewType(null);
      setPreviewHtml(null);
      setPreviewText(null);
    };
  }, [previewFile]);

  useEffect(() => {
    if (previewType === "docx" && previewBlob && docContainerRef.current) {
      docContainerRef.current.innerHTML = "";
      docx.renderAsync(previewBlob, docContainerRef.current)
        .catch(err => {
          console.error("Error rendering docx:", err);
          if (docContainerRef.current) {
            docContainerRef.current.innerHTML = `<div style="padding: 20px; color: #ef4444; text-align: center;">Failed to render Word document layout.</div>`;
          }
        });
    }
  }, [previewType, previewBlob]);

  const [assignmentFile, setAssignmentFile] = useState(null);

  useEffect(() => {
    if (finalCourseId) {
      fetchCourseInfo();
      fetchAssignments();
    } else {
      toast.error("No course selected");
      navigate("/courses");
    }
  }, [finalCourseId]);

  const fetchCourseInfo = async () => {
    try {
      const res = await api.get(`/courses/${finalCourseId}`);
      setCourseInfo(res.data.course);
    } catch (error) {
      console.error("Fetch course info error:", error);
    }
  };

  const fetchAssignments = async () => {
    try {
      console.log("Fetching assignments for course:", finalCourseId);
      const res = await api.get(`/assignments?courseId=${finalCourseId}`);
      setAssignments(res.data.assignments);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.deadline) {
      toast.error("Title and Deadline are required");
      return;
    }
    setLoading(true);
    try {
      if (assignmentFile) {
        const fd = new FormData();
        fd.append("file", assignmentFile);
        fd.append("title", formData.title);
        fd.append("description", formData.description);
        fd.append("course", courseInfo?.displayCode || finalCourseCode);
        fd.append("courseId", finalCourseId);
        fd.append("department", formData.department);
        fd.append("deadline", new Date(formData.deadline).toISOString());
        fd.append("totalMarks", formData.totalMarks);
        await api.post("/assignments/create", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/assignments/create", {
          ...formData,
          deadline: new Date(formData.deadline).toISOString(),
          course: courseInfo?.displayCode || finalCourseCode,
          courseId: finalCourseId,
        });
      }
      toast.success("Created!");
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        department: user?.department || "Software",
        deadline: "",
        totalMarks: 100,
      });
      setAssignmentFile(null);
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.put(`/assignments/toggle/${id}`);
      toast.success(res.data.message);
      setAssignments((prev) =>
        prev.map((a) =>
          a._id === id
            ? { ...a, submissionEnabled: res.data.assignment.submissionEnabled }
            : a,
        ),
      );
    } catch (error) {
      toast.error("Toggle failed");
    }
  };

  const handleViewFile = (e, fileURL, title, id, type = "assignment") => {
    e.preventDefault();
    if (!fileURL || !id) return;
    setPreviewFile({
      title: title || "File",
      fileURL,
      id,
      type
    });
  };

  const getDownloadName = () => {
    if (!previewFile) return "file.pdf";
    const title = previewFile.title || "file";
    const ext = previewFile.fileURL ? previewFile.fileURL.split('.').pop() : "pdf";
    if (title.toLowerCase().endsWith("." + ext.toLowerCase())) {
      return title;
    }
    return `${title}.${ext}`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await api.delete(`/assignments/${id}`);
      toast.success("Deleted");
      fetchAssignments();
      if (viewSubmissions === id) {
        setViewSubmissions(null);
        setSubmissionsData(null);
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleViewSubmissions = async (id, title) => {
    try {
      const res = await api.get(`/assignments/submissions/${id}`);
      setSubmissionsData(res.data);
      setViewSubmissions(id);
      setSelectedTitle(title);
    } catch (error) {
      toast.error("Failed to load submissions");
    }
  };

  const handleGrade = async (submissionId) => {
    if (!gradeForm.marks) {
      toast.error("Enter marks");
      return;
    }
    try {
      await api.put(`/assignments/grade/${submissionId}`, {
        marks: Number(gradeForm.marks),
        feedback: gradeForm.feedback,
      });
      toast.success("Graded!");
      setGradeForm({ id: null, marks: "", feedback: "" });
      handleViewSubmissions(viewSubmissions, selectedTitle);
    } catch (error) {
      toast.error("Grading failed");
    }
  };

  const getFileViewUrl = (url) => (url ? `${BACKEND_URL}${url}` : "#");

  if (!finalCourseId) {
    return (
      <div className="dashboard-container">
        <TeacherSidebar
          currentPage="assignments"
          courseId={finalCourseId}
        />
        <div className="main-content">
          <div className="empty-state">
            <h3>No Course Selected</h3>
            <button
              className="btn-primary"
              onClick={() => navigate("/courses")}
            >
              Go to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar - same as before */}
      <TeacherSidebar
        currentPage="assignments"
        courseId={finalCourseId}
      />

      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>Assignment Management</h1>
            <p
              className="subtitle"
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#3B8DB3",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <FiClipboard size={16} style={{ color: "#3B8DB3" }} />
              <span>
                {courseInfo ? `${courseInfo.displayCode} - ${courseInfo.name}` : `${user?.department} Department`}
              </span>
            </p>
          </div>
          {!viewSubmissions && (
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? (
                <>
                  <FiList size={16} /> View All
                </>
              ) : (
                <>
                  <FiPlus size={16} /> Create New
                </>
              )}
            </button>
          )}
        </div>

        {/* Rest of your JSX - same as before */}
        {showForm && !viewSubmissions && (
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>Create New Assignment</h2>
            <form onSubmit={handleCreate} className="upload-form">
              {/* Your existing form fields */}
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Deadline *</label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total Marks</label>
                  <input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMarks: e.target.value })
                    }
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              {!finalCourseId && (
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  >
                    <option value="Software">Software Engineering</option>
                    <option value="EDTE">EDTE</option>
                    <option value="IRE">IRE</option>
                    <option value="Cyber">Cyber Security</option>
                    <option value="DataScience">Data Science</option>
                    <option value="General">General</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Attach File (Optional)</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    onChange={(e) => setAssignmentFile(e.target.files[0])}
                    id="assignment-file"
                  />
                  <label htmlFor="assignment-file" className="file-label">
                    {assignmentFile ? (
                      <>
                        <FiFile size={20} /> {assignmentFile.name}
                      </>
                    ) : (
                      <>
                        <FiUpload size={24} /> Click to upload
                      </>
                    )}
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn-success"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Assignment"}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: "#6B89A0" }}
                  onClick={() => {
                    setShowForm(false);
                    setAssignmentFile(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW SUBMISSIONS */}
        {viewSubmissions && submissionsData && (
          <div>
            <button
              className="btn-primary"
              onClick={() => {
                setViewSubmissions(null);
                setSubmissionsData(null);
              }}
              style={{ marginBottom: 20 }}
            >
              <FiArrowLeft size={16} /> Back to Assignments
            </button>
            <h2>Submissions: {selectedTitle}</h2>
            <div style={{ display: "flex", gap: 20, margin: "20px 0" }}>
              <span className="status-badge ontime">
                On Time: {submissionsData.onTime.length}
              </span>
              <span className="status-badge late">
                Late: {submissionsData.late.length}
              </span>
              <span>Total: {submissionsData.total}</span>
            </div>
            {submissionsData.submissions.length === 0 ? (
              <div className="empty-state">
                <h3>No submissions yet</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Submitted At</th>
                      <th>Status</th>
                      <th>Similarity Report</th>
                      <th>File</th>
                      <th>Grade</th>
                      <th>Feedback</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsData.submissions.map((sub) => {
                      const isGradingThis = gradeForm.id === sub._id;
                      return (
                        <tr key={sub._id}>
                          <td style={{ fontWeight: 600 }}>{sub.studentId?.name || "N/A"}</td>
                          <td>{sub.studentId?.email || "N/A"}</td>
                          <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                          <td>
                            <span className={`status-badge ${sub.isLate ? "late" : "ontime"}`}>
                              {sub.isLate ? "Late" : "On Time"}
                            </span>
                          </td>
                          <td>
                            {sub.similarityPercent > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start", minWidth: "180px" }}>
                                {sub.similarityMatches && sub.similarityMatches.length > 0 ? (
                                  [...sub.similarityMatches]
                                    .sort((a, b) => b.similarityPercent - a.similarityPercent)
                                    .map((match, mIdx) => (
                                      <div 
                                        key={mIdx} 
                                        style={{ 
                                          display: "flex", 
                                          flexDirection: "column", 
                                          gap: "1px", 
                                          borderBottom: mIdx < sub.similarityMatches.length - 1 ? "1px dashed #E2EEF6" : "none", 
                                          paddingBottom: mIdx < sub.similarityMatches.length - 1 ? "6px" : "0", 
                                          width: "100%" 
                                        }}
                                      >
                                        <span 
                                          className="status-badge" 
                                          style={{ 
                                            background: match.similarityPercent >= 40 ? "#FEE2E2" : "#FEF3C7", 
                                            color: match.similarityPercent >= 40 ? "#DC2626" : "#D97706", 
                                            fontWeight: 700,
                                            padding: "2px 8px",
                                            fontSize: "10px",
                                            borderRadius: "12px",
                                            display: "inline-block",
                                            width: "fit-content"
                                          }}
                                        >
                                          {match.similarityPercent}% Match
                                        </span>
                                        <span style={{ fontSize: "11px", color: "#4B5563", marginTop: 2 }}>
                                          Matched: <strong>{match.studentId?.name || "Student"}</strong> ({match.studentId?.studentId || "N/A"})
                                        </span>
                                        {match.submissionId?.originalName && (
                                          <span style={{ fontSize: "10px", color: "#6B7280", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                                            File: {match.submissionId.originalName}
                                          </span>
                                        )}
                                      </div>
                                    ))
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span 
                                      className="status-badge" 
                                      style={{ 
                                        background: sub.similarityPercent >= 40 ? "#FEE2E2" : "#FEF3C7", 
                                        color: sub.similarityPercent >= 40 ? "#DC2626" : "#D97706", 
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        fontSize: "11px",
                                        borderRadius: "12px",
                                        display: "inline-block"
                                      }}
                                    >
                                      {sub.similarityPercent}% Match
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#4B5563", marginTop: 2 }}>
                                      Matched: <strong>{sub.similarityMatchedStudent?.name || "Student"}</strong> ({sub.similarityMatchedStudent?.studentId || "N/A"})
                                    </span>
                                    {sub.similarityMatchedSubmission?.originalName && (
                                      <span style={{ fontSize: "10px", color: "#6B7280", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                                        File: {sub.similarityMatchedSubmission.originalName}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span 
                                className="status-badge ontime" 
                                style={{ 
                                  background: "#ECFDF5", 
                                  color: "#059669",
                                  padding: "2px 8px",
                                  fontSize: "11px",
                                  borderRadius: "12px"
                                }}
                              >
                                0% (Original)
                              </span>
                            )}
                          </td>
                          <td>
                            {sub.files && sub.files.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {sub.files.map((fileItem, fileIdx) => (
                                  <div key={fileIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontSize: "12px", color: "#2c4b66", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileItem.originalName}>
                                      {fileItem.originalName}
                                    </span>
                                    <button
                                      onClick={(e) => handleViewFile(e, fileItem.fileURL, fileItem.originalName, sub._id, "submission")}
                                      className="btn-sm btn-view"
                                      style={{ border: "none", cursor: "pointer", padding: "2px 6px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px" }}
                                    >
                                      <FiEye size={10} /> View
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : sub.fileURL ? (
                              <button
                                onClick={(e) => handleViewFile(e, sub.fileURL, sub.originalName, sub._id, "submission")}
                                className="btn-sm btn-view"
                                style={{ border: "none", cursor: "pointer" }}
                              >
                                <FiEye size={14} /> View File
                              </button>
                            ) : (
                              "No file"
                            )}
                          </td>
                          <td>
                            {isGradingThis ? (
                              <input
                                type="number"
                                value={gradeForm.marks}
                                onChange={(e) => setGradeForm({ ...gradeForm, marks: e.target.value })}
                                style={{ width: "60px", padding: "4px", borderRadius: "4px", border: "1px solid #ccc" }}
                                min="0"
                                placeholder="Marks"
                              />
                            ) : sub.marks !== null ? (
                              <span style={{ fontWeight: 600 }}>{sub.marks}</span>
                            ) : (
                              <span style={{ color: "#F59E0B" }}>Not graded</span>
                            )}
                          </td>
                          <td>
                            {isGradingThis ? (
                              <input
                                type="text"
                                value={gradeForm.feedback}
                                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                style={{ width: "150px", padding: "4px", borderRadius: "4px", border: "1px solid #ccc" }}
                                placeholder="Feedback"
                              />
                            ) : (
                              sub.feedback || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No feedback</span>
                            )}
                          </td>
                          <td className="actions-cell">
                            {isGradingThis ? (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  className="btn-sm btn-success"
                                  onClick={() => handleGrade(sub._id)}
                                  style={{ padding: "4px 8px" }}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn-sm btn-primary"
                                  onClick={() => setGradeForm({ id: null, marks: "", feedback: "" })}
                                  style={{ padding: "4px 8px", background: "#6b89a0" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn-sm btn-view"
                                onClick={() => setGradeForm({
                                  id: sub._id,
                                  marks: sub.marks !== null ? sub.marks.toString() : "",
                                  feedback: sub.feedback || ""
                                })}
                              >
                                Grade
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS LIST */}
        {!showForm && !viewSubmissions && (
          <div>
            <h2 style={{ marginBottom: 24 }}>All Assignments ({assignments.length})</h2>
            {assignments.length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} color="#6B89A0" />
                <h3>No assignments created yet</h3>
                <button
                  className="btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  Create First Assignment
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Course</th>
                      <th>Deadline</th>
                      <th>Marks</th>
                      <th>Status</th>
                      <th>File</th>
                      <th>Submissions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const hasFile = a.fileURL && a.fileURL !== "";
                      const isOpen = a.submissionEnabled !== false;
                      return (
                        <tr key={a._id}>
                          <td>{a.title}</td>
                          <td>{a.course}</td>
                          <td>{new Date(a.deadline).toLocaleString()}</td>
                          <td style={{ fontWeight: 700, color: "#10b981" }}>{a.totalMarks || 100}</td>
                          <td>
                            <span
                              className={`status-badge ${isOpen ? "ontime" : "late"}`}
                            >
                              {isOpen ? "Open" : "Closed"}
                            </span>
                          </td>
                          <td>
                            {hasFile ? (
                              <button
                                onClick={(e) => handleViewFile(e, a.fileURL, a.title, a._id, "assignment")}
                                className="btn-sm btn-view"
                                style={{ border: "none", cursor: "pointer" }}
                              >
                                <FiEye size={14} /> View File
                              </button>
                            ) : (
                              "No file"
                            )}
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-view"
                              onClick={() =>
                                handleViewSubmissions(a._id, a.title)
                              }
                            >
                              <FiEye size={14} /> View Submissions
                            </button>
                          </td>
                          <td className="actions-cell">
                            <button
                              className="btn-toggle"
                              onClick={() => handleToggle(a._id)}
                            >
                              {isOpen ? (
                                <FiToggleRight size={24} color="#10B981" />
                              ) : (
                                <FiToggleLeft size={24} color="#EF4444" />
                              )}
                            </button>
                            <button
                              className="btn-delete-icon"
                              onClick={() => handleDelete(a._id)}
                            >
                              <FiTrash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* File Preview Modal */}
        {previewFile && (
          <div className="preview-modal-overlay" onClick={() => setPreviewFile(null)}>
            <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="preview-modal-header">
                <h3>{previewFile.title}</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <a
                    href={previewBlobUrl || "#"}
                    download={getDownloadName()}
                    className="btn-primary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                      background: "#10b981",
                    }}
                  >
                    <FiDownload size={14} /> Download
                  </a>
                  <button className="preview-close-btn" onClick={() => setPreviewFile(null)}>
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="preview-modal-body" style={{ position: "relative", minHeight: "450px", height: "70vh" }}>
                {previewLoading ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <div className="spinner" style={{ margin: "0 auto 16px auto" }}></div>
                    <p style={{ color: "#6b89a0" }}>Loading preview...</p>
                  </div>
                ) : previewError ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <FiX size={48} color="#ef4444" style={{ marginBottom: "16px" }} />
                    <h4 style={{ color: "#2c4b66", marginBottom: "8px" }}>
                      Unable to Preview File
                    </h4>
                    <p style={{ color: "#6b89a0", marginBottom: "10px", fontSize: "14px" }}>
                      The preview data could not be fetched from the server.
                    </p>
                    <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "12px", fontStyle: "italic" }}>
                      Note: If this file was uploaded before a server restart/redeploy, please re-upload the file.
                    </p>
                    <a
                      href={previewBlobUrl || (api.defaults?.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, "") : "http://localhost:5000") + (previewFile.fileURL?.startsWith("/") ? "" : "/") + previewFile.fileURL}
                      download={getDownloadName()}
                      className="btn-primary"
                      style={{
                        padding: "10px 20px",
                        textDecoration: "none",
                        background: "#3b8db3",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "8px"
                      }}
                    >
                      <FiDownload size={16} /> Direct Download
                    </a>
                  </div>
                ) : previewType === "docx" ? (
                  <div
                    ref={docContainerRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "auto",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      border: "1px solid #e2eef6",
                      padding: "10px",
                      textAlign: "left"
                    }}
                  />
                ) : previewType === "pdf" ? (
                  <iframe
                    src={previewBlobUrl}
                    title={previewFile.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px",
                      background: "#ffffff",
                    }}
                  />
                ) : previewType === "html" ? (
                  <div 
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      overflowY: "auto", 
                      background: "#ffffff", 
                      borderRadius: "8px",
                      border: "1px solid #e2eef6",
                      padding: "16px",
                      textAlign: "left"
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : previewType === "txt" ? (
                  <pre
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "auto",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2eef6",
                      padding: "20px",
                      textAlign: "left",
                      whiteSpace: "pre-wrap",
                      fontSize: "14px",
                      color: "#2C4B66",
                      margin: 0,
                      fontFamily: "monospace"
                    }}
                  >
                    {previewText}
                  </pre>
                ) : previewType === "image" ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", overflow: "auto", background: "#f8fafc", borderRadius: "8px" }}>
                    <img 
                      src={previewBlobUrl} 
                      alt={previewFile.title} 
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }} 
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <FiFile size={64} color="#6b89a0" style={{ marginBottom: "16px" }} />
                    <h4 style={{ color: "#2c4b66", marginBottom: "8px" }}>
                      Preview not available for this file type
                    </h4>
                    <p style={{ color: "#6b89a0", marginBottom: "20px" }}>
                      Please download the file to view its contents.
                    </p>
                    <a
                      href={previewBlobUrl || "#"}
                      download={getDownloadName()}
                      className="btn-primary"
                      style={{
                        padding: "10px 20px",
                        textDecoration: "none",
                        background: "#3b8db3",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <FiDownload size={16} /> Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
