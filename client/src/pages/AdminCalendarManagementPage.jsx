import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
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
  const [uploading, setUploading] = useState(false);

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

  // Strict Excel Parser & Validator
  const parseAcademicCalendarExcel = (matrix) => {
    if (!matrix || matrix.length < 7) {
      throw new Error("Invalid format! Sheet has insufficient rows.");
    }

    const row5Str = JSON.stringify(matrix[5] || []).toLowerCase();
    const row6Str = JSON.stringify(matrix[6] || []).toLowerCase();

    const isEventsPresent = row5Str.includes("events");
    const isHolidayPresent = row5Str.includes("holiday");
    const isDatePresent = row6Str.includes("date");
    const isActivitiesPresent = row6Str.includes("activities");

    if (!isEventsPresent || !isHolidayPresent || !isDatePresent || !isActivitiesPresent) {
      throw new Error("Invalid file format! Please download and use the official Academic Calendar Template.");
    }

    const university = matrix[0]?.[0] ? String(matrix[0][0]).trim() : "University of Frontier Technology, Bangladesh";
    const title = matrix[1]?.[0] ? String(matrix[1][0]).trim() : "B.Sc. Academic Calendar for the Semester: January 2026 and July 2026";
    const session = matrix[2]?.[0] ? String(matrix[2][0]).trim() : "Session: 2020-2021, 2021-2022, 2022-2023";
    const termHeader = matrix[3]?.[0] ? String(matrix[3][0]).trim() : "Term: January 2026";

    const events = [];
    const importantDates = [];
    const holidays = [];

    let currentLeftSection = "events";

    for (let r = 7; r < matrix.length; r++) {
      const row = matrix[r] || [];

      const colA = String(row[0] || "").trim();
      const colB = String(row[1] || "").trim();
      const colC = String(row[2] || "").trim();

      const colE = String(row[4] || "").trim();
      const colF = String(row[5] || "").trim();
      const colG = String(row[6] || "").trim();

      if (colA.toLowerCase().includes("important dates")) {
        currentLeftSection = "importantDates";
        continue;
      }

      if (colA.toUpperCase() === "DATE" && colC.toUpperCase() === "ACTIVITIES") {
        continue;
      }

      if (colA && colC) {
        if (currentLeftSection === "events") {
          events.push({ date: colA, duration: colB, activity: colC });
        } else {
          importantDates.push({ date: colA, duration: colB, activity: colC });
        }
      }

      if (colE && colG) {
        if (colE.toUpperCase() !== "DATE" && colG.toUpperCase() !== "EVENTS") {
          holidays.push({ date: colE, days: colF, event: colG });
        }
      }
    }

    return {
      university,
      title,
      session,
      termHeader,
      events: events.length > 0 ? events : DEFAULT_CALENDAR_DATA.events,
      importantDates: importantDates.length > 0 ? importantDates : DEFAULT_CALENDAR_DATA.importantDates,
      holidays: holidays.length > 0 ? holidays : DEFAULT_CALENDAR_DATA.holidays,
    };
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Processing calendar file...");

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

      if (isExcel) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const parsedData = parseAcademicCalendarExcel(matrix);

        const payload = {
          university: parsedData.university,
          title: parsedData.title,
          session: parsedData.session,
          termHeader: parsedData.termHeader,
          events: parsedData.events,
          importantDates: parsedData.importantDates,
          holidays: parsedData.holidays,
        };

        const res = await api.post("/service/calendar/published", payload);
        setPublishedCalendar(res.data.publishedCalendar);
        toast.success("Academic Calendar updated successfully from Excel!", { id: toastId });
      } else {
        // Upload PDF / Document File
        const formData = new FormData();
        formData.append("calendarFile", file);

        const uploadRes = await api.post("/service/calendar/upload-file", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const payload = {
          title: publishedCalendar?.title || DEFAULT_CALENDAR_DATA.title,
          session: publishedCalendar?.session || DEFAULT_CALENDAR_DATA.session,
          termHeader: publishedCalendar?.termHeader || DEFAULT_CALENDAR_DATA.termHeader,
          fileUrl: uploadRes.data.fileUrl,
          fileType: file.name.endsWith(".pdf") ? "pdf" : "image",
          events: publishedCalendar?.events || DEFAULT_CALENDAR_DATA.events,
          importantDates: publishedCalendar?.importantDates || DEFAULT_CALENDAR_DATA.importantDates,
          holidays: publishedCalendar?.holidays || DEFAULT_CALENDAR_DATA.holidays,
        };

        const res = await api.post("/service/calendar/published", payload);
        setPublishedCalendar(res.data.publishedCalendar);
        toast.success("Academic Calendar document published!", { id: toastId });
      }
    } catch (err) {
      toast.error(err.message || "Failed to parse/upload academic calendar.", { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownloadAcademicCalendarTemplate = () => {
    const templateAOA = [
      ["University of Frontier Technology, Bangladesh", "", "", "", "", "", ""],
      ["B.Sc. Academic Calendar for the Semester: January 2026 and July 2026", "", "", "", "", "", ""],
      ["Session: 2020-2021, 2021-2022, 2022-2023", "", "", "", "", "", ""],
      ["Term: January 2026", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["Events", "", "", "", "Holiday List", "", ""],
      ["DATE", "DURATION", "ACTIVITIES", "", "DATE", "DAYS", "EVENTS"],
      ["11 Apr to 13 June", "7 W", "Classes", "", "14 Apr, 2026", "1", "Bengali New Year's Day"],
      ["16 June to 30 June", "2 W", "Midterm Examination", "", "01 May, 2026", "0", "May day, *Buddha Purnima"],
      ["01 July to 22 Aug", "7 W", "Classes", "", "23 May to 03 Jun", "10", "*Eid al-Adha, Summer Vacation"],
      ["23 Aug to 25 Aug", "3 D", "Semester Final Preparatory Leave", "", "26 Jun, 2026", "0", "*Ashura"],
      ["29 Aug to 13 Sep", "2 W 1 D", "Final Examination", "", "26 July, 2026", "0", "University Day"],
      ["Important Dates", "", "", "", "", "", ""],
      ["DATE", "DURATION", "ACTIVITIES", "", "", "", ""],
      ["11 Apr to 17 Apr", "1 W", "Course offer", "", "05 Aug, 2026", "1", "July Mass Uprising Day"],
      ["18 Apr to 01 May", "2 W", "Registration without fine", "", "12 Aug, 2026", "1", "Akhiri Chahar Shambah"],
      ["02 May to 08 May", "1 W", "Registration with fine (as per rules) and Add/Drop without fine", "", "26 Aug, 2026", "1", "*Eid-e-Milad-un-Nabi (S)"],
      ["09 May to 15 May", "1 W", "Registration/Add/Drop with fine (as per policy) and with Approval of VC", "", "04 Sep, 2026", "0", "Janmashtami"],
      ["09 June to 15 June", "", "Midterm admit card", "", "24 Sep, 2026", "0", "*Fateha-e-Yazdaham"],
      ["20 July", "", "Submission of midterm exam result", "", "", "", ""],
      ["25 July", "", "Publication of midterm exam result", "", "", "", ""],
      ["25 Aug", "", "Publication of all results except final", "", "", "", ""],
      ["22 Aug to 28 Aug", "", "Final Exam admit card", "", "", "", ""],
      ["28 Sep", "", "Submission of final exam result", "", "", "", ""],
      ["30 Sep", "", "Publication of final exam result", "", "", "", ""],
      ["03 Oct", "", "Next semester class start", "", "", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateAOA);

    ws["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 48 },
      { wch: 4 },
      { wch: 20 },
      { wch: 8 },
      { wch: 38 },
    ];

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } },
      { s: { r: 5, c: 4 }, e: { r: 5, c: 6 } },
      { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Academic_Calendar");
    XLSX.writeFile(wb, "Academic_Calendar_Template.xlsx");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <div style={{ marginLeft: "260px", flex: 1, padding: "40px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #3B8DB3, #2C4B66)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <FiCalendar size={22} />
              </div>
              <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Academic Calendar Management</h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleDownloadAcademicCalendarTemplate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 18px",
                background: "#ffffff",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <FiUploadCloud style={{ transform: "rotate(180deg)" }} size={18} /> Download Template
            </button>

            <label
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
              <FiUploadCloud size={18} />
              <span>{uploading ? "Uploading..." : "Upload & Broadcast Calendar"}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Official Academic Calendar Card Display */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading academic calendar...</div>
        ) : (
          <OfficialAcademicCalendarCard
            customData={publishedCalendar}
            fileUrl={publishedCalendar?.fileUrl}
            isAdmin={true}
          />
        )}
      </div>
    </div>
  );
}
