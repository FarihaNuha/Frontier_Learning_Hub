import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as docx from "docx-preview";
import { useAuth } from "../contexts/AuthContext";
import api, { BACKEND_URL } from "../services/api";
import { fetchWithCache, invalidateCache } from "../services/apiCache";
import toast from "react-hot-toast";
import ShareModal from "../components/ShareModal";
import {
  FiUpload,
  FiTrash2,
  FiEye,
  FiUser,
  FiLogOut,
  FiPlus,
  FiList,
  FiFile,
  FiFileText,
  FiCalendar,
  FiFolder,
  FiBookOpen,
  FiChevronRight,
  FiArrowLeft,
  FiMessageSquare,
  FiX,
  FiDownload,
  FiVideo,
  FiImage,
  FiVolume2,
  FiShare2,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherHomeDashboard from "../components/TeacherHomeDashboard";
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherDashboard({ courseId, courseCode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [lectures, setLectures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState("weeks"); // 'weeks' or 'weekDetail'
  const [previewFile, setPreviewFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewType, setPreviewType] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewSlides, setPreviewSlides] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLectureData, setShareLectureData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewStyle, setViewStyle] = useState("slideshow");
  const docContainerRef = useRef(null);

  useEffect(() => {
    if (!previewFile || !previewFile.id) return;

    let active = true;
    let url = null;

    const loadFile = async () => {
      setPreviewLoading(true);
      setPreviewError(false);
      try {
        const response = await api.get(`/lectures/view-base64/${previewFile.id}`);
        const { base64, previewType: type, previewHtml: html, previewText: txt, mimeType, fileType } = response.data;
        
        // Decode base64 to binary blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const rawBlob = new Blob([byteArray], { type: mimeType || fileType || previewFile.fileType || "application/pdf" });
        
        if (active) {
          url = URL.createObjectURL(rawBlob);
          setPreviewBlobUrl(url);
          setPreviewBlob(rawBlob);
          const fileNameOrType = (previewFile.title || previewFile.originalName || previewFile.fileType || "").toLowerCase();
          const isPpt = type === "pptx" || fileNameOrType.includes("pptx") || fileNameOrType.includes("ppt") || fileNameOrType.includes("presentation");

          setPreviewType(type || (isPpt ? "pptx" : 
            previewFile.fileType?.toLowerCase().includes("pdf") ? "pdf" : 
            previewFile.fileType?.toLowerCase().includes("video") ? "video" :
            previewFile.fileType?.toLowerCase().includes("audio") ? "audio" :
            previewFile.fileType?.toLowerCase().includes("image") ? "image" : "unsupported"));
          setPreviewHtml(html);
          setPreviewText(txt);
          setPreviewSlides(response.data.previewSlides || null);
          setCurrentSlideIndex(0);
          setIsPlaying(false);
          setViewStyle("slideshow");
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
      setPreviewSlides(null);
      setCurrentSlideIndex(0);
      setIsPlaying(false);
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
    let interval = null;
    if (isPlaying && previewSlides && previewSlides.length > 0) {
      interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % previewSlides.length);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, previewSlides]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!previewSlides || previewSlides.length === 0) return;
      if (e.key === "ArrowRight") {
        setCurrentSlideIndex((prev) => (prev + 1) % previewSlides.length);
      } else if (e.key === "ArrowLeft") {
        setCurrentSlideIndex((prev) => (prev - 1 + previewSlides.length) % previewSlides.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewSlides]);

  const [formData, setFormData] = useState({
    title: "",
    course: "",
    topic: "",
    week: "",
    department: user?.department || "Software",
  });
  const [files, setFiles] = useState([]);

  const fetchLectures = async (forceRefresh = false) => {
    try {
      const url = `/lectures?courseId=${courseId || ""}`;
      const data = await fetchWithCache(url, { forceRefresh });
      setLectures(data.lectures || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLectures();
    }
  }, [user]);

  if (!user) return null;
  if (!courseId) {
    return <TeacherHomeDashboard />;
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const validFiles = selectedFiles.filter((f) => f.size <= 100 * 1024 * 1024);
      if (validFiles.length < selectedFiles.length) {
        toast.error("Some files exceed 100MB limit");
      }
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newUnique = validFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newUnique];
      });
    }
    e.target.value = "";
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      toast.error("Select at least one file");
      return;
    }
    setLoading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const fd = new FormData();
        fd.append("file", currentFile);

        let fileTitle = formData.title.trim();
        if (!fileTitle) {
          fileTitle = currentFile.name.replace(/\.[^/.]+$/, "");
        } else if (files.length > 1) {
          fileTitle = `${fileTitle} (${i + 1})`;
        }

        fd.append("title", fileTitle);
        fd.append("course", courseCode || "");
        fd.append("courseId", courseId || "");
        fd.append("topic", formData.topic);
        fd.append("week", formData.week);
        fd.append("department", formData.department);

        await api.post("/lectures/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        successCount++;
      }
      toast.success(`${successCount} file(s) uploaded!`);
      setShowForm(false);
      setFormData({
        title: "",
        course: "",
        topic: "",
        week: "",
        department: user?.department || "Software",
      });
      setFiles([]);
      invalidateCache("/lectures");
      fetchLectures(true);
    } catch (error) {
      toast.error(`Upload failed after ${successCount} file(s)`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await api.delete(`/lectures/${id}`);
      toast.success("Deleted");
      invalidateCache("/lectures");
      fetchLectures(true);
    } catch (error) {
      toast.error("Failed");
    }
  };

  const handleShareLecture = (lecture) => {
    setShareLectureData(lecture);
    setShareModalOpen(true);
  };

  const getViewUrl = (id) => `${window.location.origin}/course/${courseId || ""}?lectureId=${id}`;

  // Group lectures by week
  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);
  const getLecturesByWeek = (weekNum) =>
    lectures.filter((l) => l.week === weekNum);
  const getWeekCount = (weekNum) => getLecturesByWeek(weekNum).length;

  const getFileTypeBadge = (fileType) => {
    if (!fileType) return "FILE";
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return "PDF";
    if (ft.includes("powerpoint") || ft.includes("pptx") || ft.includes("presentation"))
      return "PPT";
    if (ft.includes("word") || ft.includes("docx") || ft.includes("wordprocessing") || ft.includes("msword")) return "DOC";
    if (ft.includes("video") || ft.includes("mp4")) return "VIDEO";
    return "FILE";
  };

  const getLectureCategory = (fileType) => {
    if (!fileType) return "other";
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return "pdf";
    if (ft.includes("presentation") || ft.includes("powerpoint") || ft.includes("pptx")) return "ppt";
    if (ft.includes("video") || ft.includes("mp4") || ft.includes("webm") || ft.includes("avi") || ft.includes("quicktime")) return "video";
    if (ft.includes("audio") || ft.includes("mp3") || ft.includes("wav") || ft.includes("ogg") || ft.includes("aac") || ft.includes("flac")) return "audio";
    if (ft.includes("image") || ft.includes("png") || ft.includes("jpg") || ft.includes("jpeg") || ft.includes("gif")) return "image";
    if (ft.includes("word") || ft.includes("docx") || ft.includes("wordprocessing") || ft.includes("msword")) return "doc";
    return "other";
  };

  const categoryConfig = {
    pdf: { label: "PDF Materials", icon: <FiFile size={18} />, color: "#ef4444" },
    ppt: { label: "PPTX Slides", icon: <FiFileText size={18} />, color: "#f59e0b" },
    video: { label: "Videos", icon: <FiVideo size={18} />, color: "#8b5cf6" },
    audio: { label: "Audio", icon: <FiVolume2 size={18} />, color: "#06b6d4" },
    image: { label: "Images", icon: <FiImage size={18} />, color: "#10b981" },
    doc: { label: "DOCX Files", icon: <FiFileText size={18} />, color: "#3b82f6" },
    other: { label: "Other Files", icon: <FiFile size={18} />, color: "#6b89a0" },
  };

  const groupLecturesByCategory = (lectures) => {
    const groups = {};
    lectures.forEach((l) => {
      const cat = getLectureCategory(l.fileType);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(l);
    });
    const order = ["pdf", "ppt", "video", "audio", "image", "doc", "other"];
    return order.filter((cat) => groups[cat]).map((cat) => ({ category: cat, lectures: groups[cat] }));
  };

  return (
    <div className="dashboard-container" style={courseId ? { display: "block" } : {}}>
      {/* SIDEBAR */}
      {!courseId && (
        <TeacherSidebar
          currentPage="dashboard"
          courseId={courseId}
        />
      )}

      {/* MAIN CONTENT */}
      <div className="main-content" style={courseId ? { padding: 0 } : {}}>
        <div className="top-bar">
          <div>
            {viewMode === "weekDetail" && selectedWeek ? (
              <>
                {selectedCategory ? (
                  <button
                    className="btn-primary"
                    onClick={() => setSelectedCategory(null)}
                    style={{ marginRight: 12 }}
                  >
                    <FiArrowLeft size={16} /> Back to Categories
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setViewMode("weeks");
                      setSelectedWeek(null);
                      setSelectedCategory(null);
                    }}
                    style={{ marginRight: 12 }}
                  >
                    <FiArrowLeft size={16} /> Back to Weeks
                  </button>
                )}
              </>
            ) : (
              <h1>Lecture Management</h1>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (
              <>
                <FiList size={16} />
                View All
              </>
            ) : (
              <>
                <FiUpload size={16} />
                Upload New
              </>
            )}
          </button>
        </div>

        {/* UPLOAD FORM */}
        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2>Upload New Lecture</h2>
            </div>
            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title {files.length > 1 ? "(Optional for multiple files)" : "*"}</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required={files.length <= 1}
                  />
                </div>
                {!courseId && (
                  <div className="form-group">
                    <label>Course *</label>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Topic</label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Week *</label>
                  <select
                    name="week"
                    value={formData.week}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Week</option>
                    {weeks.map((w) => (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!courseId && (
                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="Software">Software</option>
                    <option value="EDTE">EDTE</option>
                    <option value="IRE">IRE</option>
                    <option value="Cyber">Cyber</option>
                    <option value="DataScience">Data Science</option>
                    <option value="General">General</option>
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ fontSize: 16, fontWeight: 600, color: "#2d3748", marginBottom: 8, display: "block" }}>
                  Upload Files
                </label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mp3,.wav,.ogg,.aac,.flac"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="file-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      cursor: "pointer",
                      padding: "26px",
                      borderRadius: 12,
                      border: "2px dashed #93c5fd",
                      background: "#edf5ff",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <FiUpload size={22} style={{ color: "#334155" }} />
                    <span style={{ fontSize: 16, fontWeight: 500, color: "#334155" }}>
                      Click to upload file(s)
                    </span>
                  </label>
                </div>

                {files.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <label
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: 10,
                        display: "block",
                      }}
                    >
                      Selected file(s) to upload:
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {files.map((f, idx) => (
                        <div
                          key={`${f.name}-${idx}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              overflow: "hidden",
                              paddingRight: 10,
                            }}
                          >
                            <FiFile size={18} style={{ color: "#64748b", flexShrink: 0 }} />
                            <span
                              style={{
                                fontSize: 15,
                                color: "#334155",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {f.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              fontSize: 14,
                              fontWeight: 500,
                              cursor: "pointer",
                              padding: "4px 8px",
                              flexShrink: 0,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" className="btn-success" disabled={loading}>
                {loading ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        )}

        {/* WEEKS VIEW */}
        {!showForm && viewMode === "weeks" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Week-wise Lectures</h2>
            <div className="lectures-grid">
              {weeks.map((weekNum) => {
                const count = getWeekCount(weekNum);
                return (
                  <div
                    key={weekNum}
                    className="lecture-card"
                    style={{
                      cursor: count > 0 ? "pointer" : "default",
                      opacity: count > 0 ? 1 : 0.5,
                    }}
                    onClick={() => {
                      if (count > 0) {
                        setSelectedWeek(weekNum);
                        setViewMode("weekDetail");
                      }
                    }}
                  >
                    <div className="lecture-card-icon">
                      <FiFolder
                        size={40}
                        color={count > 0 ? "#3B8DB3" : "#6B89A0"}
                      />
                    </div>
                    <div
                      className="lecture-card-content"
                      style={{ textAlign: "center" }}
                    >
                      <h3 className="lecture-title">Week {weekNum}</h3>
                      <p
                        className="lecture-course"
                        style={{
                          color: count > 0 ? "#3B8DB3" : "#6B89A0",
                          fontWeight: 600,
                        }}
                      >
                        {count} file{count !== 1 ? "s" : ""}
                      </p>
                      {count > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 13, color: "#3B8DB3" }}>
                            Click to view{" "}
                            <FiChevronRight
                              size={14}
                              style={{ verticalAlign: "middle" }}
                            />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK DETAIL VIEW */}
        {viewMode === "weekDetail" && selectedWeek && (
          <div>
            {!selectedCategory ? (
              <>
                <h2 style={{ marginBottom: 24 }}>Week {selectedWeek} - Lectures</h2>
                {getLecturesByWeek(selectedWeek).length === 0 ? (
                  <div className="empty-state">
                    <FiFile size={48} />
                    <h3>No lectures</h3>
                    <p>No lectures uploaded for Week {selectedWeek} yet.</p>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setShowForm(true);
                        setFormData({ ...formData, week: selectedWeek.toString() });
                      }}
                    >
                      <FiUpload size={16} /> Upload Lecture
                    </button>
                  </div>
                ) : (
                  <div className="lectures-grid">
                    {groupLecturesByCategory(getLecturesByWeek(selectedWeek)).map(({ category, lectures }) => (
                      <div
                        key={category}
                        className={`lecture-card card-${category}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <div className="lecture-card-icon">
                          {categoryConfig[category].icon}
                        </div>
                        <div className="lecture-card-content" style={{ textAlign: "center" }}>
                          <h3 className="lecture-title">{categoryConfig[category].label}</h3>
                          <p className="lecture-course" style={{ color: categoryConfig[category].color, fontWeight: 600 }}>
                            {lectures.length} file{lectures.length !== 1 ? "s" : ""}
                          </p>
                          <div style={{ marginTop: 8 }}>
                            <span style={{ fontSize: 13, color: categoryConfig[category].color }}>
                              Click to view{" "}
                              <FiChevronRight size={14} style={{ verticalAlign: "middle" }} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 style={{ marginBottom: 24 }}>
                  {categoryConfig[selectedCategory]?.icon} {categoryConfig[selectedCategory]?.label} - Week {selectedWeek}
                </h2>
                {getLecturesByWeek(selectedWeek).filter(
                  (l) => getLectureCategory(l.fileType) === selectedCategory
                ).length === 0 ? (
                  <div className="empty-state">
                    <FiFile size={48} />
                    <h3>No files</h3>
                    <p>No {categoryConfig[selectedCategory]?.label?.toLowerCase()} in Week {selectedWeek}.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Course</th>
                          <th>Topic</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getLecturesByWeek(selectedWeek)
                          .filter((l) => getLectureCategory(l.fileType) === selectedCategory)
                          .map((lecture) => (
                            <tr key={lecture._id}>
                              <td className="title-cell">{lecture.title}</td>
                              <td className="course-cell">{lecture.course}</td>
                              <td>{lecture.topic || "-"}</td>
                              <td>{new Date(lecture.createdAt).toLocaleDateString()}</td>
                              <td className="actions-cell">
                                <button
                                  onClick={() => setPreviewFile({
                                    id: lecture._id,
                                    url: getViewUrl(lecture._id),
                                    downloadUrl: `${BACKEND_URL}/api/lectures/download/${lecture._id}?token=${localStorage.getItem("token")}`,
                                    title: lecture.title,
                                    fileType: lecture.fileType
                                  })}
                                  className="btn-toggle"
                                  style={{ color: "#3b8db3", display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer" }}
                                >
                                  <FiEye size={16} /> View
                                </button>
                                <a
                                  href={`${BACKEND_URL}/api/lectures/download/${lecture._id}?token=${localStorage.getItem("token")}`}
                                  className="btn-toggle"
                                  style={{ 
                                    cursor: "pointer", 
                                    border: "none", 
                                    textDecoration: "none",
                                    color: "#10b981",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "none"
                                  }}
                                  download
                                >
                                  <FiDownload size={16} /> Download
                                </a>
                                <button
                                  className="btn-toggle"
                                  style={{ color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer" }}
                                  onClick={() => handleDelete(lecture._id)}
                                >
                                  <FiTrash2 size={16} /> Delete
                                </button>
                                <button
                                  className="btn-toggle"
                                  style={{ color: "#a78bfa", display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer" }}
                                  onClick={() => handleShareLecture(lecture)}
                                >
                                  <FiShare2 size={16} /> Share
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="preview-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header" style={{ padding: "10px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>{previewFile.title}</h3>
                {previewType === "pptx" && previewSlides && (
                  <div style={{ display: "flex", gap: "4px", background: "#e2e8f0", padding: "3px", borderRadius: "6px" }}>
                    <button 
                      onClick={() => setViewStyle("slideshow")}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        background: viewStyle === "slideshow" ? "#3b8db3" : "transparent",
                        color: viewStyle === "slideshow" ? "#ffffff" : "#475569",
                        transition: "all 0.2s"
                      }}
                    >
                      Slideshow Mode
                    </button>
                    <button 
                      onClick={() => setViewStyle("list")}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        background: viewStyle === "list" ? "#3b8db3" : "transparent",
                        color: viewStyle === "list" ? "#ffffff" : "#475569",
                        transition: "all 0.2s"
                      }}
                    >
                      Scroll List Mode
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={previewFile.downloadUrl}
                  className="btn-primary"
                  style={{
                    padding: "5px 12px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textDecoration: "none",
                    background: "#10b981",
                    borderRadius: "6px"
                  }}
                  download
                >
                  <FiDownload size={13} /> Download
                </a>
                <button className="preview-close-btn" onClick={() => setPreviewFile(null)}>
                  <FiX size={18} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body" style={{ position: "relative", minHeight: "300px", padding: "8px" }}>
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
                    href={previewFile.downloadUrl || previewFile.fileURL}
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
                    download
                  >
                    <FiDownload size={16} /> Direct Download
                  </a>
                </div>
              ) : previewType === "docx" ? (
                <div 
                  ref={docContainerRef} 
                  style={{ 
                    width: "100%", 
                    maxHeight: "70vh", 
                    overflowY: "auto", 
                    background: "#ffffff", 
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)"
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
              ) : previewType === "pptx" && previewSlides && previewSlides.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", flex: 1, minHeight: 0 }}>
                  {viewStyle === "slideshow" ? (
                    <div style={{ 
                      flex: 1, 
                      display: "flex", 
                      flexDirection: "column", 
                      background: "#1e293b", 
                      borderRadius: "10px", 
                      overflow: "hidden", 
                      border: "1px solid #334155",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                      minHeight: 0
                    }}>
                      {/* Floating Slide Canvas — Full Proportional Slide Container */}
                      <div style={{ 
                        flex: 1, 
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "flex-start", 
                        padding: "28px 40px", 
                        color: "#2C4B66", 
                        overflowY: "auto", 
                        background: "#ffffff",
                        boxSizing: "border-box",
                        margin: "8px",
                        borderRadius: "6px",
                        boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
                        minHeight: 0
                      }}>
                        <div style={{ width: "100%", minHeight: "100%", overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: previewSlides[currentSlideIndex] }} />
                      </div>

                      {/* Control Panel */}
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "12px 24px", 
                        background: "#0f172a", 
                        borderTop: "1px solid #334155", 
                        color: "#94a3b8" 
                      }}>
                        <button 
                          onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + previewSlides.length) % previewSlides.length)}
                          style={{
                            background: "#334155",
                            color: "#f8fafc",
                            border: "none",
                            padding: "8px 18px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "13px",
                            transition: "background 0.2s"
                          }}
                        >
                          ← Previous Slide
                        </button>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
                            Slide {currentSlideIndex + 1} of {previewSlides.length}
                          </span>
                          <button 
                            onClick={() => setIsPlaying((prev) => !prev)}
                            style={{
                              background: isPlaying ? "#ef4444" : "#10b981",
                              color: "#f8fafc",
                              border: "none",
                              padding: "6px 14px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "600",
                              transition: "background 0.2s"
                            }}
                          >
                            {isPlaying ? "Pause Autoplay" : "Play Autoplay"}
                          </button>
                        </div>

                        <button 
                          onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % previewSlides.length)}
                          style={{
                            background: "#334155",
                            color: "#f8fafc",
                            border: "none",
                            padding: "8px 18px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "13px",
                            transition: "background 0.2s"
                          }}
                        >
                          Next Slide →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      dangerouslySetInnerHTML={{ __html: previewHtml }} 
                      style={{ 
                        flex: 1,
                        width: "100%", 
                        overflowY: "auto", 
                        background: "#ffffff", 
                        padding: "24px 32px",
                        borderRadius: "8px",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
                        minHeight: 0
                      }} 
                    />
                  )}
                </div>
              ) : previewType === "html" ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: previewHtml }} 
                  style={{ 
                    width: "100%", 
                    maxHeight: "70vh", 
                    overflowY: "auto", 
                    background: "#ffffff", 
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)"
                  }} 
                />
              ) : previewType === "txt" ? (
                <div 
                  style={{ 
                    width: "100%", 
                    maxHeight: "70vh", 
                    overflowY: "auto", 
                    background: "#f8fafc", 
                    padding: "20px",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                    color: "#334155",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  {previewText}
                </div>
              ) : previewType === "image" ? (
                <img
                  src={previewBlobUrl}
                  alt={previewFile.title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
              ) : previewType === "video" ? (
                <video
                  src={previewBlobUrl}
                  controls
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
              ) : previewType === "audio" ? (
                <audio
                  src={previewBlobUrl}
                  controls
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "8px",
                  }}
                />
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
                    href={previewFile.downloadUrl}
                    className="btn-primary"
                    style={{
                      padding: "10px 20px",
                      textDecoration: "none",
                      background: "#3b8db3",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    download
                  >
                    <FiDownload size={16} /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {shareLectureData && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setShareLectureData(null); }}
          shareUrl={getViewUrl(shareLectureData._id)}
          postTitle={shareLectureData.title}
          courseId={courseId}
          lectureId={shareLectureData._id}
          fileUrl={`/api/lectures/download/${shareLectureData._id}`}
          type="lecture"
        />
      )}
    </div>
  );
}
