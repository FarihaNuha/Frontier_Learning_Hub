import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiUser,
  FiCalendar,
  FiFileText,
  FiActivity,
  FiTrendingUp,
  FiAward,
  FiUsers,
  FiInfo
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";
import TeacherSidebar from "../components/TeacherSidebar";

export default function CourseAnalyticsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  if (!user) return null;
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]); // List of students (for teacher view)
  const [selectedStudent, setSelectedStudent] = useState(null); // Active student details (id, name, etc.)
  const [analytics, setAnalytics] = useState(null); // Loaded analytics details (summary, history)
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data.course);

      if (user.role === "teacher") {
        fetchRoster();
      } else {
        // Load student's own analytics directly
        fetchStudentDetails(user.id || user._id);
      }
    } catch (error) {
      toast.error("Error loading course details");
      navigate("/courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await api.get(`/courses/${id}/analytics/students`);
      setStudents(res.data.students || []);
    } catch (error) {
      toast.error("Error loading student roster analytics");
    }
  };

  const fetchStudentDetails = async (studentId) => {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/courses/${id}/analytics/student/${studentId}`);
      setSelectedStudent(res.data.student);
      setAnalytics({
        summary: res.data.summary,
        history: res.data.history
      });
    } catch (error) {
      toast.error("Error loading student performance metrics");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Helper to draw a Radar/Polygon chart in pure React SVG
  const renderRadarChart = (summary) => {
    if (!summary) return null;

    const size = 300;
    const center = size / 2;
    const radius = 100;
    const levels = 4;

    // 4 Axes: Attendance, Assignments, Exams, Manual Assessment
    const labels = ["Attendance", "Assignments", "Exams", "Assessments"];
    const values = [
      summary.attendancePercent || 0,
      summary.assignmentAverage || 0,
      summary.examAverage || 0,
      summary.assessment?.totalMarks ? (summary.assessment.totalMarks / 100) * 100 : 0
    ];

    // Compute vertices coordinates for level backgrounds (webs)
    const getCoordinates = (index, valuePercent) => {
      const angle = (Math.PI / 2) * index - Math.PI / 2; // Spaced by 90 deg
      const dist = (valuePercent / 100) * radius;
      return {
        x: center + dist * Math.cos(angle),
        y: center + dist * Math.sin(angle)
      };
    };

    // Draw the polygons for web levels (25%, 50%, 75%, 100%)
    const levelPolygons = [];
    for (let l = 1; l <= levels; l++) {
      const levelPercent = (l / levels) * 100;
      const points = [];
      for (let i = 0; i < 4; i++) {
        const coord = getCoordinates(i, levelPercent);
        points.push(`${coord.x},${coord.y}`);
      }
      levelPolygons.push(
        <polygon
          key={`level-${l}`}
          points={points.join(" ")}
          fill="none"
          stroke="rgba(56, 189, 248, 0.15)"
          strokeWidth="1"
        />
      );
    }

    // Draw axes lines and text labels
    const axesLines = [];
    const textLabels = [];
    for (let i = 0; i < 4; i++) {
      const edge = getCoordinates(i, 100);
      axesLines.push(
        <line
          key={`axis-${i}`}
          x1={center}
          y1={center}
          x2={edge.x}
          y2={edge.y}
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1.5"
        />
      );

      // Adjust label alignment
      const labelDist = radius + 22;
      const angle = (Math.PI / 2) * i - Math.PI / 2;
      const lx = center + labelDist * Math.cos(angle);
      const ly = center + labelDist * Math.sin(angle) + 4;
      let textAnchor = "middle";
      if (Math.cos(angle) > 0.1) textAnchor = "start";
      else if (Math.cos(angle) < -0.1) textAnchor = "end";

      textLabels.push(
        <text
          key={`label-${i}`}
          x={lx}
          y={ly}
          fill="var(--text-gray)"
          fontSize="11"
          fontWeight="600"
          textAnchor={textAnchor}
        >
          {labels[i]} ({Math.round(values[i])}%)
        </text>
      );
    }

    // Draw the active data polygon
    const dataPoints = [];
    for (let i = 0; i < 4; i++) {
      const coord = getCoordinates(i, values[i]);
      dataPoints.push(`${coord.x},${coord.y}`);
    }

    return (
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="analytics-radar-svg">
        <defs>
          <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 210, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(0, 114, 255, 0.05)" />
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Level background webs */}
        {levelPolygons}

        {/* Axes lines */}
        {axesLines}

        {/* Shaded data polygon */}
        <polygon
          points={dataPoints.join(" ")}
          fill="url(#radarGrad)"
          stroke="#00d2ff"
          strokeWidth="2.5"
          filter="url(#radarGlow)"
        />

        {/* Data points dots */}
        {values.map((v, i) => {
          const coord = getCoordinates(i, v);
          return (
            <circle
              key={`dot-${i}`}
              cx={coord.x}
              cy={coord.y}
              r="4.5"
              fill="#ffffff"
              stroke="#0072ff"
              strokeWidth="2"
            />
          );
        })}

        {/* Axis labels */}
        {textLabels}
      </svg>
    );
  };

  // Helper to draw a Line/Trend chart showing scores over time
  // Helper to draw a Gantt timeline chart for assignments and exams
  const renderGanttChart = (history) => {
    if (!history) return null;

    const tasks = [];

    // Process Assignments
    (history.assignments || []).forEach((a, index) => {
      const start = a.createdAt ? new Date(a.createdAt) : new Date(new Date(a.deadline).getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date(a.deadline);
      const durationDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));

      // Colorful gradient list
      const colors = [
        "linear-gradient(90deg, #3b82f6, #60a5fa)", // Blue
        "linear-gradient(90deg, #10b981, #34d399)", // Green
        "linear-gradient(90deg, #f59e0b, #fbbf24)", // Amber
        "linear-gradient(90deg, #ef4444, #f87171)", // Red
        "linear-gradient(90deg, #8b5cf6, #a78bfa)", // Purple
        "linear-gradient(90deg, #ec4899, #f472b6)", // Pink
        "linear-gradient(90deg, #0ea5e9, #38bdf8)", // Light Blue
        "linear-gradient(90deg, #f97316, #fb923c)"  // Orange
      ];
      const color = colors[index % colors.length];

      tasks.push({
        id: `A${String(index + 1).padStart(2, "0")}`,
        title: a.title,
        type: "Assignment",
        start,
        end,
        duration: durationDays,
        color
      });
    });

    // Process Exams
    (history.exams || []).forEach((e, index) => {
      const start = e.scheduledAt ? new Date(e.scheduledAt) : new Date();
      const end = new Date(start.getTime() + (e.duration || 60) * 60 * 1000);
      const durationDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));

      const colors = [
        "linear-gradient(90deg, #8b5cf6, #a78bfa)", // Purple
        "linear-gradient(90deg, #ec4899, #f472b6)", // Pink
        "linear-gradient(90deg, #f97316, #fb923c)"  // Orange
      ];
      const color = colors[index % colors.length];

      tasks.push({
        id: `E${String(index + 1).padStart(2, "0")}`,
        title: e.title,
        type: "Exam",
        start,
        end,
        duration: durationDays,
        color
      });
    });

    if (tasks.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-gray)" }}>
          <FiInfo size={24} style={{ marginBottom: 8 }} />
          <p>No assignments or exams found to show Gantt chart.</p>
        </div>
      );
    }

    tasks.sort((a, b) => a.start - b.start);

    // Date range calculation
    let minTime = Math.min(...tasks.map((t) => t.start.getTime()));
    let maxTime = Math.max(...tasks.map((t) => t.end.getTime()));

    const getStartOfDay = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const minDateObj = getStartOfDay(new Date(minTime));
    const maxDateObj = getStartOfDay(new Date(maxTime));

    const dayList = [];
    let currentDay = new Date(minDateObj);
    while (currentDay <= maxDateObj) {
      dayList.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    if (dayList.length < 10) {
      while (dayList.length < 10) {
        const last = new Date(dayList[dayList.length - 1]);
        last.setDate(last.getDate() + 1);
        dayList.push(last);
      }
    }

    return (
      <div className="gantt-chart-wrapper" style={{ width: "100%", overflowX: "auto", margin: "10px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-dark)", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "2px solid rgba(255, 255, 255, 0.1)" }}>
              <th style={{ padding: "10px 6px", textAlign: "left", width: 70, color: "var(--text-gray)" }}>Task ID</th>
              <th style={{ padding: "10px 6px", textAlign: "left", width: 220, color: "var(--text-gray)" }}>Task Name</th>
              <th style={{ padding: "10px 6px", textAlign: "left", width: 100, color: "var(--text-gray)" }}>Start Date</th>
              <th style={{ padding: "10px 6px", textAlign: "left", width: 100, color: "var(--text-gray)" }}>End Date</th>
              <th style={{ padding: "10px 6px", textAlign: "center", width: 90, color: "var(--text-gray)" }}>Duration (Days)</th>
              {dayList.map((day, idx) => (
                <th key={`day-hdr-${idx}`} style={{ padding: "6px 2px", minWidth: 55, textAlign: "center", borderLeft: "1px solid rgba(255, 255, 255, 0.05)", fontSize: 10, color: "var(--text-gray)", whiteSpace: "nowrap" }}>
                  {`${day.getMonth() + 1}/${day.getDate()}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const taskStart = getStartOfDay(task.start);
              const taskEnd = getStartOfDay(task.end);

              return (
                <tr key={task.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", height: 40 }}>
                  <td style={{ padding: "6px", fontWeight: "700", color: "var(--pastel-blue-primary)" }}>{task.id}</td>
                  <td style={{ padding: "6px", fontWeight: "600" }} title={task.title}>
                    {task.title.length > 30 ? `${task.title.substring(0, 28)}...` : task.title}
                  </td>
                  <td style={{ padding: "6px", fontSize: 11 }}>{`${task.start.getMonth() + 1}/${task.start.getDate()}/${task.start.getFullYear()}`}</td>
                  <td style={{ padding: "6px", fontSize: 11 }}>{`${task.end.getMonth() + 1}/${task.end.getDate()}/${task.end.getFullYear()}`}</td>
                  <td style={{ padding: "6px", textAlign: "center", fontWeight: "600" }}>{task.duration}</td>
                  {dayList.map((day, dIdx) => {
                    const isWithinSpan = day >= taskStart && day <= taskEnd;
                    return (
                      <td 
                        key={`cell-${task.id}-${dIdx}`} 
                        style={{ 
                          padding: 0, 
                          borderLeft: "1px solid rgba(255, 255, 255, 0.05)", 
                          position: "relative",
                          background: isWithinSpan ? "rgba(255, 255, 255, 0.02)" : "transparent"
                        }}
                      >
                        {isWithinSpan && (
                          <div 
                            style={{ 
                              position: "absolute",
                              left: 2,
                              right: 2,
                              top: "20%",
                              bottom: "20%",
                              background: task.color,
                              borderRadius: 3,
                              boxShadow: "0 0 6px rgba(0, 210, 255, 0.15)",
                              zIndex: 2
                            }}
                            title={`${task.title} (${task.duration} days)`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="analytics" courseInfo={course} courseId={id} />
      ) : (
        <StudentSidebar currentPage="analytics" courseInfo={course} courseId={id} />
      )}

      <div className="main-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-dark)" }}>
              Performance Analytics
            </h1>
            <p style={{ color: "var(--text-gray)" }}>
              Real-time activity measures & performance trends
            </p>
          </div>
        </div>

        {user.role === "teacher" && (
          <div className="card" style={{ marginBottom: 24, overflow: "visible" }}>
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--pastel-blue-primary)" }}>
              <FiUsers /> Class Roster Performance Overview
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Attendance %</th>
                    <th>Assignment Avg</th>
                    <th>Exam Avg</th>
                    <th>Activity Score</th>
                    <th>Inspect Details</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stud) => (
                    <tr
                      key={stud.id}
                      style={{
                        background: selectedStudent?.id === stud.id ? "rgba(56, 189, 248, 0.08)" : "transparent",
                        cursor: "pointer"
                      }}
                      onClick={() => fetchStudentDetails(stud.id)}
                    >
                      <td style={{ fontWeight: 600 }}>{stud.studentIdNumber}</td>
                      <td>{stud.name}</td>
                      <td>{stud.stats.attendancePercent}%</td>
                      <td>{stud.stats.assignmentPercent}%</td>
                      <td>{stud.stats.examPercent}%</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 12,
                            fontWeight: 700,
                            fontSize: 12,
                            background: stud.stats.activityScore >= 80 ? "rgba(16, 185, 129, 0.15)" : stud.stats.activityScore >= 60 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: stud.stats.activityScore >= 80 ? "#10b981" : stud.stats.activityScore >= 60 ? "#f59e0b" : "#ef4444"
                          }}
                        >
                          {stud.stats.activityScore}%
                        </span>
                      </td>
                      <td>
                        <button
                          className="classroom-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchStudentDetails(stud.id);
                          }}
                        >
                          Inspect Graph
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loadingDetails ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0" }}>
            <div className="spinner"></div>
            <p style={{ marginTop: 16, color: "var(--text-gray)" }}>Loading student activity graphs...</p>
          </div>
        ) : selectedStudent && analytics ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Summary metrics header row */}
            <div className="lectures-grid">
              {/* Activity Gauge */}
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <svg width="80" height="80" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={analytics.summary.gradeColor}
                      strokeWidth="3.5"
                      strokeDasharray={`${analytics.summary.activityScore}, 100`}
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: 16,
                      fontWeight: 700
                    }}
                  >
                    {analytics.summary.activityScore}%
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, color: "var(--text-gray)" }}>Overall Performance</h4>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-dark)", marginTop: 4 }}>
                    {analytics.summary.gradeLabel}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 2 }}>
                    Based on weighted metrics
                  </p>
                </div>
              </div>

              {/* Attendance KPI */}
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    padding: 12,
                    borderRadius: 12
                  }}
                >
                  <FiCalendar size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: 13, color: "var(--text-gray)" }}>Attendance Ratio</h4>
                  <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-dark)", marginTop: 4 }}>
                    {analytics.summary.attendancePercent}%
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 2 }}>
                    Present: {analytics.summary.presentCount} / {analytics.summary.totalAttendanceCount} classes
                  </p>
                </div>
              </div>

              {/* Assignments KPI */}
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#3b82f6",
                    padding: 12,
                    borderRadius: 12
                  }}
                >
                  <FiFileText size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: 13, color: "var(--text-gray)" }}>Assignments Average</h4>
                  <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-dark)", marginTop: 4 }}>
                    {analytics.summary.assignmentAverage}%
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 2 }}>
                    Submitted: {analytics.summary.completedAssignments} / {analytics.summary.totalAssignments} tasks
                  </p>
                </div>
              </div>
            </div>

            {/* Student metadata info banner */}
            <div
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(56, 189, 248, 0.06)",
                border: "1px solid rgba(56, 189, 248, 0.2)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--pastel-blue-deep)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 700
                  }}
                >
                  {selectedStudent.profilePicture ? (
                    <img
                      src={selectedStudent.profilePicture}
                      alt={selectedStudent.name}
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    selectedStudent.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                    Selected Profile: {selectedStudent.name}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-gray)", marginTop: 2 }}>
                    ID: {selectedStudent.studentIdNumber} | Dept: {selectedStudent.department} | Email: {selectedStudent.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Radar Analysis */}
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ alignSelf: "flex-start", marginBottom: 16, color: "var(--pastel-blue-primary)", fontSize: 16, fontWeight: 600 }}>
                <FiActivity style={{ marginRight: 8 }} /> Activity Radar Polygon
              </h3>
              {renderRadarChart(analytics.summary)}
              <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 12, textAlign: "center" }}>
                A larger filled area represents uniform excellence across attendance, exams, assessments, and assignments.
              </p>
            </div>

            {/* Activity Gantt Timeline */}
            <div className="card" style={{ overflowX: "auto", marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, color: "var(--pastel-blue-primary)", fontSize: 16, fontWeight: 600 }}>
                <FiTrendingUp style={{ marginRight: 8 }} /> Activity Gantt Timeline
              </h3>
              {renderGanttChart(analytics.history)}
              <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 12, textAlign: "center" }}>
                Gantt chart representing assignment & exam intervals, submission times, and overdue tasks.
              </p>
            </div>

            {/* Detailed records breakdown */}
            <div className="card">
              <h3 style={{ marginBottom: 16, color: "var(--pastel-blue-primary)", fontSize: 16, fontWeight: 600 }}>
                <FiAward style={{ marginRight: 8 }} /> Activities & Feedback History
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {analytics.history.assignments.map((item, idx) => (
                  <div
                    key={`assign-item-${idx}`}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-light)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600 }}>[Assignment] {item.title}</h4>
                      <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 4 }}>
                        Submitted: {item.submitted ? new Date(item.submittedAt).toLocaleDateString() : "No submission"}
                      </p>
                      {item.feedback && (
                        <p style={{ fontSize: 12, color: "var(--pastel-blue-deep)", marginTop: 6, fontStyle: "italic" }}>
                          Feedback: "{item.feedback}"
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: item.marksObtained !== null ? "var(--pastel-blue-primary)" : "var(--text-gray)"
                        }}
                      >
                        {item.marksObtained !== null ? `${item.marksObtained}/${item.totalMarks}` : "Ungraded"}
                      </span>
                      {item.marksObtained !== null && (
                        <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 2 }}>
                          ({Math.round(item.percentage)}%)
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {analytics.history.exams.map((item, idx) => (
                  <div
                    key={`exam-item-${idx}`}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-light)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600 }}>[Exam] {item.title}</h4>
                      <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 4 }}>
                        Date: {new Date(item.scheduledAt).toLocaleDateString()}
                      </p>
                      {item.feedback && (
                        <p style={{ fontSize: 12, color: "var(--pastel-blue-deep)", marginTop: 6, fontStyle: "italic" }}>
                          Feedback: "{item.feedback}"
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: item.marksObtained !== null ? "var(--pastel-blue-primary)" : "var(--text-gray)"
                        }}
                      >
                        {item.marksObtained !== null ? `${item.marksObtained}/${item.totalMarks}` : "N/A"}
                      </span>
                      {item.marksObtained !== null && (
                        <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 2 }}>
                          ({Math.round(item.percentage)}%)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "40px 0", color: "var(--text-gray)" }}>
            <FiInfo size={32} style={{ marginBottom: 12 }} />
            <h3>No Profile Selected</h3>
            <p>Please click "Inspect Graph" on a student to load their activity metrics.</p>
          </div>
        )}
      </div>
    </div>
  );
}
