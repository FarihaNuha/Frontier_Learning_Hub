import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as docx from "docx-preview";
import { useAuth } from "../contexts/AuthContext";
import api, { BACKEND_URL } from "../services/api";
import { fetchWithCache } from "../services/apiCache";
import toast from "react-hot-toast";
import ShareModal from "../components/ShareModal";
import {
  FiBook,
  FiBookOpen,
  FiDownload,
  FiEye,
  FiRefreshCw,
  FiUser,
  FiLogOut,
  FiFile,
  FiFileText,
  FiVideo,
  FiCalendar,
  FiChevronRight,
  FiFolder,
  FiArrowLeft,
  FiMessageSquare,
  FiX,
  FiVolume2,
  FiImage,
  FiShare2,
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentDashboard({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams();

  // Get course ID from props (CourseDashboard) or URL
  const finalCourseId = propCourseId || urlCourseId;

  const [courseInfo, setCourseInfo] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState("weeks");
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewStyle, setViewStyle] = useState("slideshow");
  const docContainerRef = useRef(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLectureData, setShareLectureData] = useState(null);

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

  useEffect(() => {
    if (!user) return;
    if (finalCourseId) {
      fetchCourseInfo();
      fetchLectures();
    } else {
      navigate("/courses");
    }
  }, [finalCourseId, user]);

  if (!user) return null;

  const fetchCourseInfo = async () => {
    try {
      const data = await fetchWithCache(`/courses/${finalCourseId}`);
      setCourseInfo(data.course);
    } catch (error) {
      console.error(error);
      toast.error("Course not found");
      navigate("/courses");
    }
  };

  const fetchLectures = async () => {
    try {
      const url = `/lectures?courseId=${finalCourseId}`;
      const data = await fetchWithCache(url);
      setLectures(data.lectures || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const getViewUrl = (id) => `${window.location.origin}/course/${finalCourseId || ""}?lectureId=${id}`;
  const getDownloadUrl = (id) =>
    `${BACKEND_URL}/api/lectures/download/${id}?token=${localStorage.getItem("token")}`;

  // Create weeks array (1 to 14)
  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

  const getLecturesByWeek = (weekNum) =>
    lectures.filter((l) => l.week === weekNum);

  const getWeekCount = (weekNum) => getLecturesByWeek(weekNum).length;

  const getFileIcon = (fileType) => {
    if (!fileType) return <FiFile size={40} color="#6B89A0" />;
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf"))
      return <FiFileText size={40} color="#EF4444" />;
    if (ft.includes("powerpoint") || ft.includes("pptx") || ft.includes("presentation"))
      return <FiFileText size={40} color="#F59E0B" />;
    if (ft.includes("word") || ft.includes("docx") || ft.includes("wordprocessing") || ft.includes("msword"))
      return <FiFileText size={40} color="#3B82F6" />;
    if (ft.includes("video") || ft.includes("mp4"))
      return <FiVideo size={40} color="#8B5CF6" />;
    return <FiFile size={40} color="#6B89A0" />;
  };

  const getFileTypeLabel = (fileType) => {
    if (!fileType) return "File";
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return "PDF";
    if (ft.includes("powerpoint") || ft.includes("pptx") || ft.includes("presentation"))
      return "PPTX";
    if (ft.includes("word") || ft.includes("docx") || ft.includes("wordprocessing") || ft.includes("msword"))
      return "DOCX";
    if (ft.includes("video") || ft.includes("mp4")) return "Video";
    return "File";
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
    pdf: { label: "PDF Materials", icon: <FiFileText size={32} />, color: "#ef4444" },
    ppt: { label: "PPTX Slides", icon: <FiFileText size={32} />, color: "#f59e0b" },
    video: { label: "Videos", icon: <FiVideo size={32} />, color: "#8b5cf6" },
    audio: { label: "Audio", icon: <FiVolume2 size={32} />, color: "#06b6d4" },
    image: { label: "Images", icon: <FiImage size={32} />, color: "#10b981" },
    doc: { label: "DOCX Files", icon: <FiFileText size={32} />, color: "#3b82f6" },
    other: { label: "Other Files", icon: <FiFile size={32} />, color: "#6b89a0" },
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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="dashboard"
          courseInfo={courseInfo}
          courseId={finalCourseId}
        />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading course materials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!courseInfo) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="dashboard"
          courseInfo={null}
          courseId={finalCourseId}
        />
        <div className="main-content">
          <div className="empty-state">
            <FiBook size={48} color="#6B89A0" />
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
    <div className="dashboard-container" style={propCourseId ? { display: "block" } : {}}>
      {!propCourseId && (
        <StudentSidebar
          currentPage="dashboard"
          courseInfo={courseInfo}
          courseId={finalCourseId}
        />
      )}
      <div className="main-content" style={propCourseId ? { padding: 0 } : { padding: "30px" }}>
        <div className="top-bar">
          <div>
            {viewMode === "weekDetail" && selectedWeek ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (selectedCategory) {
                      setSelectedCategory(null);
                    } else {
                      setViewMode("weeks");
                      setSelectedWeek(null);
                    }
                  }}
                  style={{ marginRight: 12 }}
                >
                  <FiArrowLeft size={16} /> {selectedCategory ? "Back to Categories" : "Back to Weeks"}
                </button>
                {selectedCategory && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setViewMode("weeks");
                      setSelectedWeek(null);
                      setSelectedCategory(null);
                    }}
                    style={{ background: "#64748b" }}
                  >
                    <FiArrowLeft size={16} /> All Weeks
                  </button>
                )}
              </div>
            ) : (
              <h1>Course Materials</h1>
            )}
          </div>
          <button className="btn-primary" onClick={fetchLectures}>
            <FiRefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* WEEKS VIEW */}
        {viewMode === "weeks" && (
          <div>
            <h2 style={{ marginBottom: 8 }}>Week-wise Materials</h2>
            <p
              className="subtitle"
              style={{
                marginBottom: 20,
                fontSize: "16px",
                fontWeight: 600,
                color: "#3B8DB3",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <FiBook size={16} style={{ color: "#3B8DB3" }} />
              <span>{courseInfo.displayCode} - {courseInfo.name}</span>
            </p>
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
                      } else {
                        toast(`No materials for Week ${weekNum} yet`);
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
                        {count} material{count !== 1 ? "s" : ""}
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
        {viewMode === "weekDetail" && selectedWeek && !selectedCategory && (
          <div>
            <h2 style={{ marginBottom: 8 }}>Week {selectedWeek} - Materials</h2>
            <p
              className="subtitle"
              style={{ marginBottom: 20, fontSize: "14px", color: "#6B89A0" }}
            >
              {courseInfo.displayCode} - {courseInfo.name}
            </p>
            {getLecturesByWeek(selectedWeek).length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} color="#6B89A0" />
                <h3>No materials for Week {selectedWeek}</h3>
                <p>No course materials uploaded for this week yet.</p>
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
                      <span
                        className={`file-type-badge ${category}`}
                      >
                        {category === "pdf" ? "PDF" : category === "ppt" ? "PPTX" : category === "video" ? "Video" : category === "doc" ? "DOCX" : category === "audio" ? "Audio" : category === "image" ? "Image" : "File"}
                      </span>
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
          </div>
        )}

        {/* CATEGORY DETAIL VIEW */}
        {viewMode === "weekDetail" && selectedWeek && selectedCategory && (
          <div>
            <h2 style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              {categoryConfig[selectedCategory]?.icon}
              <span>{categoryConfig[selectedCategory]?.label} - Week {selectedWeek}</span>
            </h2>
            <p
              className="subtitle"
              style={{ marginBottom: 20, fontSize: "14px", color: "#6B89A0" }}
            >
              {courseInfo.displayCode} - {courseInfo.name}
            </p>
            {getLecturesByWeek(selectedWeek).filter((l) => getLectureCategory(l.fileType) === selectedCategory).length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} color="#6B89A0" />
                <h3>No {categoryConfig[selectedCategory]?.label?.toLowerCase()} in Week {selectedWeek}</h3>
              </div>
            ) : (
              <div className="lectures-grid">
                {getLecturesByWeek(selectedWeek)
                  .filter((l) => getLectureCategory(l.fileType) === selectedCategory)
                  .map((lecture) => (
                  <div key={lecture._id} className={`lecture-card card-${getFileTypeLabel(lecture.fileType).toLowerCase()}`}>
                    <div className="lecture-card-icon">
                      {getFileIcon(lecture.fileType)}
                    </div>
                    <div className="lecture-card-content">
                      <span
                        className={`file-type-badge ${getFileTypeLabel(lecture.fileType).toLowerCase()}`}
                      >
                        {getFileTypeLabel(lecture.fileType)}
                      </span>
                      <h3 className="lecture-title">{lecture.title}</h3>
                      <p className="lecture-course">{lecture.course}</p>
                      {lecture.topic && (
                        <p className="lecture-topic">
                          <FiChevronRight size={14} />
                          {lecture.topic}
                        </p>
                      )}
                      <div className="lecture-meta">
                        <span>
                          <FiCalendar size={12} />{" "}
                          {formatDate(lecture.createdAt)}
                        </span>
                      </div>
                      <div className="lecture-actions">
                        <button
                          onClick={() => setPreviewFile({
                            id: lecture._id,
                            url: getViewUrl(lecture._id),
                            downloadUrl: getDownloadUrl(lecture._id),
                            title: lecture.title,
                            fileType: lecture.fileType
                          })}
                          className="btn-view-lecture"
                          style={{ cursor: "pointer", border: "none" }}
                        >
                          <FiEye size={16} />
                          <span>View</span>
                        </button>
                        <button
                          className="btn-share-lecture"
                          style={{ cursor: "pointer", border: "none" }}
                          onClick={() => {
                            setShareLectureData(lecture);
                            setShareModalOpen(true);
                          }}
                        >
                          <FiShare2 size={16} />
                          <span>Share</span>
                        </button>
                        <a
                          href={getDownloadUrl(lecture._id)}
                          className="btn-download-lecture"
                        >
                          <FiDownload size={16} />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {shareLectureData && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setShareLectureData(null); }}
          shareUrl={getViewUrl(shareLectureData._id)}
          postTitle={shareLectureData.title}
          courseId={finalCourseId}
          lectureId={shareLectureData._id}
          fileUrl={`/api/lectures/download/${shareLectureData._id}`}
          type="lecture"
        />
      )}

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
                    Note: If this file was uploaded before a server restart/redeploy, please ask your teacher to re-upload it.
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
    </div>
  );
}


