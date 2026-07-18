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
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherDashboard({ courseId, courseCode }) {
  const { user, logout } = useAuth();
  if (!user) return null;
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
          setPreviewType(type || (previewFile.fileType?.toLowerCase().includes("pdf") ? "pdf" : 
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
      }, 3500);
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
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async (forceRefresh = false) => {
    try {
      const url = `/lectures?courseId=${courseId || ""}`;
      const data = await fetchWithCache(url, { forceRefresh });
      setLectures(data.lectures || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error("File too large");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Select a file");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", formData.title);
    fd.append("course", courseCode || "");
    fd.append("courseId", courseId || "");
    fd.append("topic", formData.topic);
    fd.append("week", formData.week);
    fd.append("department", formData.department);
    try {
      await api.post("/lectures/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded!");
      setShowForm(false);
      setFormData({
        title: "",
        course: "",
        topic: "",
        week: "",
        department: user?.department || "Software",
      });
      setFile(null);
      invalidateCache("/lectures");
      fetchLectures(true);
    } catch (error) {
      toast.error("Upload failed");
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

  const getViewUrl = (id) => `${BACKEND_URL}/api/lectures/view/${id}?token=${localStorage.getItem("token")}`;

  // Group lectures by week
  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);
  const getLecturesByWeek = (weekNum) =>
    lectures.filter((l) => l.week === weekNum);
  const getWeekCount = (weekNum) => getLecturesByWeek(weekNum).length;

  const getFileTypeBadge = (fileType) => {
    if (!fileType) return "FILE";
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return "PDF";
    if (ft.includes("word") || ft.includes("docx") || ft.includes("document")) return "DOC";
    if (ft.includes("powerpoint") || ft.includes("pptx") || ft.includes("presentation"))
      return "PPT";
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
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
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
              <div className="form-group">
                <label>File *</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mp3,.wav,.ogg,.aac,.flac"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="file-label">
                    {file ? (
                      <>
                        <FiFile size={20} /> {file.name}
                      </>
                    ) : (
                      <>
                        <FiUpload size={20} /> Click to upload
                      </>
                    )}
                  </label>
                </div>
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
            <div className="preview-modal-header">
              <h3>{previewFile.title}</h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <a
                  href={previewFile.downloadUrl}
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
                  download
                >
                  <FiDownload size={14} /> Download
                </a>
                <button className="preview-close-btn" onClick={() => setPreviewFile(null)}>
                  <FiX size={20} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body" style={{ position: "relative", minHeight: "300px" }}>
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
              ) : previewType === "pptx" && previewSlides ? (
                <div style={{ display: "flex", flexDirection: "column", height: "70vh", width: "100%" }}>
                  {/* Mode Toolbar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "#f1f5f9", padding: "8px 16px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={() => setViewStyle("slideshow")}
                        style={{
                          padding: "6px 12px",
                          fontSize: "13px",
                          borderRadius: "6px",
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
                          padding: "6px 12px",
                          fontSize: "13px",
                          borderRadius: "6px",
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
                  </div>

                  {viewStyle === "slideshow" ? (
                    <div style={{ 
                      flex: 1, 
                      display: "flex", 
                      flexDirection: "column", 
                      background: "#334155", 
                      borderRadius: "12px", 
                      overflow: "hidden", 
                      border: "1px solid #1e293b",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" 
                    }}>
                      {/* Floating Slide Canvas */}
                      <div style={{ 
                        flex: 1, 
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "center", 
                        padding: "30px 40px", 
                        color: "#2C4B66", 
                        overflow: "hidden", 
                        background: "#ffffff",
                        height: "420px",
                        boxSizing: "border-box",
                        border: "10px solid #0056b3", 
                        margin: "24px",
                        borderRadius: "4px",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.25)"
                      }}>
                        <div style={{ height: "100%", width: "100%", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: previewSlides[currentSlideIndex] }} />
                      </div>

                      {/* Control Panel */}
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "16px 24px", 
                        background: "#1e293b", 
                        borderTop: "1px solid #334155", 
                        color: "#94a3b8" 
                      }}>
                        <button 
                          onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + previewSlides.length) % previewSlides.length)}
                          style={{
                            background: "#334155",
                            color: "#f8fafc",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "500",
                            fontSize: "13px",
                            transition: "background 0.2s"
                          }}
                        >
                          Previous
                        </button>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#cbd5e1" }}>
                            Slide {currentSlideIndex + 1} of {previewSlides.length}
                          </span>
                          <button 
                            onClick={() => setIsPlaying((prev) => !prev)}
                            style={{
                              background: isPlaying ? "#ef4444" : "#10b981",
                              color: "#f8fafc",
                              border: "none",
                              padding: "6px 12px",
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
                            padding: "8px 16px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "500",
                            fontSize: "13px",
                            transition: "background 0.2s"
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      dangerouslySetInnerHTML={{ __html: previewHtml }} 
                      style={{ 
                        width: "100%", 
                        maxHeight: "60vh", 
                        overflowY: "auto", 
                        background: "#ffffff", 
                        padding: "20px",
                        borderRadius: "8px",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)"
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
