import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api, { BACKEND_URL } from "../services/api";
import { fetchWithCache, invalidateCache } from "../services/apiCache";
import toast from "react-hot-toast";
import axios from "axios";
import * as docx from "docx-preview";
import {
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiUpload,
  FiFile,
  FiCalendar,
  FiUser,
  FiTrash2,
  FiEdit,
  FiEye,
  FiBook,
  FiBookOpen,
  FiFileText,
  FiBookmark,
  FiLogOut,
  FiArrowLeft,
  FiX,
  FiDownload,
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentAssignmentPage({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentIdParam = searchParams.get("assignmentId");

  // Get course ID from props or URL
  const finalCourseId = propCourseId || urlCourseId;
  const finalCourseCode = propCourseCode || "";

  const [courseInfo, setCourseInfo] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [remainingFiles, setRemainingFiles] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewType, setPreviewType] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const docContainerRef = useRef(null);
  const lastAutoOpenedId = useRef(null);
  const openSubmitModalRef = useRef(null);

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

        // Ultra-fast native C++ decoding (< 10ms)
        const dataUri = `data:${mimeType || fileType || "application/pdf"};base64,${base64}`;
        const blobRes = await fetch(dataUri);
        const rawBlob = await blobRes.blob();

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

  useEffect(() => {
    if (finalCourseId) {
      fetchCourseInfo();
      fetchData();
    } else {
      navigate("/courses");
    }
  }, [finalCourseId]);

  // Auto-open assignment submission modal when navigating from notification link
  useEffect(() => {
    if (assignmentIdParam && assignments.length > 0 && assignmentIdParam !== lastAutoOpenedId.current && openSubmitModalRef.current) {
      const target = assignments.find((a) => a._id === assignmentIdParam);
      if (target) {
        lastAutoOpenedId.current = assignmentIdParam;
        setTimeout(() => openSubmitModalRef.current(target), 500);
      }
    }
  }, [assignmentIdParam, assignments]);

  const fetchCourseInfo = async () => {
    try {
      const data = await fetchWithCache(`/courses/${finalCourseId}`);
      setCourseInfo(data.course);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async (forceRefresh = false) => {
    try {
      const [assignData, subData] = await Promise.all([
        fetchWithCache(`/assignments?courseId=${finalCourseId}`, { forceRefresh }),
        fetchWithCache("/assignments/my-submissions", { forceRefresh }),
      ]);

      // Filter assignments for this course only
      const courseAssignments = (assignData.assignments || []).filter(
        (a) => a.courseId === finalCourseId || a.course === finalCourseCode,
      );

      // Filter submissions for this course and current student only
      const currentUserId = (user?.id || user?._id || "").toString();
      const courseAssignmentIds = courseAssignments.map(a => a._id.toString());
      const courseSubmissions = (subData.submissions || []).filter(s => {
        const aId = s.assignmentId?._id || s.assignmentId;
        const subStudentId = (s.studentId?._id || s.studentId || "").toString();
        const matchesStudent = !currentUserId || subStudentId === currentUserId;
        return aId && courseAssignmentIds.includes(aId.toString()) && matchesStudent;
      });

      setAssignments(courseAssignments);
      setSubmissions(courseSubmissions);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (files.length === 0 && remainingFiles.length === 0 && !comment && !isEditMode) {
      toast.error("Please upload at least one file or add a comment");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    files.forEach((f) => {
      formData.append("files", f);
    });
    if (isEditMode) {
      formData.append("keepFiles", JSON.stringify(remainingFiles));
    }
    if (comment) formData.append("comment", comment);
    try {
      const res = await api.post(
        `/assignments/submit/${selectedAssignment._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success(res.data.message);
      setSelectedAssignment(null);
      setFile(null);
      setFiles([]);
      setRemainingFiles([]);
      setComment("");
      setIsEditMode(false);
      setExistingSubmission(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Delete this submission?")) return;
    try {
      await api.delete(`/assignments/submission/${submissionId}`);
      toast.success("Deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Delete failed");
    }
  };

  const openSubmitModal = (assignment) => {
    const existing = getSubmissionForAssignment(assignment._id);
    setSelectedAssignment(assignment);
    setFiles([]);
    if (existing) {
      setIsEditMode(true);
      setExistingSubmission(existing);
      setComment(existing.comment || "");
      setFile(null);
      if (existing.files && existing.files.length > 0) {
        setRemainingFiles(existing.files);
      } else if (existing.fileURL) {
        setRemainingFiles([{ fileURL: existing.fileURL, originalName: existing.originalName || "File" }]);
      } else {
        setRemainingFiles([]);
      }
    } else {
      setIsEditMode(false);
      setExistingSubmission(null);
      setComment("");
      setFile(null);
      setRemainingFiles([]);
    }
  };
  openSubmitModalRef.current = openSubmitModal;

  const openExistingSubmission = (assignment) => {
    const existing = getSubmissionForAssignment(assignment._id);
    setSelectedAssignment(assignment);
    setIsEditMode(true);
    setExistingSubmission(existing);
    setComment(existing ? (existing.comment || "") : "");
    setFile(null);
    setFiles([]);
    if (existing) {
      if (existing.files && existing.files.length > 0) {
        setRemainingFiles(existing.files);
      } else if (existing.fileURL) {
        setRemainingFiles([{ fileURL: existing.fileURL, originalName: existing.originalName || "File" }]);
      } else {
        setRemainingFiles([]);
      }
    } else {
      setRemainingFiles([]);
    }
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const due = new Date(deadline);
    const diff = due - now;
    if (diff <= 0) return { text: "Past Due", className: "late" };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { text: `${days}d ${hours}h left`, className: "ok" };
    return { text: `${hours}h left`, className: "urgent" };
  };

  const getSubmissionForAssignment = (assignmentId) => {
    return submissions.find((s) => {
      const id = s.assignmentId?._id || s.assignmentId;
      return id === assignmentId;
    });
  };

  const filteredAssignments = assignments.filter((a) => {
    const sub = getSubmissionForAssignment(a._id);
    if (filter === "pending") return !sub;
    if (filter === "submitted") return !!sub;
    return true;
  });

  const getFileViewUrl = (fileURL) => {
    if (!fileURL) return "#";
    return `${BACKEND_URL}${fileURL}`;
  };

  const handleViewFile = (e, fileURL, title, id, type = "submission") => {
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

  if (loading) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="assignments"
          courseInfo={courseInfo}
          courseId={finalCourseId}
        />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <StudentSidebar
        currentPage="assignments"
        courseInfo={courseInfo}
        courseId={finalCourseId}
      />
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>Assignments</h1>
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
              <FiBook size={16} style={{ color: "#3B8DB3" }} />
              <span>{courseInfo?.displayCode} - {courseInfo?.name}</span>
            </p>
          </div>
          <button
            className="btn-primary"
            style={{
              background: showMySubmissions
                ? "var(--pastel-blue-dark)"
                : "linear-gradient(135deg, #3b8db3, #2c4b66)",
              color: "#ffffff"
            }}
            onClick={() => setShowMySubmissions(!showMySubmissions)}
          >
            {showMySubmissions ? "View Assignments" : "My Submissions"}
          </button>
        </div>

        {showMySubmissions ? (
          <div>
            <h2 style={{ marginBottom: 20 }}>My Submission History</h2>
            {submissions.length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} color="#6B89A0" />
                <h3>No submissions yet</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Integrity Status</th>
                      <th>File</th>
                      <th>Marks</th>
                      <th>Feedback</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub._id}>
                        <td style={{ fontWeight: 600 }}>
                          {sub.assignmentId?.title || "N/A"}
                        </td>
                        <td>{sub.assignmentId?.course || "N/A"}</td>
                        <td>
                          <span
                            className={`status-badge ${sub.isLate ? "late" : "ontime"}`}
                          >
                            {sub.isLate ? "Late" : "On Time"}
                          </span>
                        </td>
                        <td>
                          {sub.similarityPercent > 0 ? (
                            <span
                              className="status-badge"
                              style={{
                                background: "#FEE2E2",
                                color: "#DC2626",
                                fontWeight: 700,
                                padding: "2px 8px",
                                fontSize: "11px",
                                borderRadius: "12px",
                                display: "inline-block"
                              }}
                            >
                              Flagged ({sub.similarityPercent}% Similarity)
                            </span>
                          ) : (
                            <span
                              className="status-badge ontime"
                              style={{
                                background: "#ECFDF5",
                                color: "#059669",
                                padding: "2px 8px",
                                fontSize: "11px",
                                borderRadius: "12px",
                                display: "inline-block"
                              }}
                            >
                              Passed (Original)
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
                              onClick={(e) => handleViewFile(e, sub.fileURL, sub.originalName || sub.assignmentId?.title, sub._id, "submission")}
                              className="btn-sm btn-view"
                              style={{ border: "none", cursor: "pointer" }}
                            >
                              <FiEye size={14} /> View
                            </button>
                          ) : (
                            <span style={{ color: "#6B89A0", fontSize: 13 }}>
                              No file
                            </span>
                          )}
                        </td>
                        <td>
                          {sub.marks !== null ? (
                            `${sub.marks}/${sub.assignmentId?.totalMarks || 100}`
                          ) : (
                            <span style={{ color: "#F59E0B" }}>Pending</span>
                          )}
                        </td>
                        <td
                          style={{
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {sub.feedback || "-"}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {new Date(sub.submittedAt).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn-sm btn-view"
                              onClick={() => {
                                const a = assignments.find(
                                  (x) =>
                                    x._id ===
                                    (sub.assignmentId?._id || sub.assignmentId),
                                );
                                if (a) openExistingSubmission(a);
                              }}
                            >
                              <FiEdit size={14} /> Edit
                            </button>
                            {sub.assignmentId?.deadline &&
                              new Date() <
                              new Date(sub.assignmentId.deadline) && (
                                <button
                                  className="btn-sm btn-delete"
                                  onClick={() =>
                                    handleDeleteSubmission(sub._id)
                                  }
                                >
                                  <FiTrash2 size={14} /> Delete
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="filters-bar" style={{ marginBottom: 24 }}>
              <div className="filter-group">
                <label>Filter:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                </select>
              </div>
              <div className="filter-results">
                Showing <strong>{filteredAssignments.length}</strong> of{" "}
                {assignments.length}
              </div>
            </div>
            {filteredAssignments.length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} color="#6B89A0" />
                <h3>No assignments found for {courseInfo?.displayCode}</h3>
              </div>
            ) : (
              <div className="lectures-grid">
                {filteredAssignments.map((assignment) => {
                  const timeInfo = getTimeRemaining(assignment.deadline);
                  const submission = getSubmissionForAssignment(assignment._id);
                  const isPastDue = new Date() > new Date(assignment.deadline);
                  const subEnabled = assignment.submissionEnabled !== false;
                  const canClick = subEnabled;
                  const hasSubmitted = !!submission;
                  return (
                    <div
                      key={assignment._id}
                      className={`lecture-card ${canClick || hasSubmitted ? "clickable" : ""}`}
                      style={{
                        cursor:
                          canClick || hasSubmitted ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (hasSubmitted) openExistingSubmission(assignment);
                        else if (canClick) openSubmitModal(assignment);
                      }}
                    >
                      <div className="lecture-card-content">
                        <h3 className="lecture-title">{assignment.title}</h3>
                        <p className="lecture-course">{assignment.course}</p>
                        <div className="lecture-meta">
                          <span>
                            <FiCalendar size={12} /> Due:{" "}
                            {new Date(assignment.deadline).toLocaleDateString()}
                          </span>
                          <span>
                            <FiUser size={12} />{" "}
                            {assignment.createdBy?.name || "Teacher"}
                          </span>
                          <span style={{ fontWeight: 600, color: "#10b981" }}>
                            Marks: {assignment.totalMarks || 100}
                          </span>
                        </div>
                        <div className="lecture-meta" style={{ marginTop: 8 }}>
                          <span
                            className={`status-badge ${timeInfo.className}`}
                          >
                            <FiClock size={12} /> {timeInfo.text}
                          </span>
                          {submission && (
                            <span
                              className={`status-badge ${submission.isLate ? "late" : "ontime"}`}
                            >
                              <FiCheckCircle size={12} />{" "}
                              {submission.isLate ? "Late" : "Submitted"}
                            </span>
                          )}
                          {!submission && !subEnabled && (
                            <span className="status-badge late">
                              <FiAlertCircle size={12} /> Closed
                            </span>
                          )}
                          {!submission && subEnabled && isPastDue && (
                            <span className="status-badge late">
                              <FiAlertCircle size={12} /> Past Due
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Modal for submission */}
        {selectedAssignment && (
          <div
            className="modal-overlay"
            onClick={() => {
              setSelectedAssignment(null);
              setIsEditMode(false);
              setFile(null);
              setComment("");
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 550 }}
            >
              <h2>{isEditMode ? "Edit Submission" : "Submit Assignment"}</h2>
              <h3 style={{ color: "#2C4B66", marginTop: 8 }}>
                {selectedAssignment.title}
              </h3>
              <p style={{ color: "#6B89A0", marginBottom: 8 }}>
                Course: {selectedAssignment.course}
              </p>
              <p style={{ color: "#6B89A0", marginBottom: 8 }}>
                Due: {new Date(selectedAssignment.deadline).toLocaleString()}
              </p>
              <p style={{ color: "#10b981", fontWeight: 700, marginBottom: 8 }}>
                Total Marks: {selectedAssignment.totalMarks || 100}
              </p>
              {selectedAssignment.description && (
                <p style={{ color: "#2C4B66", fontSize: 14, marginBottom: 12, whiteSpace: "pre-line" }}>
                  <strong>Description:</strong><br />
                  {selectedAssignment.description}
                </p>
              )}
              {selectedAssignment.fileURL && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={(e) => handleViewFile(e, selectedAssignment.fileURL, selectedAssignment.title, selectedAssignment._id, "assignment")}
                    style={{
                      background: "#E8F4FD",
                      border: "none",
                      color: "#3B8DB3",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FiBook size={14} /> View Assignment File
                  </button>
                </div>
              )}

              {existingSubmission && (
                <div
                  style={{
                    background: "#E8F4FD",
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{ fontSize: 14, fontWeight: 600, color: "#2C4B66" }}
                  >
                    Current Submission:
                  </p>
                  <p style={{ fontSize: 13, color: "#6B89A0" }}>
                    Status:{" "}
                    <span
                      className={`status-badge ${existingSubmission.isLate ? "late" : "ontime"}`}
                    >
                      {existingSubmission.isLate ? "Late" : "On Time"}
                    </span>
                  </p>
                  <p style={{ fontSize: 13, color: "#6B89A0" }}>
                    Submitted:{" "}
                    {new Date(existingSubmission.submittedAt).toLocaleString()}
                  </p>
                  {existingSubmission.similarityPercent !== undefined && (
                    <p style={{ fontSize: 13, color: "#6B89A0", marginTop: 4, marginBottom: 8 }}>
                      Integrity Status:{" "}
                      {existingSubmission.similarityPercent > 0 ? (
                        <span
                          className="status-badge"
                          style={{
                            background: "#FEE2E2",
                            color: "#DC2626",
                            fontWeight: 700,
                            padding: "2px 8px",
                            fontSize: "11px",
                            borderRadius: "12px",
                            display: "inline-block"
                          }}
                        >
                          Flagged ({existingSubmission.similarityPercent}% Similarity)
                        </span>
                      ) : (
                        <span
                          className="status-badge ontime"
                          style={{
                            background: "#ECFDF5",
                            color: "#059669",
                            padding: "2px 8px",
                            fontSize: "11px",
                            borderRadius: "12px",
                            display: "inline-block"
                          }}
                        >
                          Passed (Original)
                        </span>
                      )}
                    </p>
                  )}
                  {isEditMode && (
                    <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#2c4b66", marginBottom: "8px" }}>Currently submitted files:</p>
                      {remainingFiles.length > 0 ? (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {remainingFiles.map((f, idx) => (
                            <li key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#ecfdf5", borderRadius: 6, border: "1px solid #d1fae5", marginBottom: 4, fontSize: 13 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#065f46" }}>
                                <FiFile size={14} color="#059669" /> {f.originalName}
                              </span>
                              <div style={{ display: "flex", gap: 10 }}>
                                <button type="button" onClick={(e) => handleViewFile(e, f.fileURL, f.originalName, existingSubmission._id, "submission")} style={{ background: "none", border: "none", color: "#3b8db3", cursor: "pointer", fontSize: 12 }}>
                                  View
                                </button>
                                <button type="button" onClick={() => setRemainingFiles(remainingFiles.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No files remaining (All documents removed)</p>
                      )}
                    </div>
                  )}
                  {existingSubmission.comment && (
                    <p style={{ fontSize: 13, color: "#6B89A0", marginTop: 4 }}>
                      Comment: {existingSubmission.comment}
                    </p>
                  )}
                </div>
              )}

              {new Date() > new Date(selectedAssignment.deadline) && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      color: "#EF4444",
                      fontWeight: 600,
                      fontSize: 14,
                      margin: 0,
                    }}
                  >
                    <FiAlertCircle size={14} /> This assignment is past due. It
                    will be marked as LATE.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    Upload Files{" "}
                    {isEditMode && "(leave empty to keep current)"}
                  </label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const selected = Array.from(e.target.files);
                        setFiles(prev => [...prev, ...selected]);
                      }}
                      id="submission-file"
                    />
                    <label htmlFor="submission-file" className="file-label">
                      <>
                        <FiUpload size={20} />{" "}
                        {isEditMode
                          ? "Click to upload new file(s)"
                          : "Click to upload file(s)"}
                      </>
                    </label>
                  </div>
                  {files.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#2c4b66", marginBottom: 6 }}>Selected file(s) to upload:</p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {files.map((f, idx) => (
                          <li key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2eef6", marginBottom: 4, fontSize: 13 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <FiFile size={14} color="#6b89a0" /> {f.name}
                            </span>
                            <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Comment (Optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 12,
                      border: "2px solid #E2EEF6",
                      borderRadius: 10,
                      fontSize: 14,
                      resize: "vertical",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    className="btn-success"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Submitting..."
                      : isEditMode
                        ? "Update"
                        : "Submit"}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: "#6B89A0" }}
                    onClick={() => {
                      setSelectedAssignment(null);
                      setIsEditMode(false);
                      setFile(null);
                      setFiles([]);
                      setRemainingFiles([]);
                      setComment("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
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
                      Note: If this file was uploaded before a server restart/redeploy, please ask your teacher to re-upload it.
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


