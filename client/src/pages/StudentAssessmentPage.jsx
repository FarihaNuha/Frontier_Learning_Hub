import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUser,
  FiLogOut,
  FiFileText,
  FiCalendar,
  FiArrowLeft,
  FiBookOpen,
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentAssessmentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: courseId } = useParams(); // Selected course context if navigated from course dashboard

  const [assessments, setAssessments] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseLoading, setCourseLoading] = useState(Boolean(courseId));

  useEffect(() => {
    fetchAssessments();
    if (courseId) {
      setCourseLoading(true);
      api.get(`/courses/${courseId}`)
        .then((res) => {
          setCourseInfo(res.data.course);
        })
        .catch(() => {})
        .finally(() => {
          setCourseLoading(false);
        });
    } else {
      setCourseInfo(null);
      setCourseLoading(false);
    }
  }, [courseId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assessments/student");
      setAssessments(res.data.assessments);
    } catch (error) {
      toast.error("Failed to load your assessment marks");
    } finally {
      setLoading(false);
    }
  };

  const isDataLoading = loading || (Boolean(courseId) && courseLoading);

  const displayedAssessments = courseId
    ? (courseInfo
        ? assessments.filter(
            (a) => (a.courseCode || "").trim().toLowerCase() === (courseInfo.displayCode || "").trim().toLowerCase()
          )
        : [])
    : assessments;

  return (
    <div className="dashboard-container">
      <StudentSidebar
        currentPage="assessment"
        courseId={courseId}
      />

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>
              {courseInfo ? `${courseInfo.displayCode} Assessment Marksheet` : "Personal Assessment Marksheet"}
            </h1>
            <p style={{ color: "#6b89a0", marginTop: 4 }}>
              {courseInfo
                ? `Viewing your assessment component scores for ${courseInfo.displayCode} - ${courseInfo.name}`
                : "Securely view all your assessment component scores and total CA marks"}
            </p>
          </div>
        </div>

        {/* ASSESSMENT GRID/TABLE */}
        <div className="table-container">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #E2EEF6",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: "#2c4b66" }}>
              {courseInfo ? `${courseInfo.displayCode} Scores` : "My Assessment Scores"}
            </h2>
          </div>

          {isDataLoading ? (
            <div className="loading-state" style={{ padding: "40px 0" }}>
              <div className="spinner" style={{ margin: "0 auto" }}></div>
            </div>
          ) : displayedAssessments.length === 0 ? (
            <div className="empty-state" style={{ padding: "60px 0" }}>
              <FiFileText size={48} color="#6B89A0" />
              <h3>No assessment records found</h3>
              <p>
                {courseInfo
                  ? `Your teacher hasn't uploaded assessment marks for ${courseInfo.displayCode} yet`
                  : "Your teacher hasn't uploaded assessment marks for you yet"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Attendance Score</th>
                    <th>Quiz Score</th>
                    <th>Assignment Score</th>
                    <th>Presentation Score</th>
                    <th>Total CA Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAssessments.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <span className="status-badge ontime" style={{ background: "#E8F4FD", color: "#3B8DB3", fontWeight: 700 }}>
                          {record.courseCode}
                        </span>
                      </td>
                      <td>{record.attendance}</td>
                      <td>{record.quiz}</td>
                      <td>{record.assignment}</td>
                      <td>{record.presentation}</td>
                      <td style={{ fontWeight: 700, color: "#10b981", fontSize: 15 }}>
                        {record.totalMarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
