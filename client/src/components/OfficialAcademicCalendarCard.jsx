import React from "react";
import { FiDownload, FiFileText, FiCalendar, FiUploadCloud } from "react-icons/fi";

export const DEFAULT_CALENDAR_DATA = {
  university: "University of Frontier Technology, Bangladesh",
  title: "B.Sc. Academic Calendar for the Semester: January 2026 and July 2026",
  session: "Session: 2020-2021, 2021-2022, 2022-2023",
  termHeader: "Term: January 2026",

  events: [
    { date: "11 Apr to 13 June", duration: "7 W", activity: "Classes" },
    { date: "16 June to 30 June", duration: "2 W", activity: "Midterm Examination" },
    { date: "01 July to 22 Aug", duration: "7 W", activity: "Classes" },
    { date: "23 Aug to 25 Aug", duration: "3 D", activity: "Semester Final Preparatory Leave" },
    { date: "29 Aug to 13 Sep", duration: "2 W 1 D", activity: "Final Examination" },
  ],

  importantDates: [
    { date: "11 Apr to 17 Apr", duration: "1 W", activity: "Course offer" },
    { date: "18 Apr to 01 May", duration: "2 W", activity: "Registration without fine" },
    { date: "02 May to 08 May", duration: "1 W", activity: "Registration with fine (as per rules) and Add/Drop without fine" },
    { date: "09 May to 15 May", duration: "1 W", activity: "Registration/Add/Drop with fine (as per policy) and with Approval of VC" },
    { date: "09 June to 15 June", duration: "", activity: "Midterm admit card" },
    { date: "20 July", duration: "", activity: "Submission of midterm exam result" },
    { date: "25 July", duration: "", activity: "Publication of midterm exam result" },
    { date: "25 Aug", duration: "", activity: "Publication of all results except final" },
    { date: "22 Aug to 28 Aug", duration: "", activity: "Final Exam admit card" },
    { date: "28 Sep", duration: "", activity: "Submission of final exam result" },
    { date: "30 Sep", duration: "", activity: "Publication of final exam result" },
    { date: "03 Oct", duration: "", activity: "Next semester class start" },
  ],

  holidays: [
    { date: "14 Apr, 2026", days: "1", event: "Bengali New Year's Day" },
    { date: "01 May, 2026", days: "0", event: "May day, *Buddha Purnima" },
    { date: "23 May to 03 Jun", days: "10", event: "*Eid al-Adha, Summer Vacation" },
    { date: "26 Jun, 2026", days: "0", event: "*Ashura" },
    { date: "26 July, 2026", days: "0", event: "University Day" },
    { date: "05 Aug, 2026", days: "1", event: "July Mass Uprising Day" },
    { date: "12 Aug, 2026", days: "1", event: "Akhiri Chahar Shambah" },
    { date: "26 Aug, 2026", days: "1", event: "*Eid-e-Milad-un-Nabi (S)" },
    { date: "04 Sep, 2026", days: "0", event: "Janmashtami" },
    { date: "24 Sep, 2026", days: "0", event: "*Fateha-e-Yazdaham" },
  ],
};

export default function OfficialAcademicCalendarCard({ customData, fileUrl, onUploadClick, isAdmin }) {
  const data = customData || DEFAULT_CALENDAR_DATA;
  const eventsList = data.events?.length > 0 ? data.events : DEFAULT_CALENDAR_DATA.events;
  const importantDatesList = data.importantDates?.length > 0 ? data.importantDates : DEFAULT_CALENDAR_DATA.importantDates;
  const holidaysList = data.holidays?.length > 0 ? data.holidays : DEFAULT_CALENDAR_DATA.holidays;

  const handlePrint = () => {
    const cardEl = document.getElementById("official-academic-calendar-card");
    if (!cardEl) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=1050,height=850");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Calendar - University of Frontier Technology, Bangladesh</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif, system-ui;
              margin: 0;
              padding: 10px;
              background: #ffffff;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .no-print {
              display: none !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          ${cardEl.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      id="official-academic-calendar-card"
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        border: "1.5px solid #cbd5e1",
        fontFamily: "'Times New Roman', Times, serif, system-ui",
        color: "#000000",
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-academic-calendar-card,
          #official-academic-calendar-card * {
            visibility: visible !important;
          }
          #official-academic-calendar-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: 1.5px solid #000000 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* University Document Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: 700, letterSpacing: "0.5px" }}>
          {data.university || DEFAULT_CALENDAR_DATA.university}
        </h2>
        <h3 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700 }}>
          {data.title || DEFAULT_CALENDAR_DATA.title}
        </h3>
        <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600 }}>
          {data.session || DEFAULT_CALENDAR_DATA.session}
        </p>
        <div
          style={{
            display: "inline-block",
            borderTop: "1.5px solid #000000",
            borderBottom: "1.5px solid #000000",
            padding: "4px 32px",
            fontSize: "16px",
            fontWeight: 700,
            marginTop: "6px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {data.termHeader || DEFAULT_CALENDAR_DATA.termHeader}
        </div>
      </div>

      {/* Two Column Table Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", border: "1.5px solid #000000" }}>
        {/* LEFT COLUMN: Events & Important Dates */}
        <div style={{ borderRight: "1.5px solid #000000" }}>
          {/* Section 1: Events */}
          <div style={{ borderBottom: "1.5px solid #000000", background: "#ffffff" }}>
            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
                fontSize: "15px",
                padding: "6px",
                borderBottom: "1.5px solid #000000",
              }}
            >
              Events
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #000000", fontWeight: 700, textAlign: "center" }}>
                  <th style={{ padding: "5px", borderRight: "1px solid #000", width: "32%" }}>Date</th>
                  <th style={{ padding: "5px", borderRight: "1px solid #000", width: "20%" }}>Duration</th>
                  <th style={{ padding: "5px" }}>Activities</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #000000" }}>
                    <td style={{ padding: "5px 8px", borderRight: "1px solid #000", fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: "5px", borderRight: "1px solid #000", textAlign: "center" }}>{row.duration}</td>
                    <td style={{ padding: "5px 8px" }}>{row.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Important Dates */}
          <div>
            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
                fontSize: "15px",
                padding: "6px",
                borderBottom: "1.5px solid #000000",
              }}
            >
              Important Dates
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #000000", fontWeight: 700, textAlign: "center" }}>
                  <th style={{ padding: "5px", borderRight: "1px solid #000", width: "32%" }}>Date</th>
                  <th style={{ padding: "5px", borderRight: "1px solid #000", width: "20%" }}>Duration</th>
                  <th style={{ padding: "5px" }}>Activities</th>
                </tr>
              </thead>
              <tbody>
                {importantDatesList.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === importantDatesList.length - 1 ? "none" : "1px solid #000000" }}>
                    <td style={{ padding: "4px 8px", borderRight: "1px solid #000", fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: "4px", borderRight: "1px solid #000", textAlign: "center" }}>{row.duration}</td>
                    <td style={{ padding: "4px 8px" }}>{row.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Holiday List */}
        <div>
          <div
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: "15px",
              padding: "6px",
              borderBottom: "1.5px solid #000000",
            }}
          >
            Holiday List
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #000000", fontWeight: 700, textAlign: "center" }}>
                <th style={{ padding: "5px", borderRight: "1px solid #000", width: "32%" }}>Date</th>
                <th style={{ padding: "5px", borderRight: "1px solid #000", width: "16%" }}>Days</th>
                <th style={{ padding: "5px" }}>Events</th>
              </tr>
            </thead>
            <tbody>
              {holidaysList.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: idx === holidaysList.length - 1 ? "none" : "1px solid #000000" }}>
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #000", fontWeight: 600 }}>{row.date}</td>
                  <td style={{ padding: "4px", borderRight: "1px solid #000", textAlign: "center" }}>{row.days}</td>
                  <td style={{ padding: "4px 8px" }}>{row.event}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Action at Very Bottom of Card */}
      <div
        className="no-print"
        style={{
          marginTop: "24px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#3b8db3",
              color: "#ffffff",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(59, 141, 179, 0.25)",
            }}
          >
            <FiDownload size={18} /> Download Official Academic Calendar (PDF / File)
          </a>
        ) : (
          <button
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#3b8db3",
              color: "#ffffff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(59, 141, 179, 0.25)",
            }}
          >
            <FiDownload size={18} /> Download / Print Academic Calendar
          </button>
        )}
      </div>
    </div>
  );
}
