import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { analyzeAnswers } from "../services/aiDetector";
import {
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiUser,
  FiLogOut,
  FiBook,
  FiBookOpen,
  FiFileText,
  FiCalendar,
  FiEye,
} from "react-icons/fi";
import "../styles/dashboard.css";
import "../styles/exam.css";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentExamPage({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams();
  const [searchParams] = useSearchParams();
  const examIdParam = searchParams.get("examId");

  // Get course ID from props (CourseDashboard) or URL
  const finalCourseId = propCourseId || urlCourseId;

  const [courseInfo, setCourseInfo] = useState(null);
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [viewResults, setViewResults] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examLocked, setExamLocked] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const answersRef = useRef({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const examActive = useRef(false);
  const submitting = useRef(false);
  const timerId = useRef(null);
  const violationReason = useRef("");
  const lastAutoStartedId = useRef(null);
  const startExamRef = useRef(null);

  const fsHandlerRef = useRef(null);
  const keyHandlerRef = useRef(null);
  const visHandlerRef = useRef(null);
  const blurHandlerRef = useRef(null);

  useEffect(() => {
    if (finalCourseId) {
      fetchCourseInfo();
      fetchData();
    } else {
      navigate("/courses");
    }

    const handleFocus = () => {
      if (finalCourseId) fetchData();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      cleanupAll();
      window.removeEventListener("focus", handleFocus);
    };
  }, [finalCourseId]);

  // Auto-start exam when navigating from a notification link with examId
  useEffect(() => {
    if (examIdParam && exams.length > 0 && examIdParam !== lastAutoStartedId.current && startExamRef.current) {
      const target = exams.find((e) => e._id === examIdParam);
      if (target) {
        lastAutoStartedId.current = examIdParam;
        const t = setTimeout(() => startExamRef.current(target), 600);
        return () => clearTimeout(t);
      }
    }
  }, [examIdParam, exams]);

  const fetchCourseInfo = async () => {
    try {
      const res = await api.get(`/courses/${finalCourseId}`);
      setCourseInfo(res.data.course);
    } catch (error) {
      console.error(error);
      toast.error("Course not found");
      navigate("/courses");
    }
  };

  const cleanupAll = () => {
    examActive.current = false;
    submitting.current = false;
    if (timerId.current) clearInterval(timerId.current);
    removeAllListeners();
    const courseSidebar = document.querySelector(
      ".dashboard-container > .sidebar",
    );
    if (courseSidebar) courseSidebar.style.display = "";
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get exams for THIS SPECIFIC COURSE only
      const [examsRes, subsRes] = await Promise.all([
        api.get(`/exams?courseId=${finalCourseId}`),
        api.get("/exams/my-submissions"),
      ]);
      setExams(examsRes.data.exams);
      setSubmissions(subsRes.data.submissions);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const resetStudentView = () => {
    cleanupAll();
    setExamStarted(false);
    setActiveExam(null);
    setAnswers({});
    setTimeLeft(0);
    setAiLoading(false);
    setExamResult(null);
    setExamSubmitted(false);
    setExamLocked(false);
    setViewResults(false);
    setExpandedSubmission(null);
    setSelectedSubmission(null);
    fetchData();
  };

  const isAlreadySubmitted = (examId) =>
    submissions.some((s) => s.examId?._id === examId);

  const startExam = async (exam) => {
    if (examActive.current) return;
    if (isAlreadySubmitted(exam._id)) {
      toast.error("Already submitted!");
      return;
    }
    if (exam.scheduledAt && new Date() < new Date(exam.scheduledAt)) {
      toast(`Exam starts at ${new Date(exam.scheduledAt).toLocaleString()}`, {
        icon: "⏰",
      });
      return;
    }
    try {
      const courseSidebar = document.querySelector(
        ".dashboard-container > .sidebar",
      );
      if (courseSidebar) courseSidebar.style.display = "none";

      const res = await api.get(`/exams/${exam._id}`);
      const examData = res.data.exam;
      examActive.current = true;
      submitting.current = false;
      violationReason.current = "";
      setActiveExam(examData);
      setExamStarted(true);
      const maxSeconds = examData.duration * 60;
      const deadlineSeconds = examData.deadline ? Math.max(0, Math.floor((new Date(examData.deadline).getTime() - Date.now()) / 1000)) : maxSeconds;
      const allowedSeconds = Math.min(maxSeconds, deadlineSeconds);

      setTimeLeft(allowedSeconds);
      setAnswers({});
      setExamSubmitted(false);
      setExamResult(null);
      setExamLocked(false);
      setViewResults(false);

      let secondsLeft = allowedSeconds;
      timerId.current = setInterval(() => {
        secondsLeft--;
        setTimeLeft(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(timerId.current);
          if (examActive.current && !submitting.current) {
            doSubmit(examData, "timeout");
          }
        }
      }, 1000);

      setTimeout(() => {
        const examContainer = document.querySelector(".course-tab-content");
        const target = examContainer || document.documentElement;
        const fn =
          target.requestFullscreen ||
          target.webkitRequestFullscreen ||
          target.msRequestFullscreen;
        if (fn) fn.call(target).catch(() => {});
      }, 500);

      addAllListeners(examData);
    } catch (error) {
      toast.error("Failed to start exam");
    }
  };
  startExamRef.current = startExam;

  const handleFullscreenChange = (examData) => {
    if (!examActive.current || submitting.current || examLocked) return;
    const fs = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    if (!fs) {
      doSubmit(examData, "fullscreen_exit");
    }
  };

  const handleKeyDown = (e, examData) => {
    if (!examActive.current || submitting.current || examLocked) return;
    if (e.key === "Escape" || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      doSubmit(examData, "esc_pressed");
      return;
    }
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J"))
    ) {
      e.preventDefault();
      doSubmit(examData, "devtools");
      return;
    }
  };

  const handleVisibility = (examData) => {
    if (!examActive.current || submitting.current || examLocked) return;
    if (document.hidden) {
      doSubmit(examData, "tab_switch");
    }
  };

  const handleBlur = (examData) => {
    if (!examActive.current || submitting.current || examLocked) return;
    setTimeout(() => {
      if (examActive.current && !submitting.current && document.hidden) {
        doSubmit(examData, "tab_switch");
      }
    }, 500);
  };

  const blockEvt = (e) => {
    if (examActive.current) {
      e.preventDefault();
      return false;
    }
  };

  const blockKeys = (e) => {
    if (!examActive.current) return;
    if (e.ctrlKey || e.metaKey) {
      const keys = ["c", "v", "x", "a", "u", "s", "p", "i", "j"];
      if (keys.includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
    }
    if (e.key === "PrintScreen") {
      e.preventDefault();
      return false;
    }
  };

  const addAllListeners = (examData) => {
    removeAllListeners();
    fsHandlerRef.current = () => handleFullscreenChange(examData);
    keyHandlerRef.current = (e) => handleKeyDown(e, examData);
    visHandlerRef.current = () => handleVisibility(examData);
    blurHandlerRef.current = () => handleBlur(examData);

    document.addEventListener("fullscreenchange", fsHandlerRef.current);
    document.addEventListener("webkitfullscreenchange", fsHandlerRef.current);
    document.addEventListener("keydown", keyHandlerRef.current);
    document.addEventListener("visibilitychange", visHandlerRef.current);
    window.addEventListener("blur", blurHandlerRef.current);
    document.addEventListener("copy", blockEvt);
    document.addEventListener("paste", blockEvt);
    document.addEventListener("cut", blockEvt);
    document.addEventListener("contextmenu", blockEvt);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("keyup", blockKeys);
  };

  const removeAllListeners = () => {
    if (fsHandlerRef.current) {
      document.removeEventListener("fullscreenchange", fsHandlerRef.current);
      document.removeEventListener("webkitfullscreenchange", fsHandlerRef.current);
    }
    if (keyHandlerRef.current) {
      document.removeEventListener("keydown", keyHandlerRef.current);
    }
    if (visHandlerRef.current) {
      document.removeEventListener("visibilitychange", visHandlerRef.current);
    }
    if (blurHandlerRef.current) {
      window.removeEventListener("blur", blurHandlerRef.current);
    }
    document.removeEventListener("copy", blockEvt);
    document.removeEventListener("paste", blockEvt);
    document.removeEventListener("cut", blockEvt);
    document.removeEventListener("contextmenu", blockEvt);
    document.removeEventListener("keydown", blockKeys);
    document.removeEventListener("keyup", blockKeys);
  };

  const calcMarks = (examData) => {
    let m = 0;
    const currentAnswers = answersRef.current;
    examData.questions.forEach((q, i) => {
      if (q.type === "mcq") {
        if (currentAnswers[i] !== undefined && currentAnswers[i] === q.correctAnswer)
          m += q.marks;
      } else {
        if (currentAnswers[i] && currentAnswers[i].toString().trim().length > 0) m += q.marks;
      }
    });
    return m;
  };

  const doSubmit = async (examData, reason) => {
    if (!examActive.current || submitting.current) return;
    submitting.current = true;
    examActive.current = false;
    if (timerId.current) clearInterval(timerId.current);
    removeAllListeners();
    setExamLocked(true);
    setExamStarted(false);
    setActiveExam(null);

    const total = examData.totalMarks;
    const obtained = calcMarks(examData);
    let msg = "";
    let viol = false;
    if (reason === "fullscreen_exit") {
      viol = true;
      msg = "Fullscreen exited - Exam auto-submitted!";
    } else if (reason === "esc_pressed") {
      viol = true;
      msg = "ESC pressed - Exam auto-submitted!";
    } else if (reason === "tab_switch") {
      viol = true;
      msg = "Tab switch detected - Exam auto-submitted!";
    } else if (reason === "window_blur") {
      viol = true;
      msg = "Window blur detected - Exam auto-submitted!";
    } else if (reason === "devtools") {
      viol = true;
      msg = "DevTools detected - Exam auto-submitted!";
    } else if (reason === "timeout") {
      msg = "Time expired - Exam auto-submitted.";
    } else if (reason === "manual") {
      msg = "Exam submitted successfully!";
    } else {
      msg = "Exam submitted successfully!";
    }

    const pct = Math.round((obtained / total) * 100);
    setAiLoading(true);
    setExamSubmitted(true);
    const currentAnswers = answersRef.current;
    const formatted = examData.questions.map((q, i) => ({
      questionIndex: i,
      answer: currentAnswers[i] !== undefined ? currentAnswers[i] : "",
    }));
    let aiResult = { overallAI: 0 };
    try {
      aiResult = await analyzeAnswers(currentAnswers, examData.questions);
    } catch (e) {}
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
    try {
      const res = await api.post("/exams/submit", {
        examId: examData._id,
        answers: formatted,
        tabSwitches:
          reason === "tab_switch" || reason === "window_blur" ? 1 : 0,
        securityViolations: viol ? 1 : 0,
        cheatingDetected: viol,
        reason: msg,
        aiPercentage: aiResult.overallAI,
      });
      setAiLoading(false);

      const savedSubmission = res.data.submission;
      const backendObtained = savedSubmission ? savedSubmission.totalMarksObtained : obtained;
      const backendPct = savedSubmission ? savedSubmission.percentage : pct;

      const clr = viol ? "#EF4444" : backendObtained === total ? "#10B981" : "#F59E0B";
      setExamResult({
        obtainedMarks: backendObtained,
        totalMarks: total,
        percentage: backendPct,
        message: msg,
        isViolation: viol,
        resultColor: clr,
        title: examData.title,
        duration: examData.duration,
        totalQuestions: examData.questions.length,
        submittedAt: new Date().toLocaleString(),
        aiPercentage: aiResult.overallAI,
      });
      fetchData();
      if (viol) toast.error(msg);
      else if (reason === "timeout") toast("Time expired!", { icon: "⏰" });
      else toast.success("Submitted successfully!");
    } catch (error) {
      toast.error("Submit failed");
      submitting.current = false;
      examActive.current = true;
      setAiLoading(false);
      setExamLocked(false);
    }
  };

  const manualSubmit = () => {
    if (!examActive.current || submitting.current || !activeExam || examLocked)
      return;
    doSubmit(activeExam, "manual");
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60),
      sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Exam fullscreen mode
  if (examStarted && !examSubmitted && activeExam) {
    return (
      <div
        className="exam-fullscreen-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "white",
          zIndex: 99999,
          overflow: "auto",
          userSelect: examLocked ? "auto" : "none",
        }}
      >
        <div
          className="exam-active-screen"
          style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}
        >
          <div className="exam-header-bar">
            <div>
              <h2>{activeExam.title}</h2>
              <p>
                {activeExam.course} | {activeExam.questions.length} Q |{" "}
                {activeExam.totalMarks} Marks
              </p>
            </div>
            <div className="exam-timer">{fmt(timeLeft)}</div>
            <div className="exam-progress">
              <span>
                Q: {Object.keys(answers).length}/{activeExam.questions.length}
              </span>
              <span>
                Ans:{" "}
                {
                  Object.values(answers).filter(
                    (a) => a !== undefined && a !== "",
                  ).length
                }
              </span>
            </div>
          </div>
          <div className="exam-rules-warning">
            <h4>
              <FiAlertCircle size={16} /> Rules
            </h4>
            <ul>
              <li>ESC = auto-submit</li>
              <li>Exit fullscreen = auto-submit</li>
              <li>Tab switch = auto-submit</li>
              <li>No copy/paste</li>
            </ul>
          </div>
          {examLocked && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.9)",
                zIndex: 99999,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 20,
                  padding: 40,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "4rem" }}>⚠️</div>
                <h2 style={{ color: "#dc3545" }}>Exam Auto-Submitted!</h2>
              </div>
            </div>
          )}
          {activeExam.questions.map((q, i) => (
            <div
              key={i}
              className="card"
              style={{
                marginBottom: 16,
                opacity: examLocked ? 0.5 : 1,
                pointerEvents: examLocked ? "none" : "auto",
              }}
            >
              <div className="question-header">
                <h4>
                  Q{i + 1}. {q.question}
                </h4>
                <span className="question-marks">{q.marks} mark(s)</span>
              </div>
              {q.type === "mcq" ? (
                <div className="answer-options-grid">
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      onClick={() =>
                        !examLocked && setAnswers({ ...answers, [i]: oi })
                      }
                      className={`answer-option-card ${answers[i] === oi ? "selected-answer" : ""}`}
                      style={{
                        padding: 14,
                        border: `2px solid ${answers[i] === oi ? "#3B8DB3" : "#e0e0e0"}`,
                        borderRadius: 8,
                        cursor: examLocked ? "not-allowed" : "pointer",
                        background: answers[i] === oi ? "#E8F4FD" : "white",
                      }}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[i] || ""}
                  onChange={(e) =>
                    !examLocked &&
                    setAnswers({ ...answers, [i]: e.target.value })
                  }
                  rows={4}
                  placeholder="Type your answer..."
                  disabled={examLocked}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 8,
                    border: "2px solid #e0e0e0",
                    fontSize: 15,
                  }}
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                />
              )}
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <button
              className="submit-exam-btn"
              onClick={manualSubmit}
              disabled={examLocked}
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="exams"
          courseInfo={courseInfo}
          courseId={finalCourseId}
        />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading exams...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!courseInfo) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="exams"
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
    <div className="dashboard-container">
      <StudentSidebar
        currentPage="exams"
        courseInfo={courseInfo}
        courseId={finalCourseId}
      />
      <div
        className="main-content"
        style={{
          padding: "30px",
          userSelect: examStarted && !examLocked ? "none" : "auto",
        }}
      >
        {!examStarted && !examSubmitted && !viewResults && (
          <div>
            <div className="top-bar">
              <div>
                <h1>Exams</h1>
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
                  <span>{courseInfo.displayCode} - {courseInfo.name}</span>
                </p>
              </div>
            </div>

            {/* Premium Results Access Card */}
            <div
              className="card"
              style={{
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "1px solid #bae6fd",
                borderRadius: "12px",
                padding: "20px 24px",
                marginBottom: "30px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.05)",
                textAlign: "left"
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#0369a1", fontSize: "17px", fontWeight: "600" }}>
                  Exam Submissions & Results
                </h3>
                <p style={{ margin: "5px 0 0 0", color: "#0284c7", fontSize: "14px" }}>
                  Check your graded short answers, MCQ scores, overall marks, and teacher's feedback.
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => setViewResults(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  background: "#0284c7",
                  border: "none",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#0369a1";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#0284c7";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FiFileText size={16} />
                View My Results
              </button>
            </div>
            {exams.length === 0 ? (
              <div className="empty-state">
                <FiFileText size={48} color="#6B89A0" />
                <h3>No Exams Found</h3>
                <p>
                  No exams have been created for {courseInfo.displayCode} yet.
                </p>
              </div>
            ) : (
              <div className="lectures-grid">
                {exams.map((exam) => {
                  const done = isAlreadySubmitted(exam._id);
                  const isScheduled =
                    exam.scheduledAt && new Date() < new Date(exam.scheduledAt);
                  const isPastDeadline =
                    exam.deadline && new Date() > new Date(exam.deadline);
                  const canStartExam = !isScheduled && !done && !isPastDeadline;
                  return (
                    <div
                      key={exam._id}
                      className="lecture-card"
                      style={{
                        cursor: canStartExam ? "pointer" : "default",
                        opacity: done ? 0.7 : (isScheduled || isPastDeadline) ? 0.8 : 1,
                        border: done
                          ? "2px solid #10B981"
                          : isPastDeadline
                            ? "2px solid #EF4444"
                            : isScheduled
                              ? "2px solid #F59E0B"
                              : "1px solid var(--border-light)",
                      }}
                      onClick={() => {
                        if (isScheduled) {
                          toast(
                            `Exam starts at ${new Date(exam.scheduledAt).toLocaleString()}`,
                            { icon: "⏰" },
                          );
                        } else if (isPastDeadline) {
                          toast("Exam has ended!", { icon: "❌" });
                        } else if (canStartExam && !examActive.current) {
                          startExam(exam);
                        } else if (done) {
                          toast("Already submitted!", { icon: "✅" });
                        }
                      }}
                    >
                      <div className="lecture-card-content">
                        <h3 className="lecture-title">{exam.title}</h3>
                        <p className="lecture-course">{exam.course}</p>
                        <div className="lecture-meta">
                          <span>
                            <FiClock size={12} /> {exam.duration} min
                          </span>
                          <span>{exam.totalMarks} marks</span>
                          <span>{exam.questions.length} questions</span>
                        </div>
                        {exam.scheduledAt && (
                          <div
                            className="lecture-meta"
                            style={{ marginTop: 4 }}
                          >
                            <span
                              style={{
                                color: isScheduled ? "#F59E0B" : "#10B981",
                                fontWeight: 600,
                              }}
                            >
                              📅 Start: {new Date(exam.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {exam.deadline && (
                          <div
                            className="lecture-meta"
                            style={{ marginTop: 4 }}
                          >
                            <span style={{ color: "#6B89A0", fontSize: 12 }}>
                              📅 End: {new Date(exam.deadline).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="lecture-meta" style={{ marginTop: 8 }}>
                          {done ? (
                            <span
                              className="status-badge ontime"
                              style={{
                                background: "rgba(16,185,129,0.15)",
                                color: "#10B981",
                                fontWeight: 600,
                              }}
                            >
                              <FiCheckCircle size={12} /> Submitted
                            </span>
                          ) : isPastDeadline ? (
                            <span
                              className="status-badge urgent"
                              style={{
                                background: "rgba(239,68,68,0.1)",
                                color: "#EF4444",
                                fontWeight: 600,
                              }}
                            >
                              <FiAlertCircle size={12} /> Ended
                            </span>
                          ) : isScheduled ? (
                            <span
                              className="status-badge urgent"
                              style={{
                                background: "rgba(245,158,11,0.1)",
                                color: "#F59E0B",
                                fontWeight: 600,
                              }}
                            >
                              <FiClock size={12} /> Starts:{" "}
                              {new Date(exam.scheduledAt).toLocaleString()}
                            </span>
                          ) : (
                            <span
                              className="status-badge urgent"
                              style={{
                                background: "rgba(59,141,179,0.1)",
                                color: "#3B8DB3",
                                fontWeight: 600,
                              }}
                            >
                              Start Exam
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {aiLoading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <h2>Analyzing your answers...</h2>
            <div className="spinner"></div>
          </div>
        )}

        {examSubmitted && !aiLoading && examResult && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <h2>Exam Submitted!</h2>
            <div className="card" style={{ marginTop: 20, padding: 30 }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: "white",
                }}
              >
                <FiCheckCircle size={64} />
              </div>
              <h3>Thank you for submitting!</h3>
              <p style={{ color: "#6B89A0", marginTop: 10 }}>
                Your responses have been recorded successfully.
              </p>
              <p style={{ fontWeight: 600, color: "#3B8DB3", marginTop: 15 }}>
                Results will be published after the exam deadline and grading is complete.
              </p>
              <button
                className="btn-primary"
                onClick={resetStudentView}
                style={{ marginTop: 20 }}
              >
                Back to Exams
              </button>
            </div>
          </div>
        )}

        {viewResults && !selectedSubmission && (
          <div>
            <button
              className="btn-primary"
              onClick={() => setViewResults(false)}
              style={{ marginBottom: 20 }}
            >
              <FiArrowLeft /> Back
            </button>
            <h2 style={{ marginBottom: "24px", color: "#2C4B66" }}>My Results - {courseInfo.displayCode}</h2>
            {submissions.filter((s) => s.examId?.courseId === finalCourseId)
              .length === 0 ? (
              <div className="empty-state">
                <FiFileText size={48} color="#6B89A0" />
                <h3>No submissions found</h3>
                <p>
                  You haven't taken any exams for {courseInfo.displayCode} yet.
                </p>
              </div>
            ) : (
              submissions
                .filter((s) => s.examId?.courseId === finalCourseId)
                .map((sub) => {
                  const isExpandedAvailable = sub.isResultsPublished || sub.isMCQAutoPublished;
                  return (
                    <div
                      key={sub._id}
                      className="card"
                      style={{
                        marginBottom: 16,
                        cursor: isExpandedAvailable ? "pointer" : "default",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => {
                        if (isExpandedAvailable) {
                          setSelectedSubmission(sub);
                        }
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div>
                          <h3>
                            {sub.examId?.title}
                            {isExpandedAvailable && (
                              <button
                                className="btn-sm btn-view"
                                style={{
                                  marginLeft: 12,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  cursor: "pointer",
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  borderRadius: "6px",
                                  border: "none",
                                  verticalAlign: "middle"
                                }}
                              >
                                <FiEye size={13} />
                                <span>View</span>
                              </button>
                            )}
                          </h3>
                          <p>
                            {sub.examId?.course} | {sub.examId?.duration} min
                          </p>
                          <p style={{ fontSize: 12, color: "#6B89A0" }}>
                            {new Date(sub.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }} onClick={(e) => isExpandedAvailable && e.stopPropagation()}>
                          {(() => {
                            const exam = sub.examId;
                            const hasShort = exam?.questions?.some((q) => q.type === "short");
                            const isFullyPublished = sub.isResultsPublished;
                            const isMcqPublished = sub.isMCQAutoPublished;

                            if (isFullyPublished || isMcqPublished) {
                              const showShortPending = isMcqPublished && !isFullyPublished && hasShort;
                              return (
                                <>
                                  {sub.cheatingDetected && (
                                    <span className="status-badge late">
                                      Violation Detected
                                    </span>
                                  )}
                                  <span
                                    className="status-badge ontime"
                                    style={{ marginLeft: 8 }}
                                  >
                                    {sub.totalMarksObtained}/{exam?.totalMarks} ({sub.percentage}%)
                                  </span>
                                  {showShortPending && (
                                    <span
                                      className="status-badge urgent"
                                      style={{
                                        display: "block",
                                        marginTop: 4,
                                        background: "rgba(245,158,11,0.15)",
                                        color: "#F59E0B",
                                        fontSize: 11,
                                        fontWeight: 600,
                                      }}
                                    >
                                      Short Answer Grading Pending
                                    </span>
                                  )}
                                  {sub.aiPercentage > 0 && (
                                    <span
                                      className={`status-badge ${sub.aiPercentage >= 50 ? "late" : "ontime"}`}
                                      style={{
                                        display: "block",
                                        marginTop: 4,
                                        fontSize: 11,
                                      }}
                                    >
                                      AI: {sub.aiPercentage}%
                                    </span>
                                  )}
                                  {sub.reason && (
                                    <div
                                      style={{
                                        marginTop: 8,
                                        padding: 8,
                                        background: sub.cheatingDetected
                                          ? "#fee2e2"
                                          : "#dcfce7",
                                        borderRadius: 6,
                                        textAlign: "left",
                                      }}
                                    >
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: sub.cheatingDetected
                                            ? "#991b1b"
                                            : "#166534",
                                        }}
                                      >
                                        {sub.reason}
                                      </p>
                                    </div>
                                  )}
                                </>
                              );
                            } else {
                              return (
                                <span
                                  className="status-badge urgent"
                                  style={{
                                    background: "rgba(245,158,11,0.15)",
                                    color: "#F59E0B",
                                    fontWeight: 600,
                                  }}
                                >
                                  Result Pending
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {viewResults && selectedSubmission && (
          <div>
            <button
              className="btn-primary"
              onClick={() => setSelectedSubmission(null)}
              style={{ marginBottom: 20 }}
            >
              <FiArrowLeft /> Back to Submissions
            </button>
            
            <div className="card" style={{ marginBottom: 20, padding: 25 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 15,
                  alignItems: "flex-start",
                  borderBottom: "2px solid var(--border-light)",
                  paddingBottom: 15,
                  marginBottom: 20
                }}
              >
                <div>
                  <h2 style={{ margin: 0, color: "#2C4B66" }}>{selectedSubmission.examId?.title}</h2>
                  <p style={{ margin: "5px 0 0 0", color: "#6B89A0", fontSize: 14 }}>
                    {selectedSubmission.examId?.course} | {selectedSubmission.examId?.duration} min
                  </p>
                  <p style={{ margin: "5px 0 0 0", fontSize: 13, color: "#6B89A0" }}>
                    Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {selectedSubmission.cheatingDetected && (
                    <span
                      className="status-badge late"
                      style={{ display: "inline-block", marginRight: 8 }}
                    >
                      Violation Detected
                    </span>
                  )}
                  <span
                    className="status-badge ontime"
                    style={{ fontSize: 18, fontWeight: 700 }}
                  >
                    {selectedSubmission.totalMarksObtained}/{selectedSubmission.examId?.totalMarks} ({selectedSubmission.percentage}%)
                  </span>
                  {selectedSubmission.aiPercentage > 0 && (
                    <span
                      className={`status-badge ${selectedSubmission.aiPercentage >= 50 ? "late" : "ontime"}`}
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 12,
                      }}
                    >
                      AI Probability: {selectedSubmission.aiPercentage}%
                    </span>
                  )}
                </div>
              </div>

              {selectedSubmission.reason && (
                <div
                  style={{
                    background: selectedSubmission.cheatingDetected ? "#fee2e2" : "#dcfce7",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: selectedSubmission.cheatingDetected ? "#991b1b" : "#166534",
                    }}
                  >
                    {selectedSubmission.reason}
                  </p>
                </div>
              )}

              {selectedSubmission.feedback && (
                <div
                  style={{
                    background: "#f0f9ff",
                    padding: 15,
                    borderRadius: 8,
                    borderLeft: "4px solid #0088cc",
                    marginBottom: 20,
                  }}
                >
                  <strong style={{ fontSize: 14, color: "#2C4B66" }}>Overall Feedback:</strong>
                  <p style={{ margin: "6px 0 0 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
                    {selectedSubmission.feedback}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 25 }}>
              <h3 style={{ marginBottom: 15, color: "#2C4B66" }}>Question Breakdown</h3>
              {selectedSubmission.examId?.questions?.map((q, idx) => {
                const studentAns = selectedSubmission.answers?.find((a) => a.questionIndex === idx);
                const isMCQ = q.type === "mcq";
                const isCorrect = studentAns?.isCorrect;
                const score = studentAns?.marksObtained || 0;
                
                let studentAnsDisplay = "No answer submitted";
                if (studentAns && studentAns.answer !== undefined && studentAns.answer !== "") {
                  if (isMCQ) {
                    const optIdx = parseInt(studentAns.answer);
                    if (!isNaN(optIdx) && q.options && q.options[optIdx] !== undefined) {
                      studentAnsDisplay = `${String.fromCharCode(65 + optIdx)}. ${q.options[optIdx]}`;
                    } else {
                      studentAnsDisplay = studentAns.answer;
                    }
                  } else {
                    studentAnsDisplay = studentAns.answer;
                  }
                }

                let correctAnsDisplay = null;
                if (isMCQ && q.correctAnswer !== undefined) {
                  const cIdx = parseInt(q.correctAnswer);
                  if (!isNaN(cIdx) && q.options && q.options[cIdx] !== undefined) {
                      correctAnsDisplay = `${String.fromCharCode(65 + cIdx)}. ${q.options[cIdx]}`;
                  }
                }

                let status = "pending";
                if (isMCQ) {
                  status = isCorrect ? "correct" : "incorrect";
                } else {
                  if (selectedSubmission.isResultsPublished) {
                    if (score === q.marks) {
                      status = "correct";
                    } else if (score > 0) {
                      status = "partial";
                    } else {
                      status = "incorrect";
                    }
                  } else {
                    status = "pending";
                  }
                }

                let cardBg = "#f8fafc";
                let cardBorder = "1px solid #e2e8f0";
                let cardLeftBorder = "5px solid #94a3b8";

                if (status === "correct") {
                  cardBg = "#f0fdf4";
                  cardBorder = "1px solid #bbf7d0";
                  cardLeftBorder = "5px solid #16a34a";
                } else if (status === "incorrect") {
                  cardBg = "#fef2f2";
                  cardBorder = "1px solid #fecaca";
                  cardLeftBorder = "5px solid #dc2626";
                } else if (status === "partial") {
                  cardBg = "#fffbeb";
                  cardBorder = "1px solid #fef3c7";
                  cardLeftBorder = "5px solid #d97706";
                }

                return (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      borderLeft: cardLeftBorder,
                      borderRadius: 10,
                      padding: 20,
                      marginBottom: 16,
                      textAlign: "left",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        borderBottom: "1px dashed #e2e8f0",
                        paddingBottom: 8
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ color: "#475569", fontSize: 15 }}>
                          Question {idx + 1} ({isMCQ ? "MCQ" : "Short Answer"})
                        </strong>
                        {status === "correct" && (
                          <span style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold"
                          }}>
                            ✓ Correct
                          </span>
                        )}
                        {status === "incorrect" && (
                          <span style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold"
                          }}>
                            ✗ Incorrect
                          </span>
                        )}
                        {status === "partial" && (
                          <span style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold"
                          }}>
                            ⚠ Partial
                          </span>
                        )}
                        {status === "pending" && (
                          <span style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold"
                          }}>
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>
                        Marks: {q.marks}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 15px 0", color: "#1e293b", fontWeight: 500, fontSize: 15, lineHeight: 1.5 }}>
                      {q.question}
                    </p>

                    <div style={{ fontSize: 14, color: "#334155" }}>
                      <div style={{ marginBottom: 6 }}>
                        <strong>Your Answer: </strong>
                        <span
                          style={{
                            color: isMCQ
                              ? isCorrect
                                ? "#16a34a"
                                : "#dc2626"
                              : "#1e293b",
                            fontWeight: isMCQ ? 600 : 400
                          }}
                        >
                          {studentAnsDisplay}
                        </span>
                      </div>

                      {correctAnsDisplay && (
                        <div style={{ marginBottom: 6, color: "#16a34a" }}>
                          <strong>Correct Answer: </strong>
                          <span style={{ fontWeight: 600 }}>{correctAnsDisplay}</span>
                        </div>
                      )}

                      {!isMCQ && (
                        <div style={{ marginTop: 10 }}>
                          {selectedSubmission.isResultsPublished ? (
                            <div>
                              <span
                                style={{
                                  padding: "3px 10px",
                                  background: score > 0 ? "#dcfce7" : "#fee2e2",
                                  color: score > 0 ? "#166534" : "#991b1b",
                                  borderRadius: 5,
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                Score: {score} / {q.marks}
                              </span>
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "#d97706",
                                fontSize: 13,
                                fontWeight: 600,
                                background: "#fef3c7",
                                padding: "3px 10px",
                                borderRadius: 5,
                              }}
                            >
                              Grading Pending
                            </span>
                          )}
                        </div>
                      )}

                      {studentAns?.feedback && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 10,
                            background: "#f0f9ff",
                            borderRadius: 8,
                            borderLeft: "3px solid #0284c7",
                            fontSize: 13,
                            fontStyle: "italic",
                          }}
                        >
                          <strong>Feedback: </strong>
                          {studentAns.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


