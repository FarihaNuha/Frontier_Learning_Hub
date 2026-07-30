import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiPrinter,
  FiAward,
  FiBookOpen,
  FiUser,
  FiFileText,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function StudentTranscriptPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/academic/student/transcript")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        toast.error("Failed to load official transcript data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const studentInfo = data?.studentInfo || {};
  const semesterBreakdown = data?.semesterBreakdown || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <div className="no-print">
        <StudentSidebar currentPage="transcript" />
      </div>

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Printable Header Bar */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Official Academic Transcript
            </h1>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
              Official university record of courses completed, letter grades, semester GPAs, and overall CGPA.
            </p>
          </div>

          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#3b8db3",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59,141,179,0.25)",
            }}
          >
            <FiPrinter size={16} /> Print / Download PDF Transcript
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading academic transcript...</div>
        ) : (
          /* Official Transcript Document Container */
          <div
            className="transcript-document"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "40px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
              border: "1px solid #cbd5e1",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            {/* University Letterhead Header */}
            <div style={{ textAlign: "center", borderBottom: "2px solid #2C4B66", paddingBottom: "20px", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, color: "#2C4B66", fontSize: "22px", letterSpacing: 0.5, textTransform: "uppercase" }}>
                University of Frontier Technology, Bangladesh
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                OFFICIAL ACADEMIC TRANSCRIPT OF RECORD
              </p>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                Issue Date: {new Date(data?.issueDate || Date.now()).toLocaleDateString()} • Controller of Examinations
              </div>
            </div>

            {/* Student Meta Table */}
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13.5px" }}>
                <div><strong>Student Name:</strong> {studentInfo.name}</div>
                <div><strong>Student ID:</strong> {studentInfo.studentId}</div>
                <div><strong>Department:</strong> {studentInfo.department}</div>
                <div><strong>Program:</strong> {studentInfo.program}</div>
                <div><strong>Batch & Session:</strong> {studentInfo.batch} ({studentInfo.session})</div>
                <div><strong>Academic Status:</strong> <span style={{ fontWeight: 700, color: "#3b8db3" }}>{studentInfo.academicStatus}</span></div>
                <div><strong>Total Credits Earned:</strong> {data?.totalCreditsEarned || 0}</div>
                <div><strong>Overall Cumulative CGPA:</strong> <span style={{ fontWeight: 800, color: "#16a34a", fontSize: "16px" }}>{(data?.cgpa || 0).toFixed(2)}</span></div>
              </div>
            </div>

            {/* Semester Breakdowns */}
            {semesterBreakdown.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                No published course results recorded on official transcript.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                {semesterBreakdown.map((sem, idx) => (
                  <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ background: "#f1f5f9", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                        {sem.semesterName} (Session: {sem.session})
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>
                        Semester GPA: {sem.semesterGPA.toFixed(2)}
                      </span>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                          <th style={{ padding: "10px 14px" }}>Course Code</th>
                          <th style={{ padding: "10px 14px" }}>Course Title</th>
                          <th style={{ padding: "10px 14px" }}>Type</th>
                          <th style={{ padding: "10px 14px" }}>Credits</th>
                          <th style={{ padding: "10px 14px" }}>Grade</th>
                          <th style={{ padding: "10px 14px" }}>Grade Point</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sem.courses.map((c, cIdx) => (
                          <tr key={c._id || cIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{c.courseCode}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{c.courseTitle}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{c.courseType}</td>
                            <td style={{ padding: "10px 14px" }}>{c.creditHours}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: c.letterGrade === "F" ? "#b91c1c" : "#16a34a" }}>{c.letterGrade || "-"}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>{c.gradePoint !== undefined && c.gradePoint !== null ? Number(c.gradePoint).toFixed(2) : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* Transcript Footer Signatures */}
            <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "20px", borderTop: "1px dashed #cbd5e1" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #475569", width: "160px", marginBottom: "4px" }}></div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Prepared By</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #475569", width: "160px", marginBottom: "4px" }}></div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Verified By Adviser</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #475569", width: "180px", marginBottom: "4px" }}></div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#2C4B66" }}>Controller of Examinations</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; margin: 0; }
          .transcript-document { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
