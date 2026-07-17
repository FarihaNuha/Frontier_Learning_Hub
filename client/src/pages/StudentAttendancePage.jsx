import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiCheck,
  FiX,
  FiFile,
  FiBook,
  FiBookOpen,
  FiFileText,
  FiUser,
  FiLogOut,
  FiArrowLeft,
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentAttendancePage({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams(); //  courseID from URL

  // URL from props takes precedence over URL param, but in student case, we should rely on URL param as teacher might not pass courseId as prop
  const finalCourseId = propCourseId || urlCourseId;
  const finalCourseCode = propCourseCode || "";

  console.log("========== STUDENT ATTENDANCE PAGE (Fixed) ==========");
  console.log("URL Course ID:", urlCourseId);
  console.log("Props Course ID:", propCourseId);
  console.log("Final Course ID:", finalCourseCode);

  const [courseInfo, setCourseInfo] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [classType, setClassType] = useState("theory");
  const [gridMonth, setGridMonth] = useState(new Date().getMonth());
  const [gridYear, setGridYear] = useState(new Date().getFullYear());
  const [gridData, setGridData] = useState({ dates: [], matrix: [] });
  const [monthlySummary, setMonthlySummary] = useState({
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
  });

  useEffect(() => {
    if (
      finalCourseId &&
      finalCourseId !== "undefined" &&
      finalCourseId !== "null"
    ) {
      console.log("Loading attendance for course ID:", finalCourseId);
      loadCourseInfo(finalCourseId);
      fetchAttendanceData(finalCourseId);
      if (viewMode === "grid") {
        loadGridData();
      }
    } else {
      console.log("No valid course ID - redirecting to courses");
      navigate("/courses");
    }
  }, [finalCourseId, viewMode, gridMonth, gridYear, classType]);

  const loadCourseInfo = async (id) => {
    if (!id || id === "undefined" || id === "null") return;

    try {
      const res = await api.get(`/courses/${id}`);
      setCourseInfo(res.data.course);
      console.log("Course loaded:", res.data.course.displayCode);
    } catch (error) {
      console.error(error);
      toast.error("Course not found");
      navigate("/courses");
    }
  };

  const fetchAttendanceData = async (id) => {
    if (!id || id === "undefined" || id === "null") return;

    try {
      setLoading(true);
      // For students, don't pass classType — let the server auto-detect from teacher's records
      const [attRes, statsRes] = await Promise.all([
        api.get(`/attendance?courseId=${id}`),
        api.get(`/attendance/stats?courseId=${id}&month=${gridMonth}&year=${gridYear}`),
      ]);

      console.log("Attendance records for course:", id);
      console.log("Records found:", attRes.data.attendance?.length || 0);

      setAttendance(attRes.data.attendance || []);
      setStats(statsRes.data);

      // Auto-set classType from server's detection
      if (statsRes.data?.classType) {
        setClassType(statsRes.data.classType);
      }


      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const monthlyRecords = (attRes.data.attendance || []).filter((a) => {
        const date = new Date(a.date);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      });

      let present = 0;
      let absent = 0;
      monthlyRecords.forEach((record) => {
        if (record.status === "present") present++;
        else if (record.status === "absent") absent++;
      });

      setMonthlySummary({
        present,
        absent,
        total: monthlyRecords.length,
        percentage:
          monthlyRecords.length > 0
            ? ((present / monthlyRecords.length) * 100).toFixed(1)
            : 0,
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const loadGridData = async () => {
    if (!finalCourseId) return;

    try {
      setLoading(true);
      const res = await api.get(`/attendance?courseId=${finalCourseId}`);
      const allAttendance = (res.data.attendance || []).filter((a) => {
        const d = new Date(a.date);
        return d.getMonth() === gridMonth && d.getFullYear() === gridYear;
      });

      const dates = [...new Set(allAttendance.map((a) => a.date))].sort(
        (a, b) => new Date(a) - new Date(b),
      );

      const matrix = dates.map((date) => {
        const att = allAttendance.find(
          (a) => new Date(a.date).getTime() === new Date(date).getTime(),
        );
        return {
          status: att ? att.status : "absent",
          date: date,
          classType: att ? att.classType : "-",
        };
      });

      setGridData({ dates, matrix });

      let present = 0;
      let absent = 0;
      matrix.forEach((cell) => {
        if (cell.status === "present") present++;
        else if (cell.status === "absent") absent++;
      });

      setMonthlySummary({
        present,
        absent,
        total: matrix.length,
        percentage:
          matrix.length > 0 ? ((present / matrix.length) * 100).toFixed(1) : 0,
      });
    } catch (error) {
      console.error("Error loading grid data:", error);
      toast.error("Failed to load grid data");
    } finally {
      setLoading(false);
    }
  };

  const formatFullDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && !courseInfo) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="attendance"
          courseInfo={null}
          courseId={finalCourseId}
        />
        <div className="main-content">
          <div className="loading-state">
            <p>Loading attendance...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!courseInfo) {
    return (
      <div className="dashboard-container">
        <StudentSidebar
          currentPage="attendance"
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
        currentPage="attendance"
        courseInfo={courseInfo}
        courseId={finalCourseId}
      />
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>My Attendance</h1>
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
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn-primary"
              style={{
                background:
                  viewMode === "list"
                    ? "var(--pastel-blue-deep)"
                    : "var(--pastel-blue-primary)",
              }}
              onClick={() => setViewMode("list")}
            >
              List View
            </button>
            <button
              className="btn-primary"
              style={{
                background:
                  viewMode === "grid"
                    ? "var(--pastel-blue-deep)"
                    : "var(--pastel-blue-primary)",
              }}
              onClick={() => {
                setViewMode("grid");
                loadGridData();
              }}
            >
              Grid View
            </button>
          </div>
        </div>


        {/* Class Type Indicator — auto-detected from teacher's records, read-only for students */}
        {stats && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              padding: "10px 16px",
              background: stats.classType === "lab" ? "#fef3c7" : "#e0f2fe",
              borderRadius: 8,
              border: `1px solid ${stats.classType === "lab" ? "#fbbf24" : "#38bdf8"}`,
              fontSize: 14,
              color: stats.classType === "lab" ? "#92400e" : "#0369a1",
              fontWeight: 600,
            }}
          >
            <FiBookOpen size={16} style={{ color: stats.classType === "lab" ? "#b45309" : "#0369a1" }} />
            <span>
              {stats.classType === "lab" ? "Lab Class" : "Theory Class"} Attendance
            </span>
          </div>
        )}


        {stats && stats.totalClasses > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 20,
              marginBottom: 30,
            }}
          >
            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, #3B8DB3, #2C4B66)",
              }}
            >
              <div className="stat-value">{stats.totalClasses}</div>
              <div className="stat-label">Total Classes</div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, #10B981, #059669)",
              }}
            >
              <div className="stat-value">{stats.present}</div>
              <div className="stat-label">Present</div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, #EF4444, #DC2626)",
              }}
            >
              <div className="stat-value">{stats.absent}</div>
              <div className="stat-label">Absent</div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
              }}
            >
              <div className="stat-value">{stats.percentage}%</div>
              <div className="stat-label">Attendance Rate</div>
            </div>
            <div
              className="stat-card"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              }}
            >
              <div className="stat-value">{stats.attendanceMarks}/{stats.maxAttendanceMarks || 30}</div>
              <div className="stat-label">Attendance Marks</div>
            </div>
          </div>
        )}

        {monthlySummary.total > 0 && (
          <div
            className="card"
            style={{ marginBottom: 24, background: "#E8F4FD" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <h3 style={{ margin: 0, color: "#2C4B66" }}>
                <FiCalendar style={{ marginRight: 8 }} />
                This Month Summary (
                {new Date().toLocaleString("default", { month: "long" })})
              </h3>
              <div style={{ display: "flex", gap: 20 }}>
                <span style={{ color: "#10B981", fontWeight: 700 }}>
                  Present: {monthlySummary.present}
                </span>
                <span style={{ color: "#EF4444", fontWeight: 700 }}>
                  Absent: {monthlySummary.absent}
                </span>
                <span style={{ color: "#3B8DB3", fontWeight: 700 }}>
                  Rate: {monthlySummary.percentage}%
                </span>
              </div>
            </div>
          </div>
        )}

        {viewMode === "list" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Attendance Records</h2>
            


            {attendance.length === 0 ? (
              <div className="empty-state">
                <FiFile size={48} color="#6B89A0" />
                <h3>No attendance records found</h3>
                <p>
                  No attendance records available for {courseInfo.displayCode}.
                </p>
                <p style={{ fontSize: 12, color: "#6B89A0", marginTop: 8 }}>
                  Teacher hasn't marked attendance for this course yet.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((r) => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 600 }}>
                          {formatFullDate(r.date)}
                        </td>
                        <td>
                          <span
                            style={{
                              background: "#F3F4F6",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            {r.classType || "Theory"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${r.status === "present" ? "ontime" : "late"}`}
                          >
                            {r.status === "present" ? (
                              <FiCheck size={14} />
                            ) : (
                              <FiX size={14} />
                            )}
                            {r.status === "present" ? " Present" : " Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#E8F4FD" }}>
                      <td
                        colSpan="2"
                        style={{ textAlign: "right", padding: "12px 16px" }}
                      >
                        Summary:
                      </td>
                      <td style={{ padding: "12px 16px", color: "#3B8DB3" }}>
                        Present: {stats?.present || 0} | Absent: {stats?.absent || 0} | Percentage: {stats?.percentage || 0}% | Total Marks: {stats?.attendanceMarks || 0}/{stats?.maxAttendanceMarks || 30}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {viewMode === "grid" && (
          <div>


            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="filter-group">
                <label>Month:</label>
                <select
                  value={gridMonth}
                  onChange={(e) => setGridMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2024, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Year:</label>
                <select
                  value={gridYear}
                  onChange={(e) => setGridYear(parseInt(e.target.value))}
                >
                  {[2023, 2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                marginBottom: 20,
                padding: "12px 16px",
                background: "#f8f9fa",
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    background: "#dcfce7",
                    borderRadius: 4,
                  }}
                ></span>
                <span>Present</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    background: "#fee2e2",
                    borderRadius: 4,
                  }}
                ></span>
                <span>Absent</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    background: "#f9f9f9",
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                  }}
                ></span>
                <span>No Record</span>
              </div>
            </div>
            {gridData.matrix.length === 0 ? (
              <div className="empty-state">
                <FiCalendar size={48} color="#6B89A0" />
                <h3>No records found</h3>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    minWidth: 500,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          border: "1px solid #e0e0e0",
                          padding: "10px",
                          background: "#f5f5f5",
                        }}
                      >
                        #
                      </th>
                      <th
                        style={{
                          border: "1px solid #e0e0e0",
                          padding: "10px",
                          background: "#f5f5f5",
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          border: "1px solid #e0e0e0",
                          padding: "10px",
                          background: "#f5f5f5",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.matrix.map((cell, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            border: "1px solid #e0e0e0",
                            padding: "8px",
                            textAlign: "center",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            border: "1px solid #e0e0e0",
                            padding: "8px",
                          }}
                        >
                          {formatFullDate(cell.date)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #e0e0e0",
                            padding: "8px",
                            textAlign: "center",
                            background:
                              cell.status === "present"
                                ? "#dcfce7"
                                : cell.status === "absent"
                                  ? "#fee2e2"
                                  : "#f9f9f9",
                          }}
                        >
                          {cell.status === "present" ? (
                            <span style={{ color: "#10B981" }}>✓ Present</span>
                          ) : cell.status === "absent" ? (
                            <span style={{ color: "#EF4444" }}>✗ Absent</span>
                          ) : (
                            <span style={{ color: "#6B89A0" }}>-</span>
                          )}
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


