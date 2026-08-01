const XLSX = require("xlsx");

// Create a test Excel workbook mimicking the user's Excel file in Image 1
const wsData = [
  ["", "Session: 2025 26", "", "", "", "Level: 1", "Term 2", "Course Code: ET 117", "Course Title: Instructional Design, Methodologies and Technologies", "", "Course Type: Theory", "Credit Hour: 3"],
  ["ID", "MT Part A", "MT Part B", "FT Part A", "FT Part B", "Attendance", "Continuous", "Total", "GPA"],
  ["2502001", 10, 9, "", "", "", "", 19, 0],
  ["2502002", 7, 12, "", "", "", "", 19, 0],
  ["2502003", 10, 10, "", "", "", "", 20, 0],
  ["2602001", 10, 9, "", "", "", "", 19, 0]
];

const ws = XLSX.utils.aoa_to_sheet(wsData);
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

let metaSession = "";
let metaLevel = "";
let metaTerm = "";
let metaCourseCode = "";
let metaCourseTitle = "";
let metaCourseType = "";
let metaCreditHours = null;

let headerRowIndex = -1;

for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
  const row = rawRows[r];
  if (!row || !Array.isArray(row)) continue;

  for (let c = 0; c < row.length; c++) {
    const cellVal = String(row[c] || "").trim();
    if (!cellVal) continue;
    const lower = cellVal.toLowerCase();

    // Session
    if (!metaSession && lower.includes("session")) {
      const m = cellVal.match(/session\s*:?\s*(\d{4}[-\s]\d{2,4})/i);
      if (m) {
        metaSession = m[1].replace(/\s+/, "-");
      } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
        const nextM = String(row[c + 1]).match(/(\d{4}[-\s]\d{2,4})/);
        if (nextM) metaSession = nextM[1].replace(/\s+/, "-");
      }
    }

    // Level
    if (!metaLevel && lower.includes("level")) {
      const m = cellVal.match(/level\s*:?\s*(\d+)/i);
      if (m) {
        metaLevel = m[1];
      } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
        const nextM = String(row[c + 1]).match(/(\d+)/);
        if (nextM) metaLevel = nextM[1];
      }
    }

    // Term
    if (!metaTerm && lower.includes("term")) {
      const m = cellVal.match(/term\s*:?\s*(\d+)/i);
      if (m) {
        metaTerm = m[1];
      } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
        const nextM = String(row[c + 1]).match(/(\d+)/);
        if (nextM) metaTerm = nextM[1];
      }
    }

    // Course Code
    if (!metaCourseCode && lower.includes("course code")) {
      if (lower.includes("course code:")) {
        const after = cellVal.split(/course code:\s*/i)[1] || "";
        const clean = after.split(/course title|course type|credit|level|term|dept|[\n,;]/i)[0]?.trim();
        if (clean) metaCourseCode = clean;
      }
      if (!metaCourseCode && row[c + 1] !== undefined && row[c + 1] !== null) {
        const nextVal = String(row[c + 1]).trim();
        if (nextVal && !nextVal.toLowerCase().includes("title")) {
          metaCourseCode = nextVal;
        }
      }
    }

    // Course Title
    if (!metaCourseTitle && lower.includes("course title")) {
      if (lower.includes("course title:")) {
        const after = cellVal.split(/course title:\s*/i)[1] || "";
        const clean = after.split(/course type|credit|level|term|dept|[\n,;]/i)[0]?.trim();
        if (clean) metaCourseTitle = clean;
      }
      if (!metaCourseTitle && row[c + 1] !== undefined && row[c + 1] !== null) {
        const nextVal = String(row[c + 1]).trim();
        if (nextVal) metaCourseTitle = nextVal;
      }
    }
  }

  const isHeaderRow = rawRows[r].some((c) => {
    const s = String(c).trim().toLowerCase();
    return s === "id" || s === "student id" || s === "mt part a" || s === "ft part a" || s === "course code";
  });

  if (isHeaderRow) {
    headerRowIndex = r;
    break;
  }
}

const levelDigit = (metaLevel || "").replace(/\D/g, "");
const termDigit = (metaTerm || "").replace(/\D/g, "");
const metaLevelTermCombined = (levelDigit && termDigit)
  ? `Level ${levelDigit} - Term ${termDigit}`
  : (levelDigit ? `Level ${levelDigit}` : (metaTerm ? `Term ${termDigit}` : ""));

console.log("Extracted Session:", metaSession);
console.log("Extracted Level:", metaLevel, "-> Digit:", levelDigit);
console.log("Extracted Term:", metaTerm, "-> Digit:", termDigit);
console.log("Extracted Combined Level-Term:", metaLevelTermCombined);
console.log("Extracted Course Code:", metaCourseCode);
console.log("Extracted Course Title:", metaCourseTitle);
