import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEye,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiList,
  FiFileText,
  FiBookOpen,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiCheck,
  FiX,
  FiEdit,
  FiSave,
  FiArrowLeft,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherExamPage({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams();

  // IMPORTANT: URL থেকে আসা courseId ব্যবহার করুন
  const finalCourseId = propCourseId || urlCourseId;
  const finalCourseCode = propCourseCode || "";

  console.log("=== TeacherExamPage Debug ===");
  console.log("URL Course ID:", urlCourseId);
  console.log("Props Course ID:", propCourseId);
  console.log("Final Course ID:", finalCourseId);
  console.log("Final Course Code:", finalCourseCode);
  console.log("User:", user?.email);

  const [exams, setExams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewSubmissions, setViewSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [gradeMode, setGradeMode] = useState(null);
  const [gradeValue, setGradeValue] = useState("");
  const [gradeComment, setGradeComment] = useState("");
  const [submissionFeedbacks, setSubmissionFeedbacks] = useState({});

  const [formData, setFormData] = useState({
    title: "",
    department: user?.department || "Software",
    duration: 30,
    scheduledAt: "",
    deadline: "",
    publishMode: "auto",
  });
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState({
    type: "mcq",
    question: "",
    marks: 1,
    options: ["", "", "", ""],
    correctAnswer: 0,
  });
  const [courseInfo, setCourseInfo] = useState(null);

  // Use finalCourseId in useEffect
  useEffect(() => {
    if (finalCourseId) {
      console.log("Fetching exams for course:", finalCourseId);
      fetchCourseInfo();
      fetchExams();
    } else {
      console.log("No course ID found, redirecting to courses");
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

  const fetchExams = async () => {
    try {
      console.log("API Call: /exams?courseId=", finalCourseId);
      const res = await api.get(`/exams?courseId=${finalCourseId}`);
      setExams(res.data.exams);
      console.log("Exams loaded:", res.data.exams.length);
    } catch (error) {
      console.error("Fetch exams error:", error);
      toast.error("Failed to load");
    }
  };

  const validateDurationAndWindow = () => {
    if (!formData.scheduledAt || !formData.deadline) {
      return { valid: false, error: "Please set Start Time and Deadline first before managing questions" };
    }
    const start = new Date(formData.scheduledAt);
    const end = new Date(formData.deadline);
    if (end <= start) {
      return { valid: false, error: "Deadline must be after Start Time" };
    }
    const windowMinutes = Math.round((end - start) / 60000);
    const duration = Number(formData.duration) || 0;
    if (windowMinutes < duration) {
      return {
        valid: false,
        error: `Inconsistent Exam Time: The time window between Start Time and Deadline is only ${windowMinutes} minutes, but your exam duration is set to ${duration} minutes. Please adjust either the deadline or the duration.`
      };
    }
    return { valid: true };
  };

  const addQuestion = () => {
    const timeValidation = validateDurationAndWindow();
    if (!timeValidation.valid) {
      return toast.error(timeValidation.error, { duration: 8000 });
    }
    if (!currentQ.question.trim()) return toast.error("Enter question");
    if (currentQ.type === "mcq" && currentQ.options.some((o) => !o.trim()))
      return toast.error("Fill all options");
    setQuestions([...questions, { ...currentQ }]);
    setCurrentQ({
      type: "mcq",
      question: "",
      marks: 1,
      options: ["", "", "", ""],
      correctAnswer: 0,
    });
    toast.success("Question added");
  };

  const removeQuestion = (index) =>
    setQuestions(questions.filter((_, i) => i !== index));

  const handleCreate = async (e) => {
    e.preventDefault();
    let finalQuestions = [...questions];
    if (currentQ.question.trim()) {
      if (currentQ.type === "mcq" && currentQ.options.some((o) => !o.trim())) {
        return toast.error("Please finish filling the options for the current question, or clear the question text.");
      }
      finalQuestions.push({ ...currentQ });
    }

    if (!formData.title || !formData.scheduledAt || !formData.deadline || finalQuestions.length === 0)
      return toast.error("Fill all required fields (Title, Start Time, Deadline, Questions)");
    const timeValidation = validateDurationAndWindow();
    if (!timeValidation.valid) {
      return toast.error(timeValidation.error, { duration: 8000 });
    }
    setLoading(true);
    try {
      await api.post("/exams/create", {
        ...formData,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        deadline: new Date(formData.deadline).toISOString(),
        course: courseInfo?.displayCode || finalCourseCode,
        courseId: finalCourseId,
        questions: finalQuestions,
      });
      toast.success("Exam created!");
      setShowForm(false);
      setQuestions([]);
      setCurrentQ({
        type: "mcq",
        question: "",
        marks: 1,
        options: ["", "", "", ""],
        correctAnswer: 0,
      });
      setFormData({
        title: "",
        course: "",
        department: user?.department || "Software",
        duration: 30,
        scheduledAt: "",
        deadline: "",
        publishMode: "auto",
      });
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success("Deleted");
      fetchExams();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.put(`/exams/toggle/${id}`);
      toast.success(res.data.message);
      fetchExams();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const loadSubmissions = async (exam) => {
    try {
      const res = await api.get(`/exams/submissions/${exam._id}`);
      setSubmissions(res.data.submissions);
      const feedbacks = {};
      res.data.submissions.forEach((sub) => {
        feedbacks[sub._id] = sub.feedback || "";
      });
      setSubmissionFeedbacks(feedbacks);
      setSelectedExam(exam);
      setViewSubmissions(true);
    } catch (error) {
      toast.error("Failed to load");
    }
  };

  const handleGrade = async (submissionId, questionIndex) => {
    const marksObtained = Number(gradeValue);
    if (isNaN(marksObtained)) return toast.error("Enter valid marks");
    try {
      await api.put("/exams/grade", {
        submissionId,
        questionIndex,
        marksObtained,
        isCorrect: marksObtained > 0,
        feedback: gradeComment,
      });
      toast.success("Graded!");
      setGradeMode(null);
      setGradeValue("");
      setGradeComment("");
      if (selectedExam) loadSubmissions(selectedExam);
    } catch (error) {
      toast.error("Failed to grade");
    }
  };

  const handleSaveOverallFeedback = async (submissionId) => {
    const feedback = submissionFeedbacks[submissionId] || "";
    try {
      await api.put(`/exams/submission/${submissionId}/feedback`, { feedback });
      toast.success("Overall feedback saved!");
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub._id === submissionId ? { ...sub, feedback } : sub
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save feedback");
    }
  };

  const handlePublishResults = async (examId) => {
    if (!window.confirm("Are you sure you want to publish results for all students? Once published, students will be able to see their scores, correct answers, and feedback.")) return;
    setLoading(true);
    try {
      await api.put(`/exams/publish/${examId}`);
      toast.success("Results published successfully!");
      // Update local state to reflect published results
      setSelectedExam(prev => ({ ...prev, resultsPublished: true }));
      setExams(prev => prev.map(e => e._id === examId ? { ...e, resultsPublished: true } : e));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to publish results");
    } finally {
      setLoading(false);
    }
  };

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  // If no course ID, show error
  if (!finalCourseId) {
    return (
      <div className="dashboard-container">
        <TeacherSidebar
          currentPage="exams"
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
      <TeacherSidebar
        currentPage="exams"
        courseId={finalCourseId}
      />

      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>Exam Management</h1>
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
              <FiFileText size={16} style={{ color: "#3B8DB3" }} />
              <span>
                {courseInfo
                  ? `${courseInfo.displayCode} - ${courseInfo.name}`
                  : `${finalCourseCode || user?.department} Department`}
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

        {showForm && !viewSubmissions && (
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>Create New Exam</h2>
            <form onSubmit={handleCreate}>
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
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (min) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    min="1"
                    max="180"
                  />
                </div>
                 <div className="form-group">
                  <label>Schedule / Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledAt: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Deadline / End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.deadline || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-row">
              {!finalCourseId && (
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
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
                  <label>Results Publication Mode</label>
                  <select
                    value={formData.publishMode}
                    onChange={(e) =>
                      setFormData({ ...formData, publishMode: e.target.value })
                    }
                  >
                    <option value="auto">Auto-publish MCQ answers after deadline</option>
                    <option value="manual">Manual publish (Teacher grades and releases manually)</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  background: "#E8F4FD",
                  padding: 15,
                  borderRadius: 10,
                  margin: "15px 0",
                }}
              >
                <h4>
                  Total Questions: {questions.length} | Total Marks:{" "}
                  {totalMarks}
                </h4>
              </div>

              {questions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f9f9f9",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    <strong>
                      Q{i + 1} ({q.type.toUpperCase()})
                    </strong>{" "}
                    - {q.question.substring(0, 50)}... ({q.marks} marks)
                  </span>
                  <button
                    type="button"
                    className="btn-sm btn-delete"
                    onClick={() => removeQuestion(i)}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}

              <div
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 10,
                  padding: 15,
                  margin: "15px 0",
                }}
              >
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={currentQ.type}
                      onChange={(e) =>
                        setCurrentQ({ ...currentQ, type: e.target.value })
                      }
                    >
                      <option value="mcq">MCQ</option>
                      <option value="short">Short Answer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marks</label>
                    <input
                      type="number"
                      value={currentQ.marks}
                      onChange={(e) =>
                        setCurrentQ({
                          ...currentQ,
                          marks: Number(e.target.value),
                        })
                      }
                      min="1"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Question</label>
                  <textarea
                    value={currentQ.question}
                    onChange={(e) =>
                      setCurrentQ({ ...currentQ, question: e.target.value })
                    }
                    rows={2}
                    placeholder="Enter question"
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #e0e0e0",
                    }}
                  />
                </div>
                {currentQ.type === "mcq" && (
                  <div>
                    <div className="form-row">
                      {currentQ.options.map((opt, i) => (
                        <div className="form-group" key={i}>
                          <label>Option {String.fromCharCode(65 + i)}</label>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...currentQ.options];
                              opts[i] = e.target.value;
                              setCurrentQ({ ...currentQ, options: opts });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="form-group">
                      <label>Correct Answer</label>
                      <select
                        value={currentQ.correctAnswer}
                        onChange={(e) =>
                          setCurrentQ({
                            ...currentQ,
                            correctAnswer: Number(e.target.value),
                          })
                        }
                      >
                        {currentQ.options.map((_, i) => (
                          <option key={i} value={i}>
                            Option {String.fromCharCode(65 + i)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={addQuestion}
                >
                  <FiPlus size={16} /> Add Question
                </button>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn-success"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Exam"}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: "#6B89A0" }}
                  onClick={() => {
                    setShowForm(false);
                    setQuestions([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {viewSubmissions && selectedExam && (
          <div>
            <button
              className="btn-primary"
              onClick={() => {
                setViewSubmissions(false);
                setSelectedExam(null);
              }}
              style={{ marginBottom: 20 }}
            >
              <FiArrowLeft size={16} /> Back
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Submissions: {selectedExam.title}</h2>
                <p style={{ color: "#6B89A0", margin: 0, marginTop: 4 }}>
                  {selectedExam.course} | {selectedExam.totalMarks} Marks |{" "}
                  {selectedExam.questions.length} Questions
                </p>
              </div>
              <div>
                {!selectedExam.resultsPublished ? (
                  <button
                    className="btn-success"
                    onClick={() => handlePublishResults(selectedExam._id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <FiCheck size={16} /> Publish Results
                  </button>
                ) : (
                  <span
                    className="status-badge ontime"
                    style={{
                      padding: "6px 12px",
                      background: "rgba(16,185,129,0.15)",
                      color: "#10B981",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Results Released
                  </span>
                )}
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-state">
                <h3>No submissions yet</h3>
                <p>Students haven't taken this exam.</p>
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub._id}
                  className="card"
                  style={{ marginBottom: 20 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 15,
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {sub.studentId?.name || "Unknown"}
                      </h3>
                      <p style={{ color: "#6B89A0", margin: 0, fontSize: 13 }}>
                        {sub.studentId?.email}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#6B89A0",
                          margin: "4px 0 0 0",
                        }}
                      >
                        Submitted: {new Date(sub.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <span
                        className={`status-badge ${sub.cheatingDetected ? "late" : "ontime"}`}
                        style={{ display: "block", marginBottom: 6 }}
                      >
                        {sub.cheatingDetected ? "Violation" : "Clean"}
                      </span>
                      <span
                        className="status-badge ontime"
                        style={{ fontSize: 16, fontWeight: 700 }}
                      >
                        {sub.totalMarksObtained} / {selectedExam.totalMarks}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6B89A0",
                          display: "block",
                        }}
                      >
                        ({sub.percentage}%)
                      </span>
                      {sub.aiPercentage !== undefined &&
                        sub.aiPercentage !== null && (
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
                    </div>
                  </div>

                  {sub.reason && (
                    <div
                      style={{
                        background: sub.cheatingDetected
                          ? "#fee2e2"
                          : "#dcfce7",
                        padding: 8,
                        borderRadius: 6,
                        marginBottom: 12,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: sub.cheatingDetected ? "#991b1b" : "#166534",
                        }}
                      >
                        {sub.reason}
                      </p>
                    </div>
                  )}

                  <h4 style={{ marginBottom: 10, color: "#2C4B66" }}>
                    Answers:
                  </h4>
                  {sub.answers.map((ans, i) => {
                    const question = selectedExam.questions[ans.questionIndex];
                    if (!question) return null;
                    const isMCQ = question.type === "mcq";
                    const marksObtained = ans.marksObtained || 0;
                    const maxMarks = question.marks;

                    return (
                      <div key={i} className="grading-question-card">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p className="grading-question-header">
                              Q{ans.questionIndex + 1}. {question.question}
                            </p>
                            <p className="grading-question-type">
                              Type: {question.type.toUpperCase()} | Max Marks: {maxMarks}
                            </p>
                            <div className="grading-student-answer-box">
                              <strong>Student Answer:</strong>
                              {isMCQ ? (
                                <p>
                                  {ans.answer !== undefined && ans.answer !== ""
                                    ? `${String.fromCharCode(65 + Number(ans.answer))}. ${question.options?.[ans.answer] || "Unknown"}`
                                    : "Not Answered"}
                                </p>
                              ) : (
                                <p>
                                  {ans.answer || "Not Answered"}
                                </p>
                              )}
                            </div>
                            {isMCQ && (
                              <div className="grading-correct-answer-box">
                                <strong>Correct Answer:</strong>
                                <span>
                                  {String.fromCharCode(
                                    65 + question.correctAnswer,
                                  )}
                                  . {question.options?.[question.correctAnswer]}
                                </span>
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: "center", minWidth: 100 }}>
                            {isMCQ ? (
                              <div>
                                <span
                                  className={`status-badge ${ans.isCorrect ? "ontime" : "late"}`}
                                >
                                  {ans.isCorrect ? (
                                    <>
                                      <FiCheck size={14} /> Correct
                                    </>
                                  ) : (
                                    <>
                                      <FiX size={14} /> Incorrect
                                    </>
                                  )}
                                </span>
                                <p
                                  style={{
                                    margin: "4px 0 0 0",
                                    fontSize: 13,
                                    fontWeight: 600,
                                  }}
                                >
                                  {marksObtained} / {maxMarks} marks
                                </p>
                              </div>
                            ) : (
                              <div>
                                {gradeMode &&
                                gradeMode.submissionId === sub._id &&
                                gradeMode.questionIndex ===
                                  ans.questionIndex ? (
                                  <div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", marginBottom: 6 }}>
                                      <span style={{ fontSize: 11, color: "#6B89A0", fontWeight: 600 }}>Marks</span>
                                      <input
                                        type="number"
                                        step="any"
                                        value={gradeValue}
                                        onChange={(e) =>
                                          setGradeValue(e.target.value)
                                        }
                                        min="0"
                                        max={maxMarks}
                                        placeholder={`0-${maxMarks}`}
                                        style={{
                                          width: 80,
                                          padding: 6,
                                          borderRadius: 6,
                                          border: "2px solid var(--border-light)",
                                          textAlign: "center",
                                          fontWeight: "bold",
                                          fontSize: 14,
                                          background: "var(--pastel-blue-light)",
                                        }}
                                      />
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 4,
                                        justifyContent: "center",
                                      }}
                                    >
                                      <button
                                        className="btn-sm btn-view"
                                        onClick={() =>
                                          handleGrade(
                                            sub._id,
                                            ans.questionIndex,
                                          )
                                        }
                                      >
                                        <FiSave size={14} /> Save
                                      </button>
                                      <button
                                        className="btn-sm btn-delete"
                                        onClick={() => setGradeMode(null)}
                                      >
                                        <FiX size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span
                                      className={`status-badge ${marksObtained > 0 ? "ontime" : "late"}`}
                                    >
                                      {marksObtained > 0 ? (
                                        <FiCheck size={14} />
                                      ) : (
                                        <FiX size={14} />
                                      )}{" "}
                                      {marksObtained}/{maxMarks}
                                    </span>
                                    <button
                                      className="btn-sm btn-view"
                                      style={{
                                        marginTop: 6,
                                        display: "block",
                                        width: "100%",
                                      }}
                                      onClick={() => {
                                        setGradeMode({
                                          submissionId: sub._id,
                                          questionIndex: ans.questionIndex,
                                        });
                                        setGradeValue(marksObtained || "");
                                        setGradeComment("");
                                      }}
                                    >
                                      <FiEdit size={14} /> Grade
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 15,
                      borderTop: "2px solid #e0e0e0",
                    }}
                  >
                    <h4 style={{ marginBottom: 8, color: "#2C4B66" }}>
                      Overall Exam Feedback
                    </h4>
                    <div className="feedback-input-group">
                      <textarea
                        value={submissionFeedbacks[sub._id] || ""}
                        onChange={(e) =>
                          setSubmissionFeedbacks({
                            ...submissionFeedbacks,
                            [sub._id]: e.target.value,
                          })
                        }
                        placeholder="Enter overall feedback/comments for this student..."
                        rows={2}
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 8,
                          border: "1px solid #e0e0e0",
                          fontFamily: "inherit",
                          fontSize: 14,
                        }}
                      />
                      <button
                        className="btn-primary"
                        style={{ height: "fit-content", padding: "10px 20px" }}
                        onClick={() => handleSaveOverallFeedback(sub._id)}
                      >
                        Save Feedback
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!showForm && !viewSubmissions && (
          <div>
            <h2>All Exams ({exams.length})</h2>
            {exams.length === 0 ? (
              <div className="empty-state">
                <h3>No exams</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Course</th>
                      <th>Duration</th>
                      <th>Schedule</th>
                      <th>Marks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((e) => (
                      <tr key={e._id}>
                        <td className="title-cell">{e.title}</td>
                        <td>{e.course}</td>
                        <td>{e.duration} min</td>
                        <td style={{ fontSize: "12px", lineHeight: "1.4", padding: "8px 12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "#10b981", fontWeight: "bold" }}>Start:</span>
                              <span style={{ color: "#475569" }}>{e.scheduledAt ? new Date(e.scheduledAt).toLocaleString() : "N/A"}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ color: "#ef4444", fontWeight: "bold" }}>End:</span>
                              <span style={{ color: "#475569" }}>{e.deadline ? new Date(e.deadline).toLocaleString() : "N/A"}</span>
                            </div>
                          </div>
                        </td>
                        <td>{e.totalMarks}</td>
                        <td>
                          <span
                            className={`status-badge ${e.isActive ? "ontime" : "late"}`}
                          >
                            {e.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn-sm btn-view"
                            onClick={() => loadSubmissions(e)}
                          >
                            <FiEye size={14} /> Submissions
                          </button>
                          <button
                            className="btn-toggle"
                            onClick={() => handleToggle(e._id)}
                          >
                            {e.isActive ? (
                              <FiToggleRight size={24} color="#10B981" />
                            ) : (
                              <FiToggleLeft size={24} color="#EF4444" />
                            )}
                          </button>
                          <button
                            className="btn-delete-icon"
                            onClick={() => handleDelete(e._id)}
                          >
                            <FiTrash2 size={20} />
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
  );
}
