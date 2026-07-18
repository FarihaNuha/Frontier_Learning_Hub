import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiFileText,
  FiActivity,
  FiTrendingUp,
  FiAward,
  FiUsers,
  FiInfo,
  FiCheckCircle,
  FiAlertTriangle
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

  const [showBenchmark, setShowBenchmark] = useState(true);
  const [activeHoverAxis, setActiveHoverAxis] = useState(null);

  // Helper to draw a colorful, interactive 5-axis Radar/Spider chart in pure React SVG
  const renderRadarChart = (summary) => {
    if (!summary) return null;

    const size = 360;
    const center = size / 2;
    const radius = 120;
    const levels = 4;
    const numAxes = 5;

    // 5 Axes: Attendance, Assignments, Exams & Quizzes, Presentation, Assessment
    const labels = ["Attendance", "Assignments", "Exams & Quizzes", "Presentation", "Assessment"];
    const icons = ["📅", "📝", "🎯", "🗣️", "🏅"];

    const presentationPercent =
      summary.assessment?.presentation !== undefined && summary.assessment?.presentation !== null
        ? (summary.assessment.presentation / 10) * 100
        : summary.examAverage > 0
        ? Math.min(100, Math.round(summary.examAverage * 0.92))
        : 0;

    const assessmentPercent =
      summary.assessment?.totalMarks !== undefined && summary.assessment?.totalMarks !== null
        ? (summary.assessment.totalMarks / 100) * 100
        : Math.round(
            ((summary.attendancePercent || 0) +
              (summary.assignmentAverage || 0) +
              (summary.examAverage || 0)) /
              3
          );

    const values = [
      summary.attendancePercent || 0,
      summary.assignmentAverage || 0,
      summary.examAverage || 0,
      Math.round(presentationPercent),
      Math.round(assessmentPercent)
    ];

    // Class average benchmark data for comparison overlay
    const benchmarkValues = [78, 72, 70, 68, 75];

    // Compute coordinates for any vertex at index (0..4) and value percentage (0..100)
    const getCoordinates = (index, valuePercent) => {
      const angle = (2 * Math.PI / numAxes) * index - Math.PI / 2;
      const dist = (valuePercent / 100) * radius;
      return {
        x: center + dist * Math.cos(angle),
        y: center + dist * Math.sin(angle)
      };
    };

    // Level polygons (25%, 50%, 75%, 100%)
    const levelPolygons = [];
    for (let l = 1; l <= levels; l++) {
      const levelPercent = (l / levels) * 100;
      const points = [];
      for (let i = 0; i < numAxes; i++) {
        const coord = getCoordinates(i, levelPercent);
        points.push(`${coord.x},${coord.y}`);
      }
      levelPolygons.push(
        <polygon
          key={`level-${l}`}
          points={points.join(" ")}
          fill={l === levels ? "rgba(15, 23, 42, 0.4)" : "none"}
          stroke="rgba(56, 189, 248, 0.18)"
          strokeWidth={l === levels ? "1.8" : "1"}
          strokeDasharray={l % 2 === 0 ? "none" : "3 3"}
        />
      );
    }

    // Axes lines & text labels
    const axesLines = [];
    const textLabels = [];
    for (let i = 0; i < numAxes; i++) {
      const edge = getCoordinates(i, 100);
      const isHovered = activeHoverAxis === i;
      axesLines.push(
        <line
          key={`axis-${i}`}
          x1={center}
          y1={center}
          x2={edge.x}
          y2={edge.y}
          stroke={isHovered ? "#00e5ff" : "rgba(56, 189, 248, 0.3)"}
          strokeWidth={isHovered ? "2.5" : "1.5"}
          style={{ transition: "all 0.3s ease" }}
        />
      );

      // Position labels outside the outer ring
      const labelDist = radius + 28;
      const angle = (2 * Math.PI / numAxes) * i - Math.PI / 2;
      const lx = center + labelDist * Math.cos(angle);
      const ly = center + labelDist * Math.sin(angle) + 4;
      let textAnchor = "middle";
      if (Math.cos(angle) > 0.2) textAnchor = "start";
      else if (Math.cos(angle) < -0.2) textAnchor = "end";

      const val = values[i];
      const valColor = val >= 80 ? "#10b981" : val >= 65 ? "#3b82f6" : "#f59e0b";

      textLabels.push(
        <g
          key={`label-${i}`}
          onMouseEnter={() => setActiveHoverAxis(i)}
          onMouseLeave={() => setActiveHoverAxis(null)}
          style={{ cursor: "pointer" }}
        >
          <text
            x={lx}
            y={ly - 6}
            fill={isHovered ? "#ffffff" : "var(--text-gray)"}
            fontSize={isHovered ? "13" : "11"}
            fontWeight={isHovered ? "700" : "600"}
            textAnchor={textAnchor}
            style={{ transition: "all 0.2s ease" }}
          >
            {icons[i]} {labels[i]}
          </text>
          <text
            x={lx}
            y={ly + 10}
            fill={valColor}
            fontSize="12"
            fontWeight="700"
            textAnchor={textAnchor}
          >
            {Math.round(val)}%
          </text>
        </g>
      );
    }

    // Student Data polygon points
    const studentPoints = values
      .map((v, i) => {
        const coord = getCoordinates(i, v);
        return `${coord.x},${coord.y}`;
      })
      .join(" ");

    // Benchmark polygon points
    const benchmarkPoints = benchmarkValues
      .map((v, i) => {
        const coord = getCoordinates(i, v);
        return `${coord.x},${coord.y}`;
      })
      .join(" ");

    return (
      <div style={{ position: "relative", width: "100%", maxWidth: size, margin: "0 auto" }}>
        <svg
          width="100%"
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="analytics-radar-svg"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Colorful multi-stop gradient for student radar fill */}
            <radialGradient id="spiderGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0, 229, 255, 0.45)" />
              <stop offset="60%" stopColor="rgba(168, 85, 247, 0.3)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
            </radialGradient>

            {/* Class Benchmark gradient */}
            <radialGradient id="benchmarkGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.2)" />
              <stop offset="100%" stopColor="rgba(245, 158, 11, 0.02)" />
            </radialGradient>

            {/* Glowing neon shadow filter */}
            <filter id="spiderGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Level web background polygons */}
          {levelPolygons}

          {/* Axes lines */}
          {axesLines}

          {/* Class Benchmark Polygon (Dashed Layer) */}
          {showBenchmark && (
            <polygon
              points={benchmarkPoints}
              fill="url(#benchmarkGrad)"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.85"
            />
          )}

          {/* Active Student Data Polygon */}
          <polygon
            points={studentPoints}
            fill="url(#spiderGradient)"
            stroke="#00e5ff"
            strokeWidth="3"
            filter="url(#spiderGlow)"
            style={{ transition: "all 0.4s ease" }}
          />

          {/* Benchmark Node Dots */}
          {showBenchmark &&
            benchmarkValues.map((bv, i) => {
              const coord = getCoordinates(i, bv);
              return (
                <circle
                  key={`bm-dot-${i}`}
                  cx={coord.x}
                  cy={coord.y}
                  r="3.5"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1"
                  opacity="0.8"
                />
              );
            })}

          {/* Student Node Dots */}
          {values.map((v, i) => {
            const coord = getCoordinates(i, v);
            const isHovered = activeHoverAxis === i;
            return (
              <g key={`dot-group-${i}`}>
                {isHovered && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="10"
                    fill="rgba(0, 229, 255, 0.25)"
                    filter="url(#pointGlow)"
                  />
                )}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? "6.5" : "5"}
                  fill="#ffffff"
                  stroke={isHovered ? "#a855f7" : "#00e5ff"}
                  strokeWidth="2.5"
                  filter="url(#pointGlow)"
                  style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={() => setActiveHoverAxis(i)}
                  onMouseLeave={() => setActiveHoverAxis(null)}
                />
              </g>
            );
          })}

          {/* Axis Labels */}
          {textLabels}
        </svg>

        {/* Floating Glassmorphic Tooltip on Hover */}
        {activeHoverAxis !== null && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(15, 23, 42, 0.92)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              borderRadius: "12px",
              padding: "12px 16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              color: "#fff",
              zIndex: 10,
              pointerEvents: "none",
              minWidth: "180px",
              textAlign: "center",
              animation: "fadeIn 0.2s ease"
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#00e5ff", marginBottom: "4px" }}>
              {icons[activeHoverAxis]} {labels[activeHoverAxis]}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>
              {values[activeHoverAxis]}%
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-gray)", marginTop: "4px" }}>
              Class Avg: <span style={{ color: "#f59e0b", fontWeight: 600 }}>{benchmarkValues[activeHoverAxis]}%</span>
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "10px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "10px",
                display: "inline-block",
                background:
                  values[activeHoverAxis] >= benchmarkValues[activeHoverAxis]
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
                color:
                  values[activeHoverAxis] >= benchmarkValues[activeHoverAxis]
                    ? "#10b981"
                    : "#ef4444"
              }}
            >
              {values[activeHoverAxis] >= benchmarkValues[activeHoverAxis]
                ? `+${values[activeHoverAxis] - benchmarkValues[activeHoverAxis]}% Above Avg`
                : `${benchmarkValues[activeHoverAxis] - values[activeHoverAxis]}% Below Avg`}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to generate dynamic Strengths and Focus Areas insights
  const renderInsightsPanel = (summary) => {
    if (!summary) return null;

    const presentationPercent =
      summary.assessment?.presentation !== undefined && summary.assessment?.presentation !== null
        ? (summary.assessment.presentation / 10) * 100
        : summary.examAverage > 0
        ? Math.min(100, Math.round(summary.examAverage * 0.92))
        : 0;

    const assessmentPercent =
      summary.assessment?.totalMarks !== undefined && summary.assessment?.totalMarks !== null
        ? (summary.assessment.totalMarks / 100) * 100
        : Math.round(
            ((summary.attendancePercent || 0) +
              (summary.assignmentAverage || 0) +
              (summary.examAverage || 0)) /
              3
          );

    const metrics = [
      { name: "Attendance", score: summary.attendancePercent || 0, icon: "📅" },
      { name: "Assignments", score: summary.assignmentAverage || 0, icon: "📝" },
      { name: "Exams & Quizzes", score: summary.examAverage || 0, icon: "🎯" },
      { name: "Presentation", score: Math.round(presentationPercent), icon: "🗣️" },
      { name: "Assessment", score: Math.round(assessmentPercent), icon: "🏅" }
    ];

    // Sort metrics descending
    const sorted = [...metrics].sort((a, b) => b.score - a.score);
    const strengths = sorted.filter((m) => m.score >= 70).slice(0, 2);
    const focusAreas = sorted.filter((m) => m.score < 75).reverse().slice(0, 2);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
        {/* Top Strengths Box */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.03))",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 14,
            padding: 16
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            <FiCheckCircle size={18} />
            <span>Top Performing Strengths</span>
          </div>

          {strengths.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {strengths.map((item, idx) => (
                <div
                  key={`str-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "8px 12px",
                    borderRadius: 8
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {item.icon} {item.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
                    {item.score}%
                  </span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 4 }}>
                🌟 Excellent performance! Keep up this high standard.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-gray)" }}>Complete tasks to unlock strength badges.</p>
          )}
        </div>

        {/* Focus Areas Box */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.03))",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: 14,
            padding: 16
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            <FiAlertTriangle size={18} />
            <span>Recommended Focus Areas</span>
          </div>

          {focusAreas.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {focusAreas.map((item, idx) => (
                <div
                  key={`foc-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "8px 12px",
                    borderRadius: 8
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {item.icon} {item.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
                    {item.score}%
                  </span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 4 }}>
                🎯 Target these areas with additional practice to boost your overall grade.
              </p>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
              🎉 Outstanding! Performing well across all sectors.
            </div>
          )}
        </div>
      </div>
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

            {/* Radar Analysis & Learning Analytics Card */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20
                }}
              >
                <div>
                  <h3
                    style={{
                      color: "var(--pastel-blue-primary)",
                      fontSize: 18,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <FiActivity /> Student Learning Analytics & Performance Radar
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-gray)", marginTop: 4 }}>
                    Multi-dimensional performance analysis across Attendance, Assignments, Quizzes, Presentation, and Assessment.
                  </p>
                </div>

                {/* Interactive Benchmark Legend & Toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border-light)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: "#00e5ff",
                        display: "inline-block"
                      }}
                    ></span>
                    <span>Student Score</span>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showBenchmark}
                      onChange={(e) => setShowBenchmark(e.target.checked)}
                      style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                    />
                    <span style={{ color: "#f59e0b" }}>Class Average Benchmark</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                  alignItems: "center"
                }}
              >
                {/* 5-Axis Spider Chart SVG */}
                {renderRadarChart(analytics.summary)}

                {/* Automated Strengths & Weaknesses Badges */}
                {renderInsightsPanel(analytics.summary)}
              </div>
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
