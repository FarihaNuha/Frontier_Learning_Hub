import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiPlus,
  FiUploadCloud,
  FiX,
  FiCheckCircle,
  FiFileText,
  FiGlobe,
} from "react-icons/fi";
import OfficialAcademicCalendarCard, { DEFAULT_CALENDAR_DATA } from "../components/OfficialAcademicCalendarCard";
import "../styles/dashboard.css";

export default function AdminCalendarManagementPage() {
  const [publishedCalendar, setPublishedCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Modal State
  const [fileUrl, setFileUrl] = useState("");
  const [sessionHeader, setSessionHeader] = useState("Session: 2020-2021, 2021-2022, 2022-2023");
  const [termHeader, setTermHeader] = useState("Term: January 2026");
  const [submitting, setSubmitting] = useState(false);

  const fetchPublishedCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.get("/service/calendar/published");
      if (res.data?.publishedCalendar) {
        setPublishedCalendar(res.data.publishedCalendar);
      }
    } catch (err) {
      console.error("Failed loading published calendar", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedCalendar();
  }, []);

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        title: "B.Sc. Academic Calendar for the Semester: January 2026 and July 2026",
        session: sessionHeader || "Session: 2020-2021, 2021-2022, 2022-2023",
        termHeader: termHeader || "Term: January 2026",
        fileUrl: fileUrl.trim(),
        fileType: fileUrl.trim().endsWith(".pdf") ? "pdf" : "image",
        events: DEFAULT_CALENDAR_DATA.events,
        importantDates: DEFAULT_CALENDAR_DATA.importantDates,
        holidays: DEFAULT_CALENDAR_DATA.holidays,
      };

      const res = await api.post("/service/calendar/published", payload);
      toast.success("Official Academic Calendar published & broadcasted to all Teacher and Student dashboards!");
      setPublishedCalendar(res.data.publishedCalendar);
      setShowUploadModal(false);
    } catch (err) {
      toast.error("Failed to publish academic calendar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiCalendar size={22} />
              </div>
              <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Academic Calendar Management</h1>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Upload, fix, and publish official university academic calendars directly to all teacher and student dashboards.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              background: "#3b8db3",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59,141,179,0.3)",
            }}
          >
            <FiUploadCloud size={18} /> Upload & Broadcast Calendar
          </button>
        </div>

        {/* Official Academic Calendar Card Display */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading academic calendar...</div>
        ) : (
          <OfficialAcademicCalendarCard
            customData={publishedCalendar}
            fileUrl={publishedCalendar?.fileUrl}
            onUploadClick={() => setShowUploadModal(true)}
            isAdmin={true}
          />
        )}
      </div>

      {/* Upload & Broadcast Modal */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #3B8DB3, #2C4B66)",
                color: "#ffffff",
                display: "flex",
                justify: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FiUploadCloud size={20} />
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Upload & Broadcast Academic Calendar</h3>
              </div>
              <FiX size={20} cursor="pointer" onClick={() => setShowUploadModal(false)} />
            </div>

            {/* Form */}
            <form onSubmit={handleBroadcastSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Academic Sessions Header:
                </label>
                <input
                  type="text"
                  value={sessionHeader}
                  onChange={(e) => setSessionHeader(e.target.value)}
                  placeholder="e.g. Session: 2020-2021, 2021-2022, 2022-2023"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Semester / Term Header:
                </label>
                <input
                  type="text"
                  value={termHeader}
                  onChange={(e) => setTermHeader(e.target.value)}
                  placeholder="e.g. Term: January 2026"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Select File from Device (PDF, Excel, DOCX, PNG, JPG):
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc"
                  onChange={async (e) => {
                    const selectedFile = e.target.files[0];
                    if (!selectedFile) return;
                    const formData = new FormData();
                    formData.append("calendarFile", selectedFile);
                    toast.loading("Uploading file...", { id: "uploading" });
                    try {
                      const res = await api.post("/service/calendar/upload-file", formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                      });
                      setFileUrl(res.data.fileUrl);
                      toast.success(`Uploaded ${selectedFile.name}`, { id: "uploading" });
                    } catch (err) {
                      toast.error("File upload failed.", { id: "uploading" });
                    }
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box", background: "#f8fafc" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Or Direct Document / File URL:
                </label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="Direct document URL (e.g. https://.../calendar.pdf)"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
                <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", display: "block" }}>
                  Supported formats: <strong>PDF, Excel (.xlsx), Word (.docx), or Image (PNG/JPG)</strong>. Uploading will instantly publish the official calendar to every student & teacher dashboard.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#3b8db3", color: "#ffffff", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FiGlobe size={15} /> {submitting ? "Broadcasting..." : "Publish & Broadcast to All"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
