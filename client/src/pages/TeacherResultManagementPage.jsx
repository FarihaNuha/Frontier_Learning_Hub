import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiAward,
  FiUpload,
  FiFileText,
  FiSend,
  FiTrash2,
  FiEdit,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiDownload,
  FiEye,
  FiLayers,
  FiMessageSquare,
  FiSearch,
} from "react-icons/fi";
import TeacherSidebar from "../components/TeacherSidebar";
import "../styles/dashboard.css";

export default function TeacherResultManagementPage() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultTypeTab, setResultTypeTab] = useState("Midterm"); // "Midterm" or "Final"
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [updatingBatch, setUpdatingBatch] = useState(null);

  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [viewBatch, setViewBatch] = useState(null);
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [viewRequestsBatch, setViewRequestsBatch] = useState(null);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [editableRowMarks, setEditableRowMarks] = useState({});
  const [savingBatchMarks, setSavingBatchMarks] = useState(false);

  // Admin-set deadlines
  const [deadlines, setDeadlines] = useState({ midtermDeadline: null, finalDeadline: null });
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDeadlines = async () => {
    try {
      const res = await api.get("/results/teacher/deadlines");
      setDeadlines(res.data || {});
    } catch (err) {}
  };

  const fetchAssignedCourses = async () => {
    try {
      const res = await api.get("/courses/teacher-summary");
      setAssignedCourses(res.data.courses || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchDeadlines();
    fetchAssignedCourses();
  }, []);

  // Initialize editableRowMarks when viewBatch opens
  useEffect(() => {
    if (viewBatch && Array.isArray(viewBatch.results)) {
      const initMap = {};
      viewBatch.results.forEach((r) => {
        initMap[r._id] = {
          midPartA: r.midPartA ?? "",
          midPartB: r.midPartB ?? "",
          finalPartA: r.finalPartA ?? "",
          finalPartB: r.finalPartB ?? "",
          attendance: r.attendance ?? "",
          continuousAssessment: r.continuousAssessment ?? "",
          totalMarks: r.totalMarks ?? "",
        };
      });
      setEditableRowMarks(initMap);
    }
  }, [viewBatch]);

  const handleCellMarkChange = (resultId, field, val) => {
    setEditableRowMarks((prev) => {
      const existing = prev[resultId] || {};
      const updatedRow = { ...existing, [field]: val };

      // Calculate total marks live
      const midA = Number(field === "midPartA" ? val : updatedRow.midPartA) || 0;
      const midB = Number(field === "midPartB" ? val : updatedRow.midPartB) || 0;
      const ftA = Number(field === "finalPartA" ? val : updatedRow.finalPartA) || 0;
      const ftB = Number(field === "finalPartB" ? val : updatedRow.finalPartB) || 0;
      const att = Number(field === "attendance" ? val : updatedRow.attendance) || 0;
      const cont = Number(field === "continuousAssessment" ? val : updatedRow.continuousAssessment) || 0;
      updatedRow.totalMarks = midA + midB + ftA + ftB + att + cont;

      return {
        ...prev,
        [resultId]: updatedRow,
      };
    });
  };

  const handleSaveMarksheetChanges = async () => {
    if (!viewBatch) return;
    setSavingBatchMarks(true);

    try {
      const updatedResults = Object.keys(editableRowMarks).map((rId) => ({
        _id: rId,
        ...editableRowMarks[rId],
      }));

      await api.post("/results/teacher/batch-update-marks", {
        uploadId: viewBatch._id,
        updatedResults,
      });

      toast.success("Marksheet changes saved & updated successfully!");
      setViewBatch(null);
      fetchResults();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save marksheet changes.");
    } finally {
      setSavingBatchMarks(false);
    }
  };

  const fetchTeacherRequests = async () => {
    try {
      const res = await api.get("/results/teacher/correction-requests");
      setTeacherRequests(res.data.requests || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchTeacherRequests();
  }, []);

  const handleReplyStudentRequest = async (requestId, newStatus = "Replied") => {
    const text = replyTextMap[requestId] || "";
    try {
      await api.post(`/results/teacher/reply-correction-request/${requestId}`, {
        teacherReply: text,
        status: newStatus,
      });
      toast.success("Response sent to student!");
      fetchTeacherRequests();
    } catch (err) {
      toast.error("Failed to send reply.");
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/results/teacher?resultType=${resultTypeTab}`);
      setUploads(res.data.uploads || []);
    } catch (err) {
      toast.error("Failed to load result batches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [resultTypeTab]);

  // Download Fixed Excel Template matching exact user image layout
  const handleDownloadTemplate = () => {
    const isFinal = resultTypeTab === "Final";
    const wsData = isFinal ? [
      ["", "Session: 2022 23", "", "", "Level: 3 - Term 2", "", "", "Course Code: NEM 481", "Course Title: Computer Networking", "", "", "Course Type: Theory Credit Hours: 3"],
      ["ID", "MT Part A", "MT Part B", "FT Part A", "FT Part B", "Attendance", "Continuous", "Total", "CGPA"],
      ["2202001", 30, 21, 40, 40, 30, 50, 211, 3.25],
      ["2202002", 27, 25, 40, 40, 30, 50, 212, 3.25],
      ["2202003", 25, 26, 40, 40, 30, 50, 211, 3.25],
      ["2202022", 22, 18, 40, 40, 30, 50, 200, 4.00],
    ] : [
      ["", "Session: 2022-23", "Level: 3 - Term 2", "", "", "Course Code: ET 315", "", "Course Title: STEAM Education Design and Development", "", "Course Type: Theory", "", "Credit Hours: 3"],
      ["ID", "MT Part A", "MT Part B", "Attendance", "Continuous", "Total", "CGPA"],
      ["2202001", 29, 21, 10, 10, 70, ""],
      ["2202002", 27, 25, 10, 10, 72, ""],
      ["2202003", 25, 26, 10, 10, 71, ""],
      ["2202022", 22, 25, 10, 10, 67, ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${resultTypeTab}_Template`);
    XLSX.writeFile(wb, `Result_${resultTypeTab}_Image_Template.xlsx`);
  };

  // Handle Excel File Selection & Dual-Format Parsing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationErrors([]);
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        let metaSession = "";
        let metaLevelTerm = "";
        let metaCourseCode = "";
        let metaCourseTitle = "";
        let metaCourseType = "";
        let metaCreditHours = null;

        let headerRowIndex = -1;

        const isLabOrSessional = (type, title, code) => {
          const combined = `${type || ""} ${title || ""} ${code || ""}`.toLowerCase();
          return combined.includes("lab") || combined.includes("sessional") || combined.includes("practical");
        };

        // Scan top 5 rows for header metadata (e.g. "Session: 2022-23", "Course Code: ET 315")
        for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
          const rowStr = rawRows[r].map((cell) => String(cell)).join(" ");
          if (rowStr.toLowerCase().includes("session:") || rowStr.toLowerCase().includes("course code:") || rowStr.toLowerCase().includes("level:")) {
            rawRows[r].forEach((cell) => {
              const str = String(cell).trim();
              const lower = str.toLowerCase();
              if (lower.includes("session:")) metaSession = str.split(":")[1]?.trim() || "";
              if (lower.includes("level:")) metaLevelTerm = str.split(":")[1]?.trim() || "";
              if (lower.includes("course code:")) metaCourseCode = str.split(":")[1]?.trim() || "";
              if (lower.includes("course title:")) metaCourseTitle = str.split(":")[1]?.trim() || "";
              if (lower.includes("course type:")) metaCourseType = str.split(":")[1]?.trim() || "";
              if (lower.includes("credit hours:") || lower.includes("credit:")) {
                const parsedVal = Number(str.split(":")[1]?.trim());
                if (!isNaN(parsedVal) && parsedVal > 0) metaCreditHours = parsedVal;
              }
            });
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

        const isLabMeta = isLabOrSessional(metaCourseType, metaCourseTitle, metaCourseCode);
        if (metaCreditHours === null) {
          metaCreditHours = isLabMeta ? 1 : 3;
        }

        let mappedData = [];

        if (headerRowIndex !== -1) {
          const headers = rawRows[headerRowIndex].map((h) => String(h).trim());
          const dataRows = rawRows.slice(headerRowIndex + 1);

          mappedData = dataRows
            .filter((row) => row.some((cell) => String(cell).trim() !== ""))
            .map((row) => {
              const rowObj = {};
              headers.forEach((h, i) => {
                rowObj[h] = row[i] !== undefined ? row[i] : "";
              });

              const studentId = String(rowObj["ID"] || rowObj["Student ID"] || rowObj["studentId"] || "").trim();
              const courseCode = String(rowObj["Course Code"] || rowObj["courseCode"] || metaCourseCode || "ET 315").trim().toUpperCase();
              const courseTitle = String(rowObj["Course Title"] || rowObj["courseTitle"] || metaCourseTitle || "STEAM Education Design and Development").trim();
              const courseType = String(rowObj["Course Type"] || rowObj["courseType"] || metaCourseType || (isLabMeta ? "Lab" : "Theory")).trim();
              const session = String(rowObj["Session"] || rowObj["session"] || metaSession || "2022-23").trim();
              const levelTerm = String(rowObj["Level-Term"] || rowObj["Level"] || rowObj["levelTerm"] || metaLevelTerm || "Level 3 - Term 2").trim();

              const isLabRow = isLabOrSessional(courseType, courseTitle, courseCode);
              let creditHours = rowObj["Credit Hours"] !== undefined && rowObj["Credit Hours"] !== "" 
                ? Number(rowObj["Credit Hours"]) 
                : (isLabRow ? 1 : metaCreditHours);

              if (isLabRow && creditHours === 3 && (rowObj["Credit Hours"] === undefined || rowObj["Credit Hours"] === "")) {
                creditHours = 1;
              }

              const midPartA = rowObj["MT Part A"] !== undefined && rowObj["MT Part A"] !== "" ? rowObj["MT Part A"] : (rowObj["MT Part A Marks"] !== undefined ? rowObj["MT Part A Marks"] : rowObj["midPartA"]);
              const midPartB = rowObj["MT Part B"] !== undefined && rowObj["MT Part B"] !== "" ? rowObj["MT Part B"] : (rowObj["MT Part B Marks"] !== undefined ? rowObj["MT Part B Marks"] : rowObj["midPartB"]);
              
              const finalPartA = rowObj["FT Part A"] !== undefined && rowObj["FT Part A"] !== "" ? rowObj["FT Part A"] : (rowObj["FT Part A Marks"] !== undefined ? rowObj["FT Part A Marks"] : rowObj["finalPartA"]);
              const finalPartB = rowObj["FT Part B"] !== undefined && rowObj["FT Part B"] !== "" ? rowObj["FT Part B"] : (rowObj["FT Part B Marks"] !== undefined ? rowObj["FT Part B Marks"] : rowObj["finalPartB"]);

              const attendance = rowObj["Attendance"] !== undefined && rowObj["Attendance"] !== "" ? rowObj["Attendance"] : (rowObj["Attendanc"] !== undefined && rowObj["Attendanc"] !== "" ? rowObj["Attendanc"] : (rowObj["Attendance Marks"] !== undefined ? rowObj["Attendance Marks"] : rowObj["attendance"]));
              
              const continuousAssessment = rowObj["Continuous"] !== undefined && rowObj["Continuous"] !== "" ? rowObj["Continuous"] : (rowObj["Continous"] !== undefined && rowObj["Continous"] !== "" ? rowObj["Continous"] : (rowObj["Continous Assessment"] !== undefined && rowObj["Continous Assessment"] !== "" ? rowObj["Continous Assessment"] : (rowObj["Continuous Assessment"] !== undefined && rowObj["Continuous Assessment"] !== "" ? rowObj["Continuous Assessment"] : rowObj["continuousAssessment"])));
              
              const totalMarks = rowObj["Total"] !== undefined && rowObj["Total"] !== "" ? rowObj["Total"] : (rowObj["Total Marks"] !== undefined ? rowObj["Total Marks"] : rowObj["totalMarks"]);
              const gradePoint = rowObj["CGPA"] !== undefined && rowObj["CGPA"] !== "" ? rowObj["CGPA"] : (rowObj["GPA"] !== undefined ? rowObj["GPA"] : rowObj["gradePoint"]);

              return {
                studentId,
                session,
                levelTerm,
                courseCode,
                courseTitle,
                courseType,
                creditHours,
                midPartA,
                midPartB,
                finalPartA,
                finalPartB,
                attendance,
                continuousAssessment,
                totalMarks,
                letterGrade: String(gradePoint || "").trim().toUpperCase(),
                gradePoint,
              };
            });
        } else {
          // Flat sheet fallback
          const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
          mappedData = data.map((row) => {
            const courseCode = String(row["Course Code"] || row["courseCode"] || "").trim().toUpperCase();
            const courseTitle = String(row["Course Title"] || row["courseTitle"] || "").trim();
            const courseType = String(row["Course Type"] || row["courseType"] || "Theory").trim();
            const isLabRow = isLabOrSessional(courseType, courseTitle, courseCode);

            return {
              studentId: String(row["ID"] || row["Student ID"] || row["studentId"] || "").trim(),
              session: String(row["Session"] || row["session"] || "2023-24").trim(),
              levelTerm: String(row["Level-Term"] || row["Level"] || row["levelTerm"] || "").trim(),
              courseCode,
              courseTitle,
              courseType,
              creditHours: row["Credit Hours"] !== "" ? Number(row["Credit Hours"]) : (isLabRow ? 1 : 3),
              midPartA: row["MT Part A"] !== undefined ? row["MT Part A"] : row["midPartA"],
              midPartB: row["MT Part B"] !== undefined ? row["MT Part B"] : row["midPartB"],
              finalPartA: row["FT Part A"] !== undefined ? row["FT Part A"] : row["finalPartA"],
              finalPartB: row["FT Part B"] !== undefined ? row["FT Part B"] : row["finalPartB"],
              attendance: row["Attendance"] !== undefined ? row["Attendance"] : (row["Attendanc"] !== undefined ? row["Attendanc"] : row["attendance"]),
              continuousAssessment: row["Continuous"] !== undefined ? row["Continuous"] : (row["Continous"] !== undefined ? row["Continous"] : (row["Continous Assessment"] !== undefined ? row["Continous Assessment"] : row["continuousAssessment"])),
              totalMarks: row["Total"] !== undefined ? row["Total"] : row["totalMarks"],
              letterGrade: String(row["CGPA"] || row["GPA"] || "").trim().toUpperCase(),
              gradePoint: row["CGPA"] !== undefined ? row["CGPA"] : row["gradePoint"],
            };
          });
        }

        setParsedData(mappedData);
      } catch (err) {
        toast.error("Failed to parse Excel file. Please ensure it is a valid spreadsheet.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Upload Draft to Backend
  const handleUploadSubmit = async () => {
    if (parsedData.length === 0) {
      toast.error("No valid data parsed from Excel file.");
      return;
    }

    setUploading(true);
    setValidationErrors([]);

    try {
      await api.post("/results/upload", {
        results: parsedData,
        resultType: resultTypeTab,
        uploadId: updatingBatch?._id || undefined,
      });
      toast.success(`${resultTypeTab} Result Excel ${updatingBatch ? "updated" : "uploaded"} successfully as Draft!`);
      setShowUploadModal(false);
      setSelectedFile(null);
      setParsedData([]);
      setUpdatingBatch(null);
      fetchResults();
    } catch (err) {
      if (err.response?.data?.validationErrors) {
        setValidationErrors(err.response.data.validationErrors);
      } else {
        toast.error(err.response?.data?.error || "Upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitToAdmin = async (batch) => {
    const isMid = (typeof batch === "object" ? batch.resultType : resultTypeTab) === "Midterm";
    const batchId = typeof batch === "object" ? batch._id : batch;
    const confirmMsg = isMid
      ? "Publish this Midterm result marksheet directly to Students? Students will be able to view their marks on their dashboard immediately."
      : "Submit this Final result batch to Admin for verification? Admin will calculate GPAs and schedule publication.";

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.post(`/results/submit/${batchId}`);
      toast.success(res.data.message || (isMid ? "Midterm results published directly to Students!" : "Results submitted to Admin!"));
      fetchResults();
    } catch (err) {
      toast.error(err.response?.data?.error || "Submission failed.");
    }
  };

  const handleDeleteBatch = async (uploadId) => {
    if (!window.confirm("Delete this draft result batch?")) return;

    try {
      await api.delete(`/results/draft-batch/${uploadId}`);
      toast.success("Draft result batch deleted.");
      fetchResults();
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const [timerValues, setTimerValues] = useState({});

  const formatForDateTimeInput = (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleTimerChange = (batchId, val) => {
    setTimerValues((prev) => ({ ...prev, [batchId]: val }));
  };

  const handleSaveTimer = (batchId) => {
    const val = timerValues[batchId];
    if (val === undefined) return;
    handleSetCorrectionDeadline(batchId, val);
  };

  const handleSetCorrectionDeadline = async (uploadId, deadlineVal) => {
    try {
      const res = await api.post(`/results/teacher/set-correction-deadline/${uploadId}`, {
        correctionWindowEnd: deadlineVal,
      });
      toast.success(res.data.message);
      fetchResults();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to set deadline.");
    }
  };

  const normalizeCode = (c) => String(c || "").replace(/\s+/g, "").toUpperCase();
  const extractDigit = (s) => { const m = String(s || "").match(/(\d+)/); return m ? m[1] : ""; };

  // Combine uploads with assignedCourses to automatically generate cards for unuploaded assigned courses
  const existingUploadKeys = new Set();
  uploads.forEach((u) => {
    const code = normalizeCode(u.courseCode);
    const sess = String(u.session || "").trim();
    const ldig = extractDigit(u.level);
    const tdig = extractDigit(u.term);
    if (code) {
      existingUploadKeys.add(`${code}_${sess}_${ldig}_${tdig}`);
    }
  });

  const combinedBatches = [...uploads];
  assignedCourses.forEach((ac) => {
    const rawCode = ac.displayCode || ac.courseCode || ac.name || ac.courseTitle || "";
    const code = normalizeCode(rawCode);
    const sess = String(ac.session || "2023-24").trim();

    const ltParts = (ac.levelTerm || "").split(/\s*-\s*/);
    const rawLevel = ac.level || ltParts[0] || "Level 1";
    const rawTerm = ac.term || ltParts[1] || "Term 1";

    const ldig = extractDigit(rawLevel);
    const tdig = extractDigit(rawTerm);
    const key = `${code}_${sess}_${ldig}_${tdig}`;

    if (code && !existingUploadKeys.has(key)) {
      existingUploadKeys.add(key);
      combinedBatches.push({
        _id: `auto_${code}_${sess}_${ldig}_${tdig}`,
        isAutoCard: true,
        courseCode: ac.displayCode || ac.courseCode || code,
        courseTitle: ac.name || ac.courseTitle || ac.displayCode || "Course",
        department: ac.department || "EDTE",
        session: sess,
        level: rawLevel,
        term: rawTerm,
        totalRecords: 0,
        resultType: resultTypeTab,
        status: "Pending Upload",
        results: [],
      });
    }
  });

  const filteredUploads = combinedBatches.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (u.courseCode   || "").toLowerCase().includes(q) ||
      (u.courseTitle  || "").toLowerCase().includes(q) ||
      (u.session      || "").toLowerCase().includes(q) ||
      (u.level        || "").toLowerCase().includes(q) ||
      (u.term         || "").toLowerCase().includes(q)
    );
  });

  const matchingSuggestions = searchQuery.trim()
    ? combinedBatches
        .filter((u) => {
          const q = searchQuery.trim().toLowerCase();
          return (
            (u.courseCode   || "").toLowerCase().includes(q) ||
            (u.courseTitle  || "").toLowerCase().includes(q) ||
            (u.session      || "").toLowerCase().includes(q) ||
            (u.level        || "").toLowerCase().includes(q) ||
            (u.term         || "").toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          const q = searchQuery.trim().toLowerCase();
          const aCodeStart  = (a.courseCode  || "").toLowerCase().startsWith(q);
          const bCodeStart  = (b.courseCode  || "").toLowerCase().startsWith(q);
          const aTitleStart = (a.courseTitle || "").toLowerCase().startsWith(q);
          const bTitleStart = (b.courseTitle || "").toLowerCase().startsWith(q);
          if ((aCodeStart || aTitleStart) && !(bCodeStart || bTitleStart)) return -1;
          if (!(aCodeStart || aTitleStart) && (bCodeStart || bTitleStart)) return 1;
          return 0;
        })
    : [];

  const formatLevel = (lvl) => {
    if (!lvl) return "Level 1";
    const str = String(lvl).trim();
    return /^level/i.test(str) ? str : `Level ${str}`;
  };

  const formatTerm = (t) => {
    if (!t) return "Term 1";
    const str = String(t).trim();
    return /^term/i.test(str) ? str : `Term ${str}`;
  };

  const getSectionDeadline = (session, level, term) => {
    const cardSess = String(session || "").trim();
    const cardLdig = extractDigit(level);
    const cardTdig = extractDigit(term);

    const all = deadlines.allDeadlines || [];
    const match = all.find((n) => {
      const typeMatch = !n.resultDeadlineType || n.resultDeadlineType === resultTypeTab || (n.title || "").includes(resultTypeTab);
      if (!typeMatch) return false;

      const nSess = String(n.session || "").trim();
      const nTitleContent = `${n.title || ""} ${n.content || ""}`;

      if (nSess) {
        if (nSess !== cardSess) return false;
      } else if (cardSess && !nTitleContent.includes(cardSess)) {
        return false;
      }

      const nLdig = extractDigit(n.level) || extractDigit((nTitleContent.match(/level[-_\s]*\d+/i) || [])[0]);
      if (nLdig && cardLdig && nLdig !== cardLdig) return false;

      const nTdig = extractDigit(n.term) || extractDigit((nTitleContent.match(/term[-_\s]*\d+/i) || [])[0]);
      if (nTdig && cardTdig && nTdig !== cardTdig) return false;

      return true;
    });

    if (match) return match;

    const singleDl = resultTypeTab === "Midterm" ? deadlines.midtermDeadline : deadlines.finalDeadline;
    if (singleDl) {
      const sSess = String(singleDl.session || "").trim();
      const sTitleContent = `${singleDl.title || ""} ${singleDl.content || ""}`;
      const sLdig = extractDigit(singleDl.level) || extractDigit((sTitleContent.match(/level[-_\s]*\d+/i) || [])[0]);
      const sTdig = extractDigit(singleDl.term) || extractDigit((sTitleContent.match(/term[-_\s]*\d+/i) || [])[0]);

      const sessMatches = sSess ? sSess === cardSess : sTitleContent.includes(cardSess);
      const levelMatches = sLdig ? sLdig === cardLdig : sTitleContent.toLowerCase().includes(`level-${cardLdig}`) || sTitleContent.toLowerCase().includes(`level ${cardLdig}`);
      const termMatches = sTdig ? sTdig === cardTdig : sTitleContent.toLowerCase().includes(`term-${cardTdig}`) || sTitleContent.toLowerCase().includes(`term ${cardTdig}`);

      if (sessMatches && levelMatches && termMatches) {
        return singleDl;
      }
    }

    return null;
  };

  // Group uploads into sections by Department, Session, and Level-Term (like Assessment Marksheet)
  const groupedSections = {};
  filteredUploads.forEach((up) => {
    const key = `${up.department || "EDTE"} • Session ${up.session} • ${formatLevel(up.level)} ${formatTerm(up.term)}`;
    if (!groupedSections[key]) {
      groupedSections[key] = [];
    }
    groupedSections[key].push(up);
  });

  const activeDl = resultTypeTab === "Midterm" ? deadlines.midtermDeadline : deadlines.finalDeadline;
  const dlDate = activeDl?.deadlineDate ? new Date(activeDl.deadlineDate) : null;
  const isAdminDeadlinePassed = Boolean(dlDate && dlDate < new Date());

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <TeacherSidebar currentPage="results" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
                <FiAward size={22} />
              </div>
              <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
                Result Publication Portal
              </h1>
            </div>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
              Upload course results via fixed Excel format for Mid Term & Final examinations, grouped automatically by Dept, Session, and Level-Term.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* Exact Shape Search Bar - SVG socket notch pill from CourseListPage */}
            <div ref={searchRef} style={{ position: "relative", width: "300px" }}>
              <div style={{ position: "relative", width: "300px", height: "50px" }}>
                <svg
                  width="300" height="50"
                  viewBox="0 0 300 50"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: "100%", height: "100%",
                    pointerEvents: "none",
                    filter: "drop-shadow(0 3px 10px rgba(59,141,179,0.2))",
                  }}
                >
                  <path
                    d="M 8 8
                       C 8 20, 16 32, 30 36
                       C 44 40, 54 30, 56 16
                       C 57 9, 64 6, 72 6
                       L 278 6
                       C 290 6, 297 14, 297 25
                       C 297 36, 290 44, 278 44
                       L 22 44
                       C 10 44, 3 36, 3 25
                       C 3 16, 5 10, 8 8 Z"
                    fill="#F3F4F6"
                    stroke="#3B8DB3"
                    strokeWidth="2"
                  />
                </svg>

                {/* Badge sitting in the socket notch */}
                <div
                  style={{
                    position: "absolute",
                    top: "6px",
                    left: "8px",
                    width: "48px",
                    height: "36px",
                    borderRadius: "0 0 24px 24px",
                    background: "linear-gradient(160deg, #7EC8E3 0%, #3B8DB3 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    zIndex: 2,
                    boxShadow: "0 3px 8px rgba(59,141,179,0.3)",
                  }}
                >
                  <FiSearch size={17} />
                </div>

                {/* Input field */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search course or code..."
                  className="search-pill-input"
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 2,
                    border: "none", outline: "none",
                    background: "transparent",
                    paddingLeft: "68px",
                    paddingRight: searchQuery ? "36px" : "16px",
                    fontSize: "13.5px",
                    color: "#1A4F6E",
                    fontWeight: 500,
                    borderRadius: "24px",
                  }}
                />

                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
                    style={{
                      position: "absolute", right: "12px",
                      top: "50%", transform: "translateY(-50%)",
                      zIndex: 3, border: "none", background: "none",
                      cursor: "pointer",
                      color: "#3B8DB3",
                      display: "flex", alignItems: "center", padding: "4px",
                    }}
                    title="Clear search"
                  >
                    <FiX size={15} />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim().length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "300px",
                    background: "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0 10px 28px rgba(44, 75, 102, 0.16)",
                    border: "1.5px solid #E8F4FD",
                    zIndex: 1000,
                    maxHeight: "280px",
                    overflowY: "auto",
                    padding: "6px",
                  }}
                >
                  {matchingSuggestions.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: "13px", color: "#6B89A0", textAlign: "center" }}>
                      No matching batches found
                    </div>
                  ) : (
                    matchingSuggestions.map((batch) => (
                      <div
                        key={batch._id}
                        onClick={() => {
                          setSearchQuery(batch.courseCode || batch.courseTitle);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justify: "space-between",
                          gap: "8px",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#E8F4FD")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#2C4B66", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {batch.courseTitle}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6B89A0", marginTop: "2px" }}>
                            {batch.courseCode} {batch.session ? `• ${batch.session}` : ""}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#3B8DB3",
                            background: "rgba(59, 141, 179, 0.1)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {batch.level ? `L${batch.level}` : ""} {batch.term ? `T${batch.term}` : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadTemplate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#ffffff",
                color: "#3b8db3",
                border: "1.5px solid #3b8db3",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              <FiDownload size={16} /> Fixed Excel Template
            </button>
          </div>
        </div>

        {/* Primary Tabs: Mid Term Result vs Final Result */}
        <div style={{ display: "flex", gap: "12px", background: "#ffffff", padding: "6px", borderRadius: "12px", border: "1px solid #cbd5e1", width: "fit-content", marginBottom: "24px" }}>
          <button
            onClick={() => setResultTypeTab("Midterm")}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: resultTypeTab === "Midterm" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: resultTypeTab === "Midterm" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Mid Term Result
          </button>
          <button
            onClick={() => setResultTypeTab("Final")}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: resultTypeTab === "Final" ? "linear-gradient(135deg, #3b8db3, #2C4B66)" : "transparent",
              color: resultTypeTab === "Final" ? "#ffffff" : "#64748b",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Final Result
          </button>
        </div>

        {/* Grouped Department, Session, Level-Term Card Sections */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading result batches...</div>
        ) : Object.keys(groupedSections).length === 0 ? (
          <div style={{ padding: "60px", background: "#ffffff", borderRadius: "14px", textAlign: "center", color: "#94a3b8" }}>
            <FiAward size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3>No {resultTypeTab} result batches found</h3>
            <p style={{ fontSize: "14px", margin: 0 }}>
              {searchQuery ? `No batches matching "${searchQuery}"` : `No assigned courses or result batches found.`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {Object.entries(groupedSections).map(([sectionTitle, sectionBatches]) => {
              const sampleBatch = sectionBatches[0] || {};
              const sectionDl = getSectionDeadline(sampleBatch.session, sampleBatch.level, sampleBatch.term);
              const secDlDate = sectionDl?.deadlineDate ? new Date(sectionDl.deadlineDate) : null;
              const isSecDlPassed = Boolean(secDlDate && secDlDate < new Date());

              return (
                <div key={sectionTitle} style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
                  {/* Section Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "16px", marginBottom: "20px", borderBottom: "2px solid #e0f2fe" }}>
                    <FiLayers size={20} color="#3b8db3" />
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>{sectionTitle}</h3>
                    <span style={{ marginLeft: "auto", background: "#e0f2fe", color: "#0369a1", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", fontSize: "12px" }}>
                      {sectionBatches.length} Course Batches
                    </span>
                  </div>

                  {/* Targeted Section Deadline Notice Banner (Appears ONLY on matching section) */}
                  {sectionDl && (() => {
                    const now = new Date();
                    const isExpired = secDlDate && secDlDate < now;
                    const msLeft = secDlDate ? secDlDate - now : null;
                    const daysLeft = msLeft ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : null;
                    const hoursLeft = msLeft ? Math.ceil(msLeft / (1000 * 60 * 60)) : null;

                    const timeLabel = isExpired
                      ? "⛔ Deadline Passed"
                      : daysLeft > 1
                        ? `⏳ ${daysLeft} days remaining`
                        : hoursLeft > 0
                          ? `🔴 Only ${hoursLeft} hours left!`
                          : "🔴 Less than 1 hour remaining!";

                    return (
                      <div style={{
                        background: isExpired ? "linear-gradient(135deg, #fee2e2, #fecaca)" : daysLeft <= 2 ? "linear-gradient(135deg, #fef3c7, #fde68a)" : "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                        border: `1.5px solid ${isExpired ? "#fca5a5" : daysLeft <= 2 ? "#f59e0b" : "#3b8db3"}`,
                        borderRadius: "12px",
                        padding: "16px 20px",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                      }}>
                        <div style={{ fontSize: "28px", lineHeight: 1 }}>📋</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <strong style={{ fontSize: "14.5px", color: isExpired ? "#991b1b" : daysLeft <= 2 ? "#92400e" : "#0369a1" }}>
                              {sectionDl.title}
                            </strong>
                            <span style={{
                              padding: "3px 10px", borderRadius: "8px", fontWeight: 700, fontSize: "12px",
                              background: isExpired ? "#dc2626" : daysLeft <= 2 ? "#f59e0b" : "#3b8db3",
                              color: "#fff"
                            }}>
                              {timeLabel}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#475569" }}>{sectionDl.content}</p>
                          {secDlDate && (
                            <p style={{ margin: "6px 0 0 0", fontSize: "12.5px", fontWeight: 700, color: isExpired ? "#dc2626" : "#0369a1" }}>
                              🗓️ Deadline: {secDlDate.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Course Cards Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                    {sectionBatches.map((batch) => (
                      <div
                        key={batch._id}
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "20px",
                          border: batch.status === "Correction Requested" ? "1.5px solid #f87171" : "1px solid #e2e8f0",
                          display: "flex",
                          flexDirection: "column",
                          justify: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", fontSize: "12.5px" }}>
                              {batch.courseCode}
                            </span>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontWeight: 700,
                                fontSize: "11.5px",
                                background:
                                  batch.status === "Published" ? "#dcfce7" :
                                  batch.status === "Verified" ? "#e0f2fe" :
                                  batch.status === "Submitted" ? "#fef3c7" :
                                  batch.status === "Correction Requested" ? "#fee2e2" :
                                  batch.isAutoCard ? "#f1f5f9" : "#f1f5f9",
                                color:
                                  batch.status === "Published" ? "#166534" :
                                  batch.status === "Verified" ? "#0369a1" :
                                  batch.status === "Submitted" ? "#b45309" :
                                  batch.status === "Correction Requested" ? "#991b1b" : "#64748b",
                              }}
                            >
                              {batch.isAutoCard ? "Pending Upload" : (batch.resultType === "Midterm" && batch.status === "Published" ? "Published (Direct to Students)" : batch.status)}
                            </span>
                          </div>

                          <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>{batch.courseTitle}</h4>
                          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
                            Records: <strong>{batch.totalRecords || 0} Students</strong> • Type: <strong>{batch.resultType || resultTypeTab}</strong>
                          </div>

                          {!batch.isAutoCard && batch.resultType === "Midterm" && (
                            <div style={{
                              marginTop: "10px",
                              background: batch.correctionWindowEnd && new Date() > new Date(batch.correctionWindowEnd) ? "#fef2f2" : "#f0f9ff",
                              border: `1px solid ${batch.correctionWindowEnd && new Date() > new Date(batch.correctionWindowEnd) ? "#fca5a5" : "#bae6fd"}`,
                              padding: "10px 12px",
                              borderRadius: "8px",
                              fontSize: "12px"
                            }}>
                              <div style={{ fontWeight: 700, color: batch.correctionWindowEnd && new Date() > new Date(batch.correctionWindowEnd) ? "#dc2626" : "#0369a1", marginBottom: "6px" }}>
                                {batch.correctionWindowEnd && new Date() > new Date(batch.correctionWindowEnd)
                                  ? `🔒 Marksheet Locked (Expired on: ${new Date(batch.correctionWindowEnd).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })})`
                                  : batch.correctionWindowEnd
                                  ? `🔓 Open for Student Corrections until: ${new Date(batch.correctionWindowEnd).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
                                  : "🔓 Open for Student Corrections (No Deadline Set)"}
                              </div>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "6px" }}>
                                <input
                                  type="datetime-local"
                                  value={timerValues[batch._id] || formatForDateTimeInput(batch.correctionWindowEnd) || ""}
                                  onChange={(e) => handleTimerChange(batch._id, e.target.value)}
                                  style={{ padding: "5px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", background: "#ffffff" }}
                                />
                                <button
                                  onClick={() => handleSaveTimer(batch._id)}
                                  style={{ padding: "5px 12px", background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "11.5px", cursor: "pointer" }}
                                >
                                  Save Timer
                                </button>
                                {batch.correctionWindowEnd && (
                                  <button
                                    onClick={() => handleSetCorrectionDeadline(batch._id, null)}
                                    style={{ padding: "5px 10px", background: "#ffffff", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "6px", fontWeight: 600, fontSize: "11.5px", cursor: "pointer" }}
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {batch.status === "Correction Requested" && batch.correctionComment && (
                            <div style={{ background: "#fef2f2", borderLeft: "3px solid #ef4444", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", color: "#991b1b", marginBottom: "12px" }}>
                              <strong>Correction Note:</strong> {batch.correctionComment}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap", alignItems: "center" }}>
                          {!batch.isAutoCard && (batch.status === "Draft" || batch.status === "Correction Requested") && (
                            <button
                              onClick={() => handleSubmitToAdmin(batch)}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                            >
                              <FiSend size={13} /> {batch.resultType === "Midterm" ? "Publish to Students" : "Submit"}
                            </button>
                          )}

                          {!batch.isAutoCard && batch.resultType === "Midterm" && (
                            <button
                              onClick={() => setViewRequestsBatch(batch)}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 12px", background: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                            >
                              <FiMessageSquare size={13} />
                              Student Issues ({teacherRequests.filter((r) => r.uploadId === batch._id || (r.courseCode === batch.courseCode && r.status !== "Resolved")).length})
                            </button>
                          )}

                          {/* Per-Card Excel Upload / Update Button (Locked if section deadline passed) */}
                          <button
                            onClick={() => {
                              if (isSecDlPassed) {
                                toast.error("Submission deadline has passed. Marksheets cannot be uploaded or modified.");
                                return;
                              }
                              setUpdatingBatch(batch.isAutoCard ? null : batch);
                              setShowUploadModal(true);
                            }}
                            disabled={isSecDlPassed}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              padding: "8px 12px",
                              background: isSecDlPassed ? "#e2e8f0" : "#3b8db3",
                              color: isSecDlPassed ? "#94a3b8" : "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: 600,
                              fontSize: "12px",
                              cursor: isSecDlPassed ? "not-allowed" : "pointer",
                            }}
                            title={isSecDlPassed ? "Submission deadline passed. Uploads locked." : batch.isAutoCard ? "Upload Excel marksheet" : "Re-upload Excel to update marksheet"}
                          >
                            <FiUpload size={13} /> {isSecDlPassed ? "Upload Locked 🔒" : batch.isAutoCard ? "Upload Excel" : "Update Marksheet"}
                          </button>

                          <button
                            onClick={() => {
                              if (batch.isAutoCard) {
                                toast("No marksheet uploaded yet for this course.");
                                return;
                              }
                              setViewBatch(viewBatch?._id === batch._id ? null : batch);
                            }}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "8px 12px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                          >
                            <FiEye size={13} /> View Marksheet
                          </button>

                          {!batch.isAutoCard && (
                            <button
                              onClick={() => {
                                if (isSecDlPassed) {
                                  toast.error("Submission deadline has passed. Marksheets cannot be deleted.");
                                  return;
                                }
                                handleDeleteBatch(batch._id);
                              }}
                              disabled={isSecDlPassed}
                              style={{
                                padding: "8px 10px",
                                background: isSecDlPassed ? "#f1f5f9" : "#fee2e2",
                                color: isSecDlPassed ? "#cbd5e1" : "#ef4444",
                                border: "none",
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "12px",
                                cursor: isSecDlPassed ? "not-allowed" : "pointer",
                              }}
                              title={isSecDlPassed ? "Submission deadline passed. Deletion locked." : "Delete Marksheet Batch"}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Marksheet Large Pop-Up Modal */}
        {viewBatch && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.65)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <div style={{ background: "#ffffff", borderRadius: "18px", padding: "32px", maxWidth: "1050px", width: "95%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "2px solid #e0f2fe", paddingBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ background: "#0284c7", color: "#ffffff", fontWeight: 800, padding: "4px 12px", borderRadius: "8px", fontSize: "14px" }}>
                      {viewBatch.courseCode}
                    </span>
                    <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px", fontWeight: 700 }}>
                      {viewBatch.courseTitle}
                    </h2>
                    <span style={{ background: isAdminDeadlinePassed ? "#fee2e2" : (viewBatch.resultType === "Midterm" ? "#e0f2fe" : "#fef3c7"), color: isAdminDeadlinePassed ? "#991b1b" : (viewBatch.resultType === "Midterm" ? "#0369a1" : "#b45309"), fontWeight: 700, padding: "4px 12px", borderRadius: "20px", fontSize: "12.5px" }}>
                      {isAdminDeadlinePassed ? "🔒 Editing Locked (Deadline Passed)" : `${viewBatch.resultType || "Result"} Marksheet (Editable)`}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Department: <strong>{viewBatch.department || "EDTE"}</strong> • Session: <strong>{viewBatch.session}</strong> • Level-Term: <strong>{formatLevel(viewBatch.level)} {formatTerm(viewBatch.term)}</strong> • Total Students: <strong>{viewBatch.totalRecords}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={() => {
                      if (isAdminDeadlinePassed) {
                        toast.error("Submission deadline has passed. Marksheet edits are locked.");
                        return;
                      }
                      handleSaveMarksheetChanges();
                    }}
                    disabled={savingBatchMarks || isAdminDeadlinePassed}
                    style={{
                      padding: "8px 18px",
                      background: isAdminDeadlinePassed ? "#cbd5e1" : "#16a34a",
                      color: isAdminDeadlinePassed ? "#94a3b8" : "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: (savingBatchMarks || isAdminDeadlinePassed) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FiCheckCircle size={15} /> {isAdminDeadlinePassed ? "Editing Locked" : savingBatchMarks ? "Saving..." : "Save Marksheet Changes"}
                  </button>
                  <div
                    onClick={() => setViewBatch(null)}
                    style={{ background: "#f1f5f9", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}
                  >
                    <FiX size={20} />
                  </div>
                </div>
              </div>

              {/* Marksheet Table with Inline Direct Editing */}
              <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 10 }}>
                    <tr style={{ color: "#334155", fontWeight: 700, borderBottom: "2px solid #cbd5e1" }}>
                      <th style={{ padding: "12px" }}>Student ID</th>
                      <th style={{ padding: "12px" }}>Student Name</th>
                      <th style={{ padding: "12px" }}>MT Part A</th>
                      <th style={{ padding: "12px" }}>MT Part B</th>
                      {viewBatch.resultType === "Final" && <th style={{ padding: "12px" }}>FT Part A</th>}
                      {viewBatch.resultType === "Final" && <th style={{ padding: "12px" }}>FT Part B</th>}
                      <th style={{ padding: "12px" }}>Attendance</th>
                      <th style={{ padding: "12px" }}>Cont. Assessment</th>
                      <th style={{ padding: "12px" }}>Total Marks</th>
                      <th style={{ padding: "12px" }}>Grade / GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewBatch.results || []).map((r, idx) => {
                      const rowData = editableRowMarks[r._id] || {};
                      return (
                        <tr key={r._id || idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0284c7" }}>{r.studentId}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>{r.studentName}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              value={rowData.midPartA ?? ""}
                              onChange={(e) => !isAdminDeadlinePassed && handleCellMarkChange(r._id, "midPartA", e.target.value)}
                              readOnly={isAdminDeadlinePassed}
                              disabled={isAdminDeadlinePassed}
                              style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, background: isAdminDeadlinePassed ? "#f1f5f9" : "#fff", cursor: isAdminDeadlinePassed ? "not-allowed" : "auto" }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              value={rowData.midPartB ?? ""}
                              onChange={(e) => !isAdminDeadlinePassed && handleCellMarkChange(r._id, "midPartB", e.target.value)}
                              readOnly={isAdminDeadlinePassed}
                              disabled={isAdminDeadlinePassed}
                              style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, background: isAdminDeadlinePassed ? "#f1f5f9" : "#fff", cursor: isAdminDeadlinePassed ? "not-allowed" : "auto" }}
                            />
                          </td>
                          {viewBatch.resultType === "Final" && (
                            <td style={{ padding: "8px 12px" }}>
                              <input
                                type="number"
                                value={rowData.finalPartA ?? ""}
                                onChange={(e) => !isAdminDeadlinePassed && handleCellMarkChange(r._id, "finalPartA", e.target.value)}
                                readOnly={isAdminDeadlinePassed}
                                disabled={isAdminDeadlinePassed}
                                style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, background: isAdminDeadlinePassed ? "#f1f5f9" : "#fff", cursor: isAdminDeadlinePassed ? "not-allowed" : "auto" }}
                              />
                            </td>
                          )}
                          {viewBatch.resultType === "Final" && (
                            <td style={{ padding: "8px 12px" }}>
                              <input
                                type="number"
                                value={rowData.finalPartB ?? ""}
                                onChange={(e) => !isAdminDeadlinePassed && handleCellMarkChange(r._id, "finalPartB", e.target.value)}
                                readOnly={isAdminDeadlinePassed}
                                disabled={isAdminDeadlinePassed}
                                style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, background: isAdminDeadlinePassed ? "#f1f5f9" : "#fff", cursor: isAdminDeadlinePassed ? "not-allowed" : "auto" }}
                              />
                            </td>
                          )}
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              value={rowData.attendance ?? ""}
                              onChange={(e) => !isAdminDeadlinePassed && handleCellMarkChange(r._id, "attendance", e.target.value)}
                              readOnly={isAdminDeadlinePassed}
                              disabled={isAdminDeadlinePassed}
                              style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, background: isAdminDeadlinePassed ? "#f1f5f9" : "#fff", cursor: isAdminDeadlinePassed ? "not-allowed" : "auto" }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              value={rowData.continuousAssessment ?? ""}
                              onChange={(e) => !isAdminDeadlinePassed && handleCellMarkChange(r._id, "continuousAssessment", e.target.value)}
                              readOnly={isAdminDeadlinePassed}
                              disabled={isAdminDeadlinePassed}
                              style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", fontWeight: 600, background: isAdminDeadlinePassed ? "#f1f5f9" : "#fff", cursor: isAdminDeadlinePassed ? "not-allowed" : "auto" }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                            {rowData.totalMarks ?? r.totalMarks ?? "-"}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16a34a" }}>
                            {r.gradePoint ?? r.letterGrade ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12.5px", color: isAdminDeadlinePassed ? "#dc2626" : "#64748b", fontWeight: isAdminDeadlinePassed ? 600 : 400 }}>
                  {isAdminDeadlinePassed
                    ? "🔒 Deadline passed. Marksheet is locked for editing."
                    : <>💡 Tip: You can edit scores directly in the cells above and click <strong>Save Marksheet Changes</strong> to publish updates.</>}
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setViewBatch(null)}
                    style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={isAdminDeadlinePassed ? undefined : handleSaveMarksheetChanges}
                    disabled={savingBatchMarks || isAdminDeadlinePassed}
                    style={{ padding: "10px 24px", background: isAdminDeadlinePassed ? "#cbd5e1" : "#16a34a", color: isAdminDeadlinePassed ? "#94a3b8" : "#ffffff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13.5px", cursor: (savingBatchMarks || isAdminDeadlinePassed) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    title={isAdminDeadlinePassed ? "Submission deadline has passed. Editing is locked." : ""}
                  >
                    <FiCheckCircle size={16} /> {isAdminDeadlinePassed ? "Editing Locked" : savingBatchMarks ? "Saving..." : "Save Marksheet Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "600px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>Upload {resultTypeTab} Course Results (Excel)</h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setShowUploadModal(false)} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                  Select Excel Spreadsheet (.xlsx, .xls, .csv)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px" }}
                />
              </div>

              {/* Validation Errors Box */}
              {validationErrors.length > 0 && (
                <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b", fontWeight: 700, marginBottom: "8px" }}>
                    <FiAlertCircle size={18} /> Validation Failed ({validationErrors.length} errors)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#b91c1c", fontSize: "13px", maxHeight: "160px", overflowY: "auto" }}>
                    {validationErrors.map((err, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Parsed Data Summary */}
              {parsedData.length > 0 && validationErrors.length === 0 && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                  <div style={{ color: "#166534", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                    ✓ Parsed {parsedData.length} Student Result Records
                  </div>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "#15803d" }}>
                    Course Code: <strong>{parsedData[0]?.courseCode}</strong> | Session: <strong>{parsedData[0]?.session}</strong>
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ padding: "10px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={uploading || parsedData.length === 0}
                  style={{ padding: "10px 20px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: uploading ? "not-allowed" : "pointer" }}
                >
                  {uploading ? "Importing..." : `Import ${resultTypeTab} Draft`}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Student Correction Requests Modal for Teacher */}
        {viewRequestsBatch && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "750px", width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a", fontWeight: 700 }}>
                    📩 Student Correction Requests: <strong>{viewRequestsBatch.courseCode}</strong>
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                    Review private issue messages sent by students for {viewRequestsBatch.courseTitle}
                  </p>
                </div>
                <button onClick={() => setViewRequestsBatch(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}>
                  <FiX size={22} />
                </button>
              </div>

              {(() => {
                const batchRequests = teacherRequests.filter(
                  (r) => r.uploadId === viewRequestsBatch._id || r.courseCode === viewRequestsBatch.courseCode
                );

                if (batchRequests.length === 0) {
                  return (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      <FiMessageSquare size={36} style={{ opacity: 0.4, marginBottom: "8px" }} />
                      <p style={{ margin: 0 }}>No student correction requests submitted for this course yet.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {batchRequests.map((req) => {
                      const displayStudentId =
                        req.studentId && req.studentId !== "Student"
                          ? req.studentId
                          : viewRequestsBatch?.results?.find(
                              (resRow) => String(resRow.studentName).trim().toLowerCase() === String(req.studentName).trim().toLowerCase()
                            )?.studentId || "Student";

                      return (
                        <div key={req._id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div>
                              <strong style={{ color: "#0f172a", fontSize: "14.5px" }}>{req.studentName}</strong>
                              <span style={{ fontSize: "12.5px", color: "#0284c7", fontWeight: 700, marginLeft: "8px" }}>(ID: {displayStudentId})</span>
                            </div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: "12px",
                              background: req.status === "Resolved" ? "#dcfce7" : req.status === "Replied" ? "#e0f2fe" : "#fef3c7",
                              color: req.status === "Resolved" ? "#166534" : req.status === "Replied" ? "#0369a1" : "#92400e",
                            }}
                          >
                            {req.status}
                          </span>
                        </div>

                        <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#334155", marginBottom: "12px" }}>
                          "{req.studentMessage}"
                        </div>

                        {req.teacherReply && (
                          <div style={{ background: "#f0fdf4", borderLeft: "3px solid #16a34a", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", color: "#166534", marginBottom: "12px" }}>
                            <strong>Your Previous Reply:</strong> {req.teacherReply}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="Type private reply to student..."
                            value={replyTextMap[req._id] !== undefined ? replyTextMap[req._id] : req.teacherReply || ""}
                            onChange={(e) => setReplyTextMap((prev) => ({ ...prev, [req._id]: e.target.value }))}
                            style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", outline: "none" }}
                          />
                          <button
                            onClick={() => handleReplyStudentRequest(req._id, "Replied")}
                            style={{ padding: "8px 14px", background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => handleReplyStudentRequest(req._id, "Resolved")}
                            style={{ padding: "8px 14px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
