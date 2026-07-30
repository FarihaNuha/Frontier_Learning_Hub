import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { FiCalendar, FiFileText } from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import TeacherSidebar from "../components/TeacherSidebar";
import OfficialAcademicCalendarCard from "../components/OfficialAcademicCalendarCard";
import "../styles/dashboard.css";

export default function AcademicCalendarViewPage() {
  const { user } = useAuth();
  const [publishedCalendar, setPublishedCalendar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/service/calendar/published")
      .then((res) => {
        if (res.data?.publishedCalendar) {
          setPublishedCalendar(res.data.publishedCalendar);
        }
      })
      .catch((err) => {
        console.error("Failed to load published academic calendar.", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="calendar" />
      ) : (
        <StudentSidebar currentPage="calendar" />
      )}

      <div style={{ flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiCalendar size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Official Academic Calendar
            </h1>
          </div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            Official university schedule for Semester Classes, Examinations, Important Dates, and Holidays.
          </p>
        </div>

        {/* Official Academic Calendar Card Display */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading academic calendar...</div>
        ) : (
          <OfficialAcademicCalendarCard
            customData={publishedCalendar}
            fileUrl={publishedCalendar?.fileUrl}
            isAdmin={false}
          />
        )}
      </div>
    </div>
  );
}
