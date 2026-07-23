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
  FiAlertTriangle,
  FiX
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";
import TeacherSidebar from "../components/TeacherSidebar";

export default function CourseAnalyticsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]); // List of students (for teacher view)
  const [selectedStudent, setSelectedStudent] = useState(null); // Active student details (id, name, etc.)
  const [analytics, setAnalytics] = useState(null); // Loaded analytics details (summary, history)
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [activeHoverAxis, setActiveHoverAxis] = useState(null);
  const [activeTab, setActiveTab] = useState("continuous"); // "continuous" | "final"

  const fetchCourse = async () => {
    if (!user) return;
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
      const fetchedStudents = res.data.students || [];
      fetchedStudents.sort((a, b) => {
        const idA = String(a.studentIdNumber || a.studentId || a.id || "").trim();
        const idB = String(b.studentIdNumber || b.studentId || b.id || "").trim();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
      });
      setStudents(fetchedStudents);
    } catch (error) {
      toast.error("Error loading student roster analytics");
    }
  };

  const fetchStudentDetails = async (studentId) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (targetStudent) setSelectedStudent(targetStudent);
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

  useEffect(() => {
    if (user) {
      fetchCourse();
    }
  }, [id, user]);

  if (!user) return null;

  // Helper to convert raw assessment marks into 0-100% effort percentage
  const toPercentage = (val) => {
    if (val === undefined || val === null || isNaN(val)) return 0;
    const num = Number(val);
    if (num <= 0) return 0;

    // Out of 10
    if (num <= 10) return Math.min(100, Math.round((num / 10) * 100));
    // Out of 15
    if (num <= 15) return Math.min(100, Math.round((num / 15) * 100));
    // Out of 30 (e.g. 26 out of 30 => 86.67% => 87%)
    if (num <= 30) return Math.min(100, Math.round((num / 30) * 100));
    // Out of 40 (e.g. 34 out of 40 => 85%)
    if (num <= 40) return Math.min(100, Math.round((num / 40) * 100));
    // Out of 100 or already percentage
    return Math.min(100, Math.round(num));
  };

  // Continuous Performance: ONLY live data (attendance, assignments, exams) — 3 axes
  const computeContinuousValues = (summary) => {
    if (!summary) return [0, 0, 0];
    const att = Math.min(100, Math.round(summary.attendancePercent || 0));
    const asgn = Math.min(100, Math.round(summary.assignmentAverage || 0));
    const exam = Math.min(100, Math.round(summary.examAverage || 0));
    return [att, asgn, exam];
  };

  // Final Evaluation: uses assessment marksheet data (prioritized), falls back to live
  const computeSpiderValues = (summary) => {
    if (!summary) return [0, 0, 0, 0, 0];

    const hasAssessment = summary.assessment !== null && summary.assessment !== undefined;

    // 1. Attendance (Use assessment.attendance if uploaded, else live attendancePercent)
    const attVal = hasAssessment && summary.assessment.attendance !== undefined && summary.assessment.attendance !== null
      ? toPercentage(summary.assessment.attendance)
      : (summary.attendancePercent || 0);

    // 2. Assignments (Use assessment.assignment if uploaded, else live assignmentAverage)
    const assignVal = hasAssessment && summary.assessment.assignment !== undefined && summary.assessment.assignment !== null
      ? toPercentage(summary.assessment.assignment)
      : (summary.assignmentAverage || 0);

    // 3. Exams & Quizzes (Use assessment.quiz if uploaded, else live examAverage)
    const quizVal = hasAssessment && summary.assessment.quiz !== undefined && summary.assessment.quiz !== null
      ? toPercentage(summary.assessment.quiz)
      : (summary.examAverage || 0);

    // 4. Presentation (Use assessment.presentation if uploaded, else estimate)
    const presVal = hasAssessment && summary.assessment.presentation !== undefined && summary.assessment.presentation !== null
      ? toPercentage(summary.assessment.presentation)
      : (summary.examAverage > 0 ? Math.min(100, Math.round(summary.examAverage * 0.92)) : Math.round((attVal + assignVal + quizVal) / 3));

    // 5. Total Assessment Marks (Use assessment.totalMarks if uploaded, else average of continuous activities)
    const totalAssVal = hasAssessment && summary.assessment.totalMarks !== undefined && summary.assessment.totalMarks !== null
      ? toPercentage(summary.assessment.totalMarks)
      : Math.round((attVal + assignVal + quizVal) / 3);

    return [
      Math.round(attVal),
      Math.round(assignVal),
      Math.round(quizVal),
      Math.round(presVal),
      Math.round(totalAssVal)
    ];
  };

  // Helper to draw a colorful, interactive Radar/Spider chart in pure React SVG (3-axis or 5-axis)
  // Pass overrideValues to use pre-computed values instead of computeSpiderValues
  const renderRadarChart = (summary, overrideValues) => {
    if (!summary) return null;

    const size = 420;
    const center = size / 2;
    const radius = 108;
    const levels = 4;

    const values = overrideValues || computeSpiderValues(summary);
    const numAxes = values.length;
    const is3Axis = numAxes === 3;

    // Dynamic Axes definitions
    const labels = is3Axis
      ? ["Attendance", "Assignments", "Exams & Quizzes"]
      : ["Attendance", "Assignments", "Exams & Quizzes", "Presentation", "Assessment"];
    const labelShort = is3Axis
      ? ["Attendance", "Assignments", "Exams & Quizzes"]
      : ["Attendance", "Assignments", "Exams", "Presentation", "Assessment"];
    const colors = is3Axis
      ? ["#00e5ff", "#3b82f6", "#a855f7"]
      : ["#00e5ff", "#3b82f6", "#a855f7", "#f59e0b", "#10b981"];

    // Class average benchmark data for comparison overlay
    const rawBenchmark = summary.classAverage
      ? (is3Axis
          ? [
              summary.classAverage.attendance ?? 78,
              summary.classAverage.assignment ?? 72,
              summary.classAverage.quiz ?? 70
            ]
          : [
              summary.classAverage.attendance ?? 78,
              summary.classAverage.assignment ?? 72,
              summary.classAverage.quiz ?? 70,
              summary.classAverage.presentation ?? 68,
              summary.classAverage.assessment ?? 75
            ])
      : (is3Axis ? [78, 72, 70] : [78, 72, 70, 68, 75]);

    const benchmarkValues = rawBenchmark.map((v) => Math.min(100, Math.max(0, Number(v) || 0)));

    // Compute coordinates for any vertex at index (0..4) and value percentage (0..100)
    const getCoordinates = (index, valuePercent) => {
      const clampedVal = Math.min(100, Math.max(0, Number(valuePercent) || 0));
      const angle = (2 * Math.PI / numAxes) * index - Math.PI / 2;
      const dist = (clampedVal / 100) * radius;
      return {
        x: center + dist * Math.cos(angle),
        y: center + dist * Math.sin(angle)
      };
    };

    // Level polygons (25%, 50%, 75%, 100%) - Solid, crisp web lines matching Image 2
    const levelPolygons = [];
    const levelScaleTexts = [];

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
          fill={l % 2 === 0 ? "rgba(148, 163, 184, 0.05)" : "none"}
          stroke={l === levels ? "#94a3b8" : "rgba(148, 163, 184, 0.5)"}
          strokeWidth={l === levels ? "2" : "1.2"}
        />
      );

      // Percentage scale label along top axis (25, 50, 75, 100)
      const scaleCoord = getCoordinates(0, levelPercent);
      levelScaleTexts.push(
        <text
          key={`scale-${l}`}
          x={scaleCoord.x}
          y={scaleCoord.y - 4}
          fill="#64748b"
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
        >
          {Math.round(levelPercent)}
        </text>
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
          stroke={isHovered ? "#38bdf8" : "rgba(148, 163, 184, 0.45)"}
          strokeWidth={isHovered ? "2" : "1.4"}
          style={{ transition: "all 0.3s ease" }}
        />
      );

      // Position labels outside the outer ring with enough padding to stay inside card
      const labelDist = radius + 25;
      const angle = (2 * Math.PI / numAxes) * i - Math.PI / 2;
      const lx = center + labelDist * Math.cos(angle);
      const ly = center + labelDist * Math.sin(angle) + 4;
      let textAnchor = "middle";
      if (Math.cos(angle) > 0.25) textAnchor = "start";
      else if (Math.cos(angle) < -0.25) textAnchor = "end";

      const val = values[i];
      const valColor = val >= 80 ? "#10b981" : val >= 65 ? "#3b82f6" : "#f59e0b";
      const axisColor = colors[i];

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
            fill={isHovered ? axisColor : "var(--text-primary, #1e293b)"}
            fontSize={isHovered ? "13" : "12"}
            fontWeight={isHovered ? "700" : "600"}
            textAnchor={textAnchor}
            style={{ transition: "all 0.2s ease" }}
          >
            {labelShort[i]}
          </text>
          <text
            x={lx}
            y={ly + 10}
            fill={valColor}
            fontSize="13"
            fontWeight="800"
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
      <div style={{ position: "relative", width: "100%", maxWidth: size + 40, margin: "0 auto", padding: "0 10px", overflow: "visible" }}>
        <svg
          width="100%"
          height={size}
          viewBox="-30 -10 480 430"
          className="analytics-radar-svg"
          style={{ overflow: "visible", display: "block" }}
        >
          <defs>
            {/* Colorful multi-stop gradient for student radar fill */}
            <radialGradient id="spiderGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
              <stop offset="60%" stopColor="rgba(168, 85, 247, 0.3)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
            </radialGradient>

            {/* Class Benchmark gradient */}
            <radialGradient id="benchmarkGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.2)" />
              <stop offset="100%" stopColor="rgba(245, 158, 11, 0.02)" />
            </radialGradient>
          </defs>

          {/* Level web background polygons */}
          {levelPolygons}

          {/* Web scale numbers */}
          {levelScaleTexts}

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
            stroke="#38bdf8"
            strokeWidth="2.5"
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
                  strokeWidth="1.5"
                  opacity="0.8"
                />
              );
            })}

          {/* Student Node Dots matching Image 2 */}
          {values.map((v, i) => {
            const coord = getCoordinates(i, v);
            const isHovered = activeHoverAxis === i;
            return (
              <g key={`dot-group-${i}`}>
                {isHovered && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="9"
                    fill="rgba(56, 189, 248, 0.25)"
                  />
                )}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? "6" : "5"}
                  fill="#ffffff"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
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
            <div style={{ fontSize: "14px", fontWeight: 700, color: colors[activeHoverAxis] || "#00e5ff", marginBottom: "4px" }}>
              {labels[activeHoverAxis]}
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
  const renderInsightsPanel = (summary, overrideValues) => {
    if (!summary) return null;

    const values = overrideValues || computeSpiderValues(summary);
    const is3Axis = values.length === 3;

    const getMetricIcon = (name, size = 16) => {
      switch (name) {
        case "Attendance": return <FiCalendar size={size} style={{ marginRight: 8, verticalAlign: "middle", color: "#00e5ff" }} />;
        case "Assignments": return <FiFileText size={size} style={{ marginRight: 8, verticalAlign: "middle", color: "#3b82f6" }} />;
        case "Exams & Quizzes": return <FiActivity size={size} style={{ marginRight: 8, verticalAlign: "middle", color: "#a855f7" }} />;
        case "Presentation": return <FiUsers size={size} style={{ marginRight: 8, verticalAlign: "middle", color: "#f59e0b" }} />;
        case "Assessment": return <FiAward size={size} style={{ marginRight: 8, verticalAlign: "middle", color: "#10b981" }} />;
        default: return null;
      }
    };

    const metrics = is3Axis
      ? [
          { name: "Attendance", score: values[0] },
          { name: "Assignments", score: values[1] },
          { name: "Exams & Quizzes", score: values[2] }
        ]
      : [
          { name: "Attendance", score: values[0] },
          { name: "Assignments", score: values[1] },
          { name: "Exams & Quizzes", score: values[2] },
          { name: "Presentation", score: values[3] },
          { name: "Assessment", score: values[4] }
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
                  <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>
                    {getMetricIcon(item.name)} {item.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
                    {item.score}%
                  </span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 4 }}>
                Excellent performance! Keep up this high standard.
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
                  <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>
                    {getMetricIcon(item.name)} {item.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
                    {item.score}%
                  </span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "var(--text-gray)", marginTop: 4 }}>
                Target these areas with additional practice to boost your overall grade.
              </p>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
              Outstanding! Performing well across all sectors.
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

        {/* Student Performance Analytics Section (Inline Dashboard View) */}
        {(selectedStudent || loadingDetails) && (
          <div
            className="analytics-inline-card"
            style={{
              background: "var(--bg-card, #ffffff)",
              color: "var(--text-primary, #1e293b)",
              borderRadius: "20px",
              padding: "24px 28px 32px",
              marginTop: "28px",
              boxShadow: "0 4px 25px rgba(0, 0, 0, 0.06)",
              border: "1px solid var(--border-color, rgba(148, 163, 184, 0.2))",
              position: "relative"
            }}
          >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--border-color, rgba(148,163,184,0.2))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FiActivity size={22} color="var(--pastel-blue-deep, #38bdf8)" />
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                    Student Performance Analytics {selectedStudent?.name ? `- ${selectedStudent.name}` : ""}
                  </h3>
                </div>
              </div>

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
                    ID: {selectedStudent.studentIdNumber || selectedStudent.studentId || selectedStudent.id || "N/A"} | Dept: {selectedStudent.department} | Email: {selectedStudent.email}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ TAB NAVIGATION ═══ */}
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "rgba(248,250,252,0.06)",
                border: "1px solid rgba(148,163,184,0.15)",
                borderRadius: 16,
                padding: 5,
                marginBottom: 22,
                width: "fit-content",
                backdropFilter: "blur(12px)",
                boxShadow: "0 2px 16px rgba(0,0,0,0.15)"
              }}
            >
              <button
                onClick={() => setActiveTab("continuous")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 12,
                  border: activeTab === "continuous"
                    ? "1px solid rgba(56,189,248,0.5)"
                    : "1px solid transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  letterSpacing: "0.02em",
                  transition: "all 0.25s ease",
                  background: activeTab === "continuous"
                    ? "linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(125,211,252,0.12) 100%)"
                    : "transparent",
                  color: activeTab === "continuous" ? "#38bdf8" : "rgba(148,163,184,0.7)",
                  boxShadow: activeTab === "continuous"
                    ? "0 0 16px rgba(56,189,248,0.18)"
                    : "none"
                }}
              >
                <FiActivity size={15} />
                Continuous Performance
              </button>
              <button
                onClick={() => setActiveTab("final")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 12,
                  border: activeTab === "final"
                    ? "1px solid rgba(52,211,153,0.5)"
                    : "1px solid transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  letterSpacing: "0.02em",
                  transition: "all 0.25s ease",
                  background: activeTab === "final"
                    ? "linear-gradient(135deg, rgba(52,211,153,0.2) 0%, rgba(16,185,129,0.12) 100%)"
                    : "transparent",
                  color: activeTab === "final" ? "#34d399" : "rgba(148,163,184,0.7)",
                  boxShadow: activeTab === "final"
                    ? "0 0 16px rgba(52,211,153,0.18)"
                    : "none"
                }}
              >
                <FiAward size={15} />
                Final Evaluation
              </button>
            </div>

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                SECTION 1 : CONTINUOUS PERFORMANCE
                (Live data: Quizzes, Assignments, Attendance)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {/* TAB 1 CONTENT: Continuous Performance */}
            {activeTab === "continuous" && (
            <div className="card" style={{ marginBottom: 24 }}>

              {/* Section Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(56,189,248,0.15)" }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(0,229,255,0.25), rgba(59,130,246,0.15))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(0,229,255,0.3)"
                  }}
                >
                  <FiActivity size={20} color="#00e5ff" />
                </div>
                <div>
                  <h3 style={{ color: "#00e5ff", fontSize: 17, fontWeight: 700, margin: 0 }}>
                    Continuous Performance
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--text-gray)", margin: 0, marginTop: 2 }}>
                    Live data from quizzes, assignments &amp; attendance â€” updates dynamically
                  </p>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-gray)", background: "rgba(0,229,255,0.08)", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(0,229,255,0.15)" }}>
                  Live Tracking
                </div>
              </div>

              {/* Live Performance Radar — Continuous Data Only */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 4, background: "linear-gradient(#38bdf8, #818cf8)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>Live Performance Radar</span>
                  <span style={{ fontSize: 11, color: "var(--text-gray)" }}>— Based on live website activity</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
                  <div style={{ overflow: "hidden", padding: "6px 0" }}>
                    {renderRadarChart(analytics.summary, computeContinuousValues(analytics.summary))}
                  </div>
                  {renderInsightsPanel(analytics.summary, computeContinuousValues(analytics.summary))}
                </div>
              </div>

              {/* Continuous Metrics Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Attendance", value: `${analytics.summary.attendancePercent || 0}%`, sub: `${analytics.summary.presentCount || 0}/${analytics.summary.totalAttendanceCount || 0} classes`, color: "#00e5ff", icon: <FiCalendar size={16} /> },
                  { label: "Assignments", value: `${analytics.summary.assignmentAverage || 0}%`, sub: `${analytics.summary.completedAssignments || 0}/${analytics.summary.totalAssignments || 0} submitted`, color: "#3b82f6", icon: <FiFileText size={16} /> },
                  { label: "Exams & Quizzes", value: `${analytics.summary.examAverage || 0}%`, sub: `${analytics.summary.completedExams || 0}/${analytics.summary.totalExams || 0} attempted`, color: "#a855f7", icon: <FiActivity size={16} /> }
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: `linear-gradient(135deg, rgba(${i===0?"0,229,255":i===1?"59,130,246":"168,85,247"},0.1), rgba(${i===0?"0,229,255":i===1?"59,130,246":"168,85,247"},0.03))`,
                      border: `1px solid rgba(${i===0?"0,229,255":i===1?"59,130,246":"168,85,247"},0.25)`,
                      borderRadius: 12, padding: 14
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: m.color }}>
                      {m.icon}
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-gray)", marginTop: 4 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Activities & Feedback History */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 3, height: 16, borderRadius: 4, background: "linear-gradient(#00e5ff, #3b82f6)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Activity &amp; Feedback History</span>
              </div>

              {/* Assignments Section */}
              {analytics.history.assignments.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 4, height: 16, borderRadius: 4, background: "linear-gradient(#3b82f6, #00e5ff)" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assignments</span>
                    <span style={{ fontSize: 10, background: "rgba(59,130,246,0.15)", color: "#3b82f6", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                      {analytics.history.assignments.length} tasks
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {analytics.history.assignments.map((item, idx) => {
                      const pct = item.marksObtained !== null ? Math.round(item.percentage) : null;
                      const pctColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
                      return (
                        <div
                          key={`assign-${idx}`}
                          style={{
                            background: "rgba(59,130,246,0.05)",
                            border: "1px solid rgba(59,130,246,0.18)",
                            borderLeft: `4px solid ${item.submitted ? "#3b82f6" : "#64748b"}`,
                            borderRadius: "0 12px 12px 0",
                            padding: 14
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <FiFileText size={13} color="#3b82f6" />
                                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{item.title}</h4>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                                  background: item.submitted ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                  color: item.submitted ? "#10b981" : "#ef4444"
                                }}>
                                  {item.submitted ? "Submitted" : "Not Submitted"}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                                {item.deadline && (
                                  <span style={{ fontSize: 10, color: "var(--text-gray)", display: "flex", alignItems: "center", gap: 3 }}>
                                    <FiCalendar size={10} /> Due: {new Date(item.deadline).toLocaleDateString()}
                                  </span>
                                )}
                                {item.submitted && item.submittedAt && (
                                  <span style={{ fontSize: 10, color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}>
                                    <FiCheckCircle size={10} /> Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {item.feedback && String(item.feedback).trim() !== "" && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.05))",
                                    border: "1px solid rgba(59, 130, 246, 0.3)",
                                    borderLeft: "3px solid #3b82f6",
                                    borderRadius: "0 8px 8px 0",
                                    padding: "8px 12px"
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: "#2563eb",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 4,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5
                                    }}
                                  >
                                    <FiUsers size={11} /> Teacher Feedback
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#1e293b",
                                      margin: 0,
                                      lineHeight: 1.5
                                    }}
                                  >
                                    &ldquo;{item.feedback}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                            <div style={{
                              textAlign: "center", minWidth: 62,
                              background: pct !== null ? `rgba(${pct>=80?"16,185,129":pct>=60?"59,130,246":pct>=40?"245,158,11":"239,68,68"},0.12)` : "rgba(100,116,139,0.1)",
                              border: `1px solid ${pct !== null ? pctColor : "rgba(100,116,139,0.3)"}`,
                              borderRadius: 10, padding: "7px 9px"
                            }}>
                              {pct !== null ? (
                                <>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: pctColor }}>{pct}%</div>
                                  <div style={{ fontSize: 9, color: "var(--text-gray)", marginTop: 2 }}>{item.marksObtained}/{item.totalMarks}</div>
                                </>
                              ) : (
                                <div style={{ fontSize: 10, color: "var(--text-gray)" }}>Ungraded</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Exams Section */}
              {analytics.history.exams.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 4, height: 16, borderRadius: 4, background: "linear-gradient(#a855f7, #7c3aed)" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Exams &amp; Quizzes</span>
                    <span style={{ fontSize: 10, background: "rgba(168,85,247,0.15)", color: "#a855f7", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                      {analytics.history.exams.length} exams
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {analytics.history.exams.map((item, idx) => {
                      const pct = item.marksObtained !== null ? Math.round(item.percentage) : null;
                      const pctColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
                      const resultsVisible = item.marksObtained !== null;
                      return (
                        <div
                          key={`exam-${idx}`}
                          style={{
                            background: "rgba(168,85,247,0.05)",
                            border: "1px solid rgba(168,85,247,0.18)",
                            borderLeft: `4px solid ${item.submitted ? "#a855f7" : "#64748b"}`,
                            borderRadius: "0 12px 12px 0",
                            padding: 14
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <FiActivity size={13} color="#a855f7" />
                                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{item.title}</h4>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                                  background: item.submitted ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                  color: item.submitted ? "#10b981" : "#ef4444"
                                }}>
                                  {item.submitted ? "Attempted" : "Missed"}
                                </span>
                                {item.graded && !resultsVisible && (
                                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>
                                    Results Pending
                                  </span>
                                )}
                              </div>
                              <div style={{ marginTop: 5 }}>
                                <span style={{ fontSize: 10, color: "var(--text-gray)", display: "flex", alignItems: "center", gap: 3 }}>
                                  <FiCalendar size={10} /> {new Date(item.scheduledAt).toLocaleDateString()}
                                </span>
                              </div>
                              {item.feedback && String(item.feedback).trim() !== "" && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    background: "linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(124, 58, 237, 0.05))",
                                    border: "1px solid rgba(168, 85, 247, 0.3)",
                                    borderLeft: "3px solid #a855f7",
                                    borderRadius: "0 8px 8px 0",
                                    padding: "8px 12px"
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: "#7c3aed",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 4,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5
                                    }}
                                  >
                                    <FiUsers size={11} /> Teacher Feedback
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#1e293b",
                                      margin: 0,
                                      lineHeight: 1.5
                                    }}
                                  >
                                    &ldquo;{item.feedback}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                            <div style={{
                              textAlign: "center", minWidth: 62,
                              background: pct !== null ? `rgba(${pct>=80?"16,185,129":pct>=60?"59,130,246":pct>=40?"245,158,11":"239,68,68"},0.12)` : "rgba(100,116,139,0.1)",
                              border: `1px solid ${pct !== null ? pctColor : "rgba(100,116,139,0.3)"}`,
                              borderRadius: 10, padding: "7px 9px"
                            }}>
                              {pct !== null ? (
                                <>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: pctColor }}>{pct}%</div>
                                  <div style={{ fontSize: 9, color: "var(--text-gray)", marginTop: 2 }}>{item.marksObtained}/{item.totalMarks}</div>
                                </>
                              ) : (
                                <div style={{ fontSize: 10, color: "var(--text-gray)" }}>{item.submitted ? "Pending" : "N/A"}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {analytics.history.assignments.length === 0 && analytics.history.exams.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-gray)" }}>
                  <FiFileText size={28} style={{ marginBottom: 10 }} />
                  <p>No activities recorded yet for this course.</p>
                </div>
              )}
            </div>
            )} {/* end continuous tab */}


            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                SECTION 2 : FINAL EVALUATION
                (Based on uploaded assessment marksheet)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {/* TAB 2: Final Evaluation */}
            {activeTab === "final" && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.1))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(16,185,129,0.3)"
                  }}
                >
                  <FiAward size={20} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ color: "#10b981", fontSize: 17, fontWeight: 700, margin: 0 }}>
                    Final Evaluation
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--text-gray)", margin: 0, marginTop: 2 }}>
                    Based on uploaded assessment marksheet â€” official course evaluation
                  </p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  {analytics.summary.assessment ? (
                    <span style={{ fontSize: 11, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.25)", fontWeight: 600 }}>
                      Marksheet Uploaded
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.25)", fontWeight: 600 }}>
                      Awaiting Marksheet
                    </span>
                  )}
                </div>
              </div>

              {analytics.summary.assessment ? (
                <>
                  {/* Final marks breakdown grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
                    {[
                      { label: "Attendance", raw: analytics.summary.assessment.attendance, color: "#00e5ff", max: 30 },
                      { label: "Assignment", raw: analytics.summary.assessment.assignment, color: "#3b82f6", max: 30 },
                      { label: "Quiz", raw: analytics.summary.assessment.quiz, color: "#a855f7", max: 30 },
                      { label: "Presentation", raw: analytics.summary.assessment.presentation, color: "#f59e0b", max: 30 },
                      { label: "Total CA", raw: analytics.summary.assessment.totalMarks, color: "#10b981", max: 100 }
                    ].map((m, i) => {
                      const pct = m.raw !== null && m.raw !== undefined ? Math.min(100, Math.round((m.raw / m.max) * 100)) : null;
                      const pctColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";
                      return (
                        <div
                          key={i}
                          style={{
                            background: `linear-gradient(135deg, rgba(${i===0?"0,229,255":i===1?"59,130,246":i===2?"168,85,247":i===3?"245,158,11":"16,185,129"},0.1), transparent)`,
                            border: `1px solid rgba(${i===0?"0,229,255":i===1?"59,130,246":i===2?"168,85,247":i===3?"245,158,11":"16,185,129"},0.25)`,
                            borderRadius: 12, padding: 14, textAlign: "center"
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, color: m.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: pct !== null ? pctColor : "var(--text-gray)" }}>
                            {pct !== null ? `${pct}%` : "N/A"}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-gray)", marginTop: 3 }}>
                            {m.raw !== null && m.raw !== undefined ? `${m.raw} / ${m.max}` : "Not set"}
                          </div>
                          {/* Progress bar */}
                          {pct !== null && (
                            <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 4, width: `${pct}%`, background: `linear-gradient(90deg, ${m.color}, ${pctColor})`, transition: "width 0.6s ease" }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Final Radar Chart overlay */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 4, background: "linear-gradient(#10b981, #3b82f6)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Final Performance Radar</span>
                    <span style={{ fontSize: 10, color: "var(--text-gray)" }}>— Official Marksheet Based</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
                    <div style={{ overflow: "hidden", padding: "10px 0" }}>
                      {renderRadarChart(analytics.summary)}
                    </div>
                    {renderInsightsPanel(analytics.summary)}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <FiAward size={40} style={{ color: "rgba(16,185,129,0.3)", marginBottom: 12 }} />
                  <h4 style={{ color: "var(--text-gray)", fontWeight: 600, marginBottom: 8 }}>No Assessment Marksheet Yet</h4>
                  <p style={{ fontSize: 12, color: "var(--text-gray)", maxWidth: 320, margin: "0 auto" }}>
                    Once the teacher uploads the final assessment marksheet for this course,
                    the official evaluation results will appear here.
                  </p>
                </div>
              )}
            </div>
            )} {/* end final tab */}
          </div>
        ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
