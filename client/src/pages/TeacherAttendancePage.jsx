import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  FiCalendar,
  FiCheck,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiUserPlus,
  FiPlus,
  FiLogOut,
  FiList,
  FiFileText,
  FiBookOpen,
  FiDownload,
  FiBook,
  FiSave,
  FiEdit,
  FiArrowLeft,
  FiEye,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherSidebar from "../components/TeacherSidebar";

export default function TeacherAttendancePage({
  courseId: propCourseId,
  courseCode: propCourseCode,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: urlCourseId } = useParams();

  // Direct course info - NO DROPDOWN
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [loadingCourse, setLoadingCourse] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("mark");
  const [classType, setClassType] = useState("theory");
  const [saved, setSaved] = useState(false);
  const [studentStats, setStudentStats] = useState({});

  // Academic Profile Filter States for Attendance (Department, Session, Level, Term)
  const [deptFilter, setDeptFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  const extractDigit = (val) => {
    if (!val) return "";
    const match = String(val).match(/\d+/);
    return match ? match[0] : "";
  };

  const isAcademicMatch = (student, dept, sess, lvl, trm) => {
    // 1. Department match
    if (dept !== "all") {
      const sDept = student.department || (student.studentIdNumber?.startsWith("22") || student.studentIdNumber?.startsWith("23") ? "EDTE" : "");
      if (sDept && sDept.toUpperCase() !== dept.toUpperCase()) return false;
    }

    // 2. Session match
    if (sess !== "all") {
      let sSess = student.session || "";
      if (!sSess && student.studentIdNumber) {
        const idStr = String(student.studentIdNumber).trim();
        if (idStr.startsWith("22")) sSess = "2022-23";
        else if (idStr.startsWith("23")) sSess = "2023-24";
        else if (idStr.startsWith("24")) sSess = "2024-25";
        else if (idStr.startsWith("25")) sSess = "2025-26";
      }
      if (sSess && sSess !== sess) return false;
    }

    // 3. Level match
    if (lvl !== "all") {
      let sLvl = student.level || "";
      if (!sLvl && student.studentIdNumber) {
        const idStr = String(student.studentIdNumber).trim();
        if (idStr.startsWith("22")) sLvl = "Level-3";
        else if (idStr.startsWith("23")) sLvl = "Level-2";
        else if (idStr.startsWith("24")) sLvl = "Level-1";
      }
      const recL = extractDigit(sLvl);
      const selL = extractDigit(lvl);
      if (recL && selL && recL !== selL) return false;
    }

    // 4. Term match
    if (trm !== "all") {
      let sTrm = student.term || "";
      if (!sTrm && student.studentIdNumber) {
        sTrm = "Term-2";
      }
      const recT = extractDigit(sTrm);
      const selT = extractDigit(trm);
      if (recT && selT && recT !== selT) return false;
    }

    return true;
  };

  const filteredRecords = records.filter((r) =>
    isAcademicMatch(r, deptFilter, sessionFilter, levelFilter, termFilter)
  );

  const [theoryFormula, setTheoryFormula] = useState("=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 3, 0)");
  const [labFormula, setLabFormula] = useState("=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 1, 0)");
  const [theoryTotalClasses, setTheoryTotalClasses] = useState(28);
  const [labTotalClasses, setLabTotalClasses] = useState(14);
  const [formulaInput, setFormulaInput] = useState("");
  const [totalClassesInput, setTotalClassesInput] = useState(28);
  const [appliedClassType, setAppliedClassType] = useState(null);

  const [gridMonth, setGridMonth] = useState(new Date().getMonth());
  const [gridYear, setGridYear] = useState(new Date().getFullYear());
  const [gridData, setGridData] = useState({
    dates: [],
    students: [],
    matrix: [],
  });
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState("");

  // Manual row (student) and manual column (date session) states
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [manualStudentIdNumber, setManualStudentIdNumber] = useState("");
  const [manualStudentName, setManualStudentName] = useState("");
  const [manualStudentStatus, setManualStudentStatus] = useState("present");

  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [manualDateInput, setManualDateInput] = useState("");

  const getStoredManualStudents = () => {
    if (!courseId) return [];
    const storageKey = `manual_students_${courseId}`;
    let fromStorage = [];
    try {
      fromStorage = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (e) {}

    const fromHistory = [];
    if (attendanceHistory && attendanceHistory.length > 0) {
      attendanceHistory.forEach((att) => {
        (att.records || []).forEach((r) => {
          if (r.studentId && r.studentId.toString().startsWith("manual_")) {
            if (!fromHistory.some((h) => h.studentIdNumber === r.studentIdNumber)) {
              fromHistory.push({
                _id: r.studentId,
                studentId: r.studentId,
                studentName: r.studentName,
                studentEmail: r.studentEmail || `${r.studentIdNumber}@student.edu`,
                studentIdNumber: r.studentIdNumber,
                name: r.studentName,
              });
            }
          }
        });
      });
    }

    const combined = [...fromStorage];
    fromHistory.forEach((h) => {
      if (!combined.some((c) => c.studentIdNumber === h.studentIdNumber)) {
        combined.push(h);
      }
    });
    return combined;
  };

  const handleAddManualStudent = () => {
    if (!manualStudentIdNumber.trim() || !manualStudentName.trim()) {
      toast.error("Please provide both Student ID and Name");
      return;
    }
    const newStudentId = `manual_${Date.now()}`;
    const newStudentObj = {
      _id: newStudentId,
      studentId: newStudentId,
      studentName: manualStudentName.trim(),
      studentEmail: `${manualStudentIdNumber.trim()}@student.edu`,
      studentIdNumber: manualStudentIdNumber.trim(),
      name: manualStudentName.trim(),
    };

    if (courseId) {
      const storageKey = `manual_students_${courseId}`;
      let savedManuals = [];
      try {
        savedManuals = JSON.parse(localStorage.getItem(storageKey) || "[]");
      } catch (e) {}
      if (!savedManuals.some((s) => s.studentIdNumber === newStudentObj.studentIdNumber)) {
        savedManuals.push(newStudentObj);
        localStorage.setItem(storageKey, JSON.stringify(savedManuals));
      }
    }

    const newRecord = {
      studentId: newStudentId,
      studentName: manualStudentName.trim(),
      studentEmail: `${manualStudentIdNumber.trim()}@student.edu`,
      studentIdNumber: manualStudentIdNumber.trim(),
      status: manualStudentStatus,
    };

    setRecords((prev) => {
      if (prev.some((r) => r.studentIdNumber === newRecord.studentIdNumber)) {
        return prev;
      }
      return [...prev, newRecord];
    });

    setStudentStats((prev) => ({
      ...prev,
      [newStudentId]: {
        present: manualStudentStatus === "present" ? 1 : 0,
        totalClasses: 1,
        attendanceMarks: 0,
        percentage: manualStudentStatus === "present" ? 100 : 0,
      },
    }));
    setSaved(false);
    toast.success(`Saved manual student row for this course: ${manualStudentName.trim()} (${manualStudentIdNumber.trim()})`);
    setManualStudentIdNumber("");
    setManualStudentName("");
    setManualStudentStatus("present");
    setShowAddStudentModal(false);
  };

  const handleAddManualDate = () => {
    if (!manualDateInput) {
      toast.error("Please pick a valid date");
      return;
    }
    const parts = manualDateInput.split("-");
    const newDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    setSelectedDate(newDate);
    setViewMode("mark");
    toast.success(`Created custom date session column for: ${manualDateInput}`);
    setShowAddDateModal(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Load course from URL
  useEffect(() => {
    if (urlCourseId) {
      loadCourseDirectly(urlCourseId);
    } else {
      loadTeacherFirstCourse();
    }
  }, [urlCourseId]);

  useEffect(() => {
    if (courseId && selectedDate && viewMode === "mark") {
      loadStudentsForDate();
    }
    if (courseId && viewMode === "history") {
      loadAttendanceHistory();
    }
    if (courseId && viewMode === "grid") {
      loadGridData();
    }
    // Always load attendance history to power the classType locking logic
    if (courseId && viewMode !== "history") {
      loadAttendanceHistory();
    }
  }, [courseId, selectedDate, viewMode, gridMonth, gridYear]);

  const loadCourseDirectly = async (id) => {
    try {
      setLoadingCourse(true);
      console.log("Loading course with ID:", id);

      const res = await api.get(`/courses/${id}`);
      const course = res.data.course;

      console.log("Course loaded:", course.displayCode);

      setCourseId(course._id);
      setCourseName(course.name);
      setCourseCode(course.displayCode);
      const fixLegacyFormula = (f, def) => {
        if (!f) return def;
        if (f.startsWith("=ROUND(")) return f.replace("=ROUND(", "=ROUNDUP(");
        return f;
      };

      setTheoryFormula(fixLegacyFormula(course.theoryFormula, "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 3, 0)"));
      setLabFormula(fixLegacyFormula(course.labFormula, "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 1, 0)"));
      setTheoryTotalClasses(course.theoryTotalClasses !== undefined ? course.theoryTotalClasses : 28);
      setLabTotalClasses(course.labTotalClasses !== undefined ? course.labTotalClasses : 14);

      toast.success(`Managing: ${course.displayCode} - ${course.name}`);
    } catch (error) {
      console.error(error);
      toast.error("Course not found");
      navigate("/courses");
    } finally {
      setLoadingCourse(false);
    }
  };

  const loadTeacherFirstCourse = async () => {
    try {
      setLoadingCourse(true);
      const res = await api.get("/attendance/courses/my");
      const courses = res.data.courses;

      if (courses && courses.length > 0) {
        const firstCourse = courses[0];
        setCourseId(firstCourse._id);
        setCourseName(firstCourse.name);
        setCourseCode(firstCourse.displayCode);
        const fixLegacyFormula = (f, def) => {
          if (!f) return def;
          if (f.startsWith("=ROUND(")) return f.replace("=ROUND(", "=ROUNDUP(");
          return f;
        };

        setTheoryFormula(fixLegacyFormula(firstCourse.theoryFormula, "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 3, 0)"));
        setLabFormula(fixLegacyFormula(firstCourse.labFormula, "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 1, 0)"));
        setTheoryTotalClasses(firstCourse.theoryTotalClasses !== undefined ? firstCourse.theoryTotalClasses : 28);
        setLabTotalClasses(firstCourse.labTotalClasses !== undefined ? firstCourse.labTotalClasses : 14);
      } else {
        toast.error("No course assigned to you");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load course");
    } finally {
      setLoadingCourse(false);
    }
  };

  const loadStudentsForDate = async () => {
    if (!courseId || !selectedDate) return;
    try {
      setLoading(true);
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      const studentsRes = await api.get(`/attendance/students/${courseId}`);
      const enrolledStudents = studentsRes.data.students || [];
      const manualStudents = getStoredManualStudents();

      // Combine enrolled students with course-persisted manual students
      const students = [...enrolledStudents];
      manualStudents.forEach((m) => {
        if (!students.some((s) => (s.studentId && s.studentId === m.studentIdNumber) || s._id === m._id)) {
          students.push(m);
        }
      });

      const existingRes = await api.get(
        `/attendance?courseId=${courseId}&date=${dateStr}&classType=${classType}`,
      );

      if (
        existingRes.data.role === "teacher" &&
        existingRes.data.attendance.length > 0
      ) {
        const existing = existingRes.data.attendance[0];
        
        // Merge enrolled + manual students with existing saved records
        const existingRecordsMap = new Map(
          existing.records.map((r) => [r.studentId.toString(), r])
        );

        const mergedRecords = students.map((s) => {
          const sId = (s._id || s.studentId).toString();
          const existingRec = existingRecordsMap.get(sId);
          if (existingRec) {
            return {
              ...existingRec,
              department: s.department || existingRec.department,
              session: s.session || existingRec.session,
              level: s.level || existingRec.level,
              term: s.term || existingRec.term,
            };
          } else {
            return {
              studentId: s._id || s.studentId,
              studentName: s.name || s.studentName,
              studentEmail: s.email || s.studentEmail || "",
              studentIdNumber: s.studentIdNumber || s.studentId || "",
              department: s.department,
              session: s.session,
              level: s.level,
              term: s.term,
              status: "absent",
            };
          }
        });

        setRecords(mergedRecords);
        setSaved(true);
      } else {
        setSaved(false);
        const initialRecords = students.map((s) => ({
          studentId: s._id || s.studentId,
          studentName: s.name || s.studentName,
          studentEmail: s.email || s.studentEmail || "",
          studentIdNumber: s.studentIdNumber || s.studentId || "",
          department: s.department,
          session: s.session,
          level: s.level,
          term: s.term,
          status: "present",
        }));
        setRecords(initialRecords);
      }
      loadStudentStats(students);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const loadStudentStats = async (studentList) => {
    if (!courseId) return;
    try {
      const stats = {};
      for (const student of studentList) {
        const sId = student._id || student.studentId || student.id;
        if (!sId || sId.toString().startsWith("manual_")) {
          const currentRecord = records.find(r => r.studentId === sId);
          stats[sId] = {
            present: currentRecord && currentRecord.status === "present" ? 1 : 0,
            totalClasses: 1,
            attendanceMarks: 0,
            percentage: currentRecord && currentRecord.status === "present" ? 100 : 0,
            maxAttendanceMarks: 30,
          };
          continue;
        }
        try {
          const res = await api.get(
            `/attendance/stats?studentId=${sId}&courseId=${courseId}&classType=${classType}`,
          );
          stats[sId] = {
            present: res.data.present,
            totalClasses: res.data.totalClasses,
            attendanceMarks: res.data.attendanceMarks,
            percentage: res.data.percentage,
            maxAttendanceMarks: res.data.maxAttendanceMarks,
          };
        } catch (err) {
          stats[sId] = { present: 0, totalClasses: 1, attendanceMarks: 0, percentage: 0 };
        }
      }
      setStudentStats(stats);
    } catch (error) {
      console.error(error);
    }
  };

  const loadAttendanceHistory = async () => {
    if (!courseId) return;
    try {
      const res = await api.get(`/attendance?courseId=${courseId}`);
      if (res.data.role === "teacher") {
        setAttendanceHistory(res.data.attendance);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadGridData = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      
      const studentsRes = await api.get(`/attendance/students/${courseId}`);
      const enrolledStudents = studentsRes.data.students || [];
      const manualStudents = getStoredManualStudents();

      const allCourseStudents = [...enrolledStudents];
      manualStudents.forEach((m) => {
        if (!allCourseStudents.some((s) => (s.studentId && s.studentId === m.studentIdNumber) || s._id === m._id)) {
          allCourseStudents.push(m);
        }
      });

      const res = await api.get(`/attendance?courseId=${courseId}&classType=${classType}`);
      if (res.data.role !== "teacher") return;

      const allAttendance = res.data.attendance.filter((a) => {
        const d = new Date(a.date);
        return d.getMonth() === gridMonth && d.getFullYear() === gridYear;
      });

      const dates = [...new Set(allAttendance.map((a) => a.date))].sort(
        (a, b) => new Date(a) - new Date(b),
      );

      const students = allCourseStudents.map((s) => ({
        id: s._id || s.studentId,
        name: s.name || s.studentName,
        email: s.email || s.studentEmail || "",
        studentIdNumber: s.studentIdNumber || s.studentId || "",
        department: s.department,
        session: s.session,
        level: s.level,
        term: s.term,
      }));

      const matrix = students.map((student) => {
        return dates.map((date) => {
          const att = allAttendance.find(
            (a) => new Date(a.date).getTime() === new Date(date).getTime(),
          );
          if (!att) return { status: "none", attendanceId: null, date: date };
          const record = att.records.find(
            (r) => r.studentId.toString() === student.id.toString(),
          );
          return {
            status: record ? record.status : "none",
            attendanceId: att._id,
            date: date,
          };
        });
      });

      setGridData({ dates, students, matrix });

      const stats = {};
      for (const student of students) {
        const statsRes = await api.get(
          `/attendance/stats?studentId=${student.id}&courseId=${courseId}&month=${gridMonth}&year=${gridYear}`,
        );
        stats[student.id] = statsRes.data;
      }
      setStudentStats(stats);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load grid data");
    } finally {
      setLoading(false);
    }
  };

  const toggleGridCell = async (studentId, date, currentStatus) => {
    const newStatus = currentStatus === "present" ? "absent" : "present";
    try {
      setLoading(true);
      const d = new Date(date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      setGridData((prev) => {
        const newMatrix = prev.matrix.map((row, si) => {
          const student = prev.students[si];
          if (student.id !== studentId) return row;
          return row.map((cell, di) => {
            if (new Date(cell.date).getTime() !== new Date(date).getTime())
              return cell;
            return { ...cell, status: newStatus };
          });
        });
        return { ...prev, matrix: newMatrix };
      });

      setStudentStats((prev) => {
        const current = prev[studentId] || {
          present: 0,
          totalClasses: attendanceHistory.filter(a => a.classType === classType).length || 1,
        };
        const presentChange = newStatus === "present" ? 1 : -1;
        const newPresent = Math.max(0, current.present + presentChange);
        const total = current.totalClasses || 1;
        const newPercentage = ((newPresent / 28) * 100).toFixed(1);
        const credit = classType === "lab" ? 1 : 3;
        const formulaStr = classType === "lab" ? labFormula : theoryFormula;
        const newMarks = evaluateExcelFormula(formulaStr, newPresent, credit);
        return {
          ...prev,
          [studentId]: {
            ...current,
            present: newPresent,
            percentage: newPercentage,
            attendanceMarks: newMarks,
          },
        };
      });

      const allStudents = gridData.students;
      const allRecords = allStudents.map((student) => {
        const cell = gridData.matrix[
          gridData.students.findIndex((s) => s.id === student.id)
        ]?.find((c) => new Date(c.date).getTime() === new Date(date).getTime());
        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentIdNumber: student.studentIdNumber,
          status:
            student.id === studentId ? newStatus : cell?.status || "present",
        };
      });

      await api.post("/attendance/mark", {
        courseId: courseId,
        date: dateStr,
        records: allRecords,
        classType: "theory",
      });

      toast.success("Updated!");
    } catch (error) {
      toast.error("Failed to update");
      loadGridData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFormulaInput(classType === "lab" ? labFormula : theoryFormula);
    setTotalClassesInput(classType === "lab" ? labTotalClasses : theoryTotalClasses);
  }, [classType, theoryFormula, labFormula, theoryTotalClasses, labTotalClasses]);

  useEffect(() => {
    const hasTheoryRecords = attendanceHistory.some(a => a.classType === "theory");
    const hasLabRecords = attendanceHistory.some(a => a.classType === "lab");
    
    if (hasTheoryRecords && !hasLabRecords) {
      setClassType("theory");
    } else if (hasLabRecords && !hasTheoryRecords) {
      setClassType("lab");
    }
  }, [attendanceHistory]);

  const handleSaveFormula = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const payload = {};
      const numTotalClasses = Math.max(1, parseInt(totalClassesInput, 10) || (classType === "lab" ? 14 : 28));
      if (classType === "lab") {
        payload.labFormula = formulaInput;
        payload.labTotalClasses = numTotalClasses;
      } else {
        payload.theoryFormula = formulaInput;
        payload.theoryTotalClasses = numTotalClasses;
      }
      
      const res = await api.put(`/attendance/courses/${courseId}/formulas`, payload);
      const updatedCourse = res.data.course;
      
      setTheoryFormula(updatedCourse.theoryFormula || "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 3, 0)");
      setLabFormula(updatedCourse.labFormula || "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 1, 0)");
      setTheoryTotalClasses(updatedCourse.theoryTotalClasses !== undefined ? updatedCourse.theoryTotalClasses : 28);
      setLabTotalClasses(updatedCourse.labTotalClasses !== undefined ? updatedCourse.labTotalClasses : 14);
      setAppliedClassType(classType);
      
      toast.success("Settings & Total Classes saved successfully!");
      
      // Force reload statistics
      const studentsRes = await api.get(`/attendance/students/${courseId}`);
      loadStudentStats(studentsRes.data.students);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to save formula");
    } finally {
      setLoading(false);
    }
  };

  const evaluateExcelFormula = (formula, present, credit, customTotalClasses) => {
    try {
      let expr = (formula || "").trim();
      if (!expr) return 0;
      if (expr.startsWith("=")) {
        expr = expr.substring(1);
      }
      const activeTotalClasses = customTotalClasses || (classType === "lab" ? labTotalClasses : theoryTotalClasses) || (classType === "lab" ? 14 : 28);
      const percentage = (present / activeTotalClasses) * 100;
      expr = expr.replace(/E5|Percentage/gi, percentage);
      expr = expr.replace(/D5|Present/gi, present);
      expr = expr.replace(/Credit/gi, credit);
      
      let match;
      // ROUNDUP(expr, decimals)
      while ((match = expr.match(/ROUNDUP\(([^,]+),\s*(\d+)\)/i)) !== null) {
        const fullMatch = match[0];
        const innerExpr = match[1];
        const decimals = parseInt(match[2], 10);
        const innerVal = evalArithmetic(innerExpr);
        const factor = Math.pow(10, decimals);
        const roundedVal = Math.ceil(innerVal * factor) / factor;
        expr = expr.replace(fullMatch, roundedVal);
      }

      // ROUNDDOWN(expr, decimals)
      while ((match = expr.match(/ROUNDDOWN\(([^,]+),\s*(\d+)\)/i)) !== null) {
        const fullMatch = match[0];
        const innerExpr = match[1];
        const decimals = parseInt(match[2], 10);
        const innerVal = evalArithmetic(innerExpr);
        const factor = Math.pow(10, decimals);
        const roundedVal = Math.floor(innerVal * factor) / factor;
        expr = expr.replace(fullMatch, roundedVal);
      }

      // ROUND(expr, decimals)
      while ((match = expr.match(/ROUND\(([^,]+),\s*(\d+)\)/i)) !== null) {
        const fullMatch = match[0];
        const innerExpr = match[1];
        const decimals = parseInt(match[2], 10);
        const innerVal = evalArithmetic(innerExpr);
        const factor = Math.pow(10, decimals);
        const roundedVal = Math.round(innerVal * factor) / factor;
        expr = expr.replace(fullMatch, roundedVal);
      }
      return evalArithmetic(expr);
    } catch (err) {
      return 0;
    }
  };

  const evalArithmetic = (str) => {
    const sanitized = str.replace(/[^0-9+\-*/().\s]/g, "");
    try {
      const val = Function(`"use strict"; return (${sanitized})`)();
      return isNaN(val) || !isFinite(val) ? 0 : val;
    } catch (e) {
      return 0;
    }
  };

  const toggleStatus = (studentId) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, status: r.status === "present" ? "absent" : "present" }
          : r,
      ),
    );
    setSaved(false);
  };

  const handleSaveAttendance = async () => {
    if (!courseId) {
      toast.error("No course found");
      return;
    }
    setLoading(true);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    try {
      await api.post("/attendance/mark", {
        courseId: courseId,
        date: dateStr,
        classType,
        records,
      });
      toast.success("Attendance saved successfully!");
      setSaved(true);
      loadStudentsForDate();
      loadAttendanceHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFDoc = () => {
    try {
      if (!gridData || !gridData.students || !gridData.dates) {
        toast.error("No grid data available to generate PDF");
        return null;
      }

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const gridMonthName = monthNames[gridMonth] || "";

      let DocConstructor = jsPDF;
      if (typeof DocConstructor !== "function" && typeof window !== "undefined" && window.jspdf && typeof window.jspdf.jsPDF === "function") {
        DocConstructor = window.jspdf.jsPDF;
      }
      const doc = new DocConstructor("landscape", "mm", "a4");

      let filterSubtitle = "";
      const activeFilters = [];
      if (deptFilter !== "all") activeFilters.push(`Dept: ${deptFilter}`);
      if (sessionFilter !== "all") activeFilters.push(`Session: ${sessionFilter}`);
      if (levelFilter !== "all") activeFilters.push(`Level: ${levelFilter}`);
      if (termFilter !== "all") activeFilters.push(`Term: ${termFilter}`);
      if (activeFilters.length > 0) filterSubtitle = ` (${activeFilters.join(" | ")})`;

      doc.setFontSize(14);
      doc.text(
        `Attendance Report - ${courseName || courseCode} (${gridMonthName} ${gridYear})${filterSubtitle}`,
        14,
        15
      );

      const filteredIndices = (gridData.students || [])
        .map((student, index) => (isAcademicMatch(student, deptFilter, sessionFilter, levelFilter, termFilter) ? index : -1))
        .filter((index) => index !== -1);

      if (filteredIndices.length === 0) {
        toast.error("No students match the current filter");
        return null;
      }

      const tableData = filteredIndices.map((si, displayIdx) => {
        const student = gridData.students[si] || {};
        const stats = (studentStats && studentStats[student.id]) || {
          present: 0,
          percentage: 0,
          attendanceMarks: 0,
        };

        const sidStr = student.studentIdNumber 
          ? String(student.studentIdNumber)
          : student.id 
            ? String(student.id).slice(-8)
            : "";

        const row = [
          displayIdx + 1,
          sidStr,
          student.name || "N/A",
          ...(gridData.dates || []).map((_, di) => {
            const cell = gridData.matrix && gridData.matrix[si] ? gridData.matrix[si][di] : null;
            return cell?.status === "present"
              ? "P"
              : cell?.status === "absent"
                ? "A"
                : "-";
          }),
          stats.present || 0,
        ];
        return row;
      });

      const headers = [
        "#",
        "ID",
        "Name",
        ...(gridData.dates || []).map((date) => {
          const d = new Date(date);
          return isNaN(d.getTime()) ? "" : `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        "Present",
      ];

      // Safe autoTable invocation (supports autoTable(doc, config) or doc.autoTable(config) or autoTable.default(doc, config))
      if (typeof autoTable === "function") {
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: 20,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 141, 179], textColor: 255 },
        });
      } else if (typeof doc.autoTable === "function") {
        doc.autoTable({
          head: [headers],
          body: tableData,
          startY: 20,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 141, 179], textColor: 255 },
        });
      } else if (autoTable && typeof autoTable.default === "function") {
        autoTable.default(doc, {
          head: [headers],
          body: tableData,
          startY: 20,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 141, 179], textColor: 255 },
        });
      }

      return doc;
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(`PDF Error: ${err.message || "Failed to generate PDF"}`);
      return null;
    }
  };

  const previewGridPDF = () => {
    const doc = generatePDFDoc();
    if (!doc) return;
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    setPreviewPdfBlobUrl(blobUrl);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const gridMonthName = monthNames[gridMonth];
    setPreviewPdfTitle(`Attendance_${courseCode}_${gridMonthName}_${gridYear}`);
  };

  const downloadGridPDF = () => {
    const doc = generatePDFDoc();
    if (!doc) return;
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const gridMonthName = monthNames[gridMonth];
    doc.save(`Attendance_${courseCode}_${gridMonthName}_${gridYear}.pdf`);
    toast.success("PDF Downloaded!");
  };

  const downloadGridExcel = () => {
    try {
      if (!gridData || !gridData.students || !gridData.dates) {
        toast.error("No grid data available to export Excel");
        return;
      }

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const gridMonthName = monthNames[gridMonth] || "";

      // Prepare headers
      const headers = [
        "Index",
        "Student ID",
        "Student Name",
        ...(gridData.dates || []).map((date) => {
          const d = new Date(date);
          return isNaN(d.getTime()) ? "" : `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        "Present Classes",
      ];

      // Prepare rows
      const filteredIndices = (gridData.students || [])
        .map((student, index) => (isAcademicMatch(student, deptFilter, sessionFilter, levelFilter, termFilter) ? index : -1))
        .filter((index) => index !== -1);

      if (filteredIndices.length === 0) {
        toast.error("No students match the current filter");
        return;
      }

      const rows = filteredIndices.map((si, displayIdx) => {
        const student = gridData.students[si] || {};
        const stats = (studentStats && studentStats[student.id]) || {
          present: 0,
          percentage: 0,
          attendanceMarks: 0,
        };

        const sidStr = student.studentIdNumber 
          ? String(student.studentIdNumber)
          : student.id 
            ? String(student.id).slice(-8)
            : "";

        const rowData = [
          displayIdx + 1,
          sidStr,
          student.name || "N/A",
          ...(gridData.dates || []).map((_, di) => {
            const cell = gridData.matrix && gridData.matrix[si] ? gridData.matrix[si][di] : null;
            return cell?.status === "present"
              ? "Present"
              : cell?.status === "absent"
                ? "Absent"
                : "-";
          }),
          stats.present || 0,
        ];
        return rowData;
      });

      // Combine headers and rows
      const worksheetData = [headers, ...rows];

      // Create sheet and workbook
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Grid");

      // Save workbook
      XLSX.writeFile(workbook, `Attendance_${courseCode}_${gridMonthName}_${gridYear}.xlsx`);
      toast.success("Excel Sheet Downloaded!");
    } catch (error) {
      console.error("Excel download error:", error);
      toast.error(`Excel Error: ${error.message || "Failed to download Excel sheet"}`);
    }
  };

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatShortDate = (date) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const isToday = (day) =>
    new Date().getDate() === day &&
    month === new Date().getMonth() &&
    year === new Date().getFullYear();

  const isSelected = (day) =>
    selectedDate &&
    day === selectedDate.getDate() &&
    month === selectedDate.getMonth() &&
    year === selectedDate.getFullYear();

  const hasAttendance = (day) =>
    attendanceHistory.some(
      (a) =>
        new Date(a.date).getDate() === day &&
        new Date(a.date).getMonth() === month &&
        new Date(a.date).getFullYear() === year &&
        a.classType === classType,
    );

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setRecords([]);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setRecords([]);
  };

  const presentCount = filteredRecords.filter((r) => r.status === "present").length;
  const absentCount = filteredRecords.filter((r) => r.status === "absent").length;

  if (loadingCourse) {
    return (
      <div className="dashboard-container">
        <TeacherSidebar
          currentPage="attendance"
          courseId={courseId}
        />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="dashboard-container">
        <TeacherSidebar
          currentPage="attendance"
          courseId={courseId}
        />
        <div className="main-content">
          <div className="empty-state">
            <FiBook size={48} color="#6B89A0" />
            <h3>No Course Assigned</h3>
            <p>You are not assigned to any course yet.</p>
          </div>
        </div>
      </div>
    );
  }

  const firstStudentId = gridData?.students?.[0]?.id;
  const maxMarks = firstStudentId ? (studentStats[firstStudentId]?.maxAttendanceMarks || 30) : 30;

  return (
    <div className="dashboard-container">
      <TeacherSidebar
        currentPage="attendance"
        courseId={courseId}
      />

      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>Attendance Management</h1>
            <p
              className="subtitle"
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#3B8DB3",
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <FiCalendar size={18} style={{ color: "#3B8DB3" }} />
              <span>
                {courseCode} - {courseName}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn-primary"
              style={{
                background:
                  viewMode === "mark"
                    ? "var(--pastel-blue-deep)"
                    : "var(--pastel-blue-primary)",
              }}
              onClick={() => setViewMode("mark")}
            >
              Mark
            </button>
            <button
              className="btn-primary"
              style={{
                background:
                  viewMode === "history"
                    ? "var(--pastel-blue-deep)"
                    : "var(--pastel-blue-primary)",
              }}
              onClick={() => {
                setViewMode("history");
                loadAttendanceHistory();
              }}
            >
              History
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

        {/* Calendar */}
        <div className="card" style={{ marginBottom: 25 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <button className="btn-toggle" onClick={goToPreviousMonth} style={{ color: "#00d2ff" }}>
              <FiChevronLeft size={22} />
            </button>
            <h2 style={{ margin: 0, color: "#00d2ff" }}>
              {monthName} {year}
            </h2>
            <button className="btn-toggle" onClick={goToNextMonth} style={{ color: "#00d2ff" }}>
              <FiChevronRight size={22} />
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              textAlign: "center",
            }}
          >
            {weekDays.map((day) => (
              <div
                key={day}
                style={{
                  fontWeight: 700,
                  color: "#60a5fa",
                  fontSize: 13,
                  padding: "8px 0",
                }}
              >
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e${i}`} style={{ padding: "10px 0" }}></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const targetDate = new Date(year, month, day);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              targetDate.setHours(0, 0, 0, 0);
              const isFuture = targetDate > today;

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (isFuture) {
                      toast.error("Cannot mark attendance for future dates!");
                      return;
                    }
                    setSelectedDate(new Date(year, month, day));
                    setViewMode("mark");
                  }}
                  style={{
                    padding: "10px 0",
                    cursor: isFuture ? "not-allowed" : "pointer",
                    borderRadius: 8,
                    background: isSelected(day)
                      ? "#3B8DB3"
                      : isToday(day)
                        ? "#E8F4FD"
                        : "transparent",
                    color: isSelected(day)
                      ? "white"
                      : isToday(day)
                        ? "#3B8DB3"
                        : isFuture
                          ? "#cbd5e1"
                          : "#93c5fd",
                    opacity: isFuture ? 0.4 : 1,
                    fontWeight: isToday(day) ? 700 : 400,
                    border:
                      hasAttendance(day) && !isSelected(day)
                        ? "2px solid #10B981"
                        : "2px solid transparent",
                  }}
                >
                  {day}
                  {hasAttendance(day) && !isSelected(day) && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#10B981",
                        margin: "2px auto 0",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MARK ATTENDANCE VIEW */}
        {viewMode === "mark" && selectedDate && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Mark Attendance</h2>
                <p
                  style={{
                    color: "#3B8DB3",
                    margin: "4px 0 0 0",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  📅 {formatDate(selectedDate)} - {courseCode}
                </p>
              </div>
            </div>

            {/* Academic Profile Filter Control Bar (Department, Session, Level, Term) */}
            <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid #cbd5e1", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Department</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", background: "#ffffff", fontWeight: 600, color: "#0f172a", minWidth: "140px" }}
                  >
                    <option value="all">All Departments</option>
                    {["EDTE", "CSE", "EEE", "IRE"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Session</label>
                  <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", background: "#ffffff", fontWeight: 600, color: "#0f172a", minWidth: "130px" }}
                  >
                    <option value="all">All Sessions</option>
                    {["2022-23", "2023-24", "2024-25", "2025-26"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Level</label>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", background: "#ffffff", fontWeight: 600, color: "#0f172a", minWidth: "120px" }}
                  >
                    <option value="all">All Levels</option>
                    {["Level-1", "Level-2", "Level-3", "Level-4"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>Term</label>
                  <select
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", background: "#ffffff", fontWeight: 600, color: "#0f172a", minWidth: "120px" }}
                  >
                    <option value="all">All Terms</option>
                    {["Term-1", "Term-2"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", color: "#0369a1", fontWeight: 600 }}>
                🎓 Enrolled Students Filtered: <strong>{filteredRecords.length}</strong> / {records.length}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: 14, color: "#374151", marginBottom: 6, display: "block" }}>
                  Class Type
                </label>
                {(() => {
                  const hasTheory = attendanceHistory.some(a => a.classType === "theory");
                  const hasLab = attendanceHistory.some(a => a.classType === "lab");
                  const lockedType = hasTheory ? "theory" : hasLab ? "lab" : appliedClassType;
                  return (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {["theory", "lab"].map((type) => {
                        const isActive = classType === type;
                        const isDisabled = lockedType !== null && lockedType !== type;
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              if (isDisabled) {
                                toast.error(
                                  `This course has ${lockedType === "theory" ? "Theory" : "Lab"} active. Only one class type can be used per course.`
                                );
                                return;
                              }
                              setClassType(type);
                            }}
                            style={{
                              padding: "9px 22px",
                              border: isActive ? "2px solid #3B8DB3" : "2px solid #e2e8f0",
                              borderRadius: 8,
                              background: isActive ? "#3B8DB3" : "white",
                              color: isActive ? "white" : isDisabled ? "#cbd5e1" : "#374151",
                              fontWeight: 600,
                              cursor: isDisabled ? "not-allowed" : "pointer",
                              opacity: isDisabled ? 0.5 : 1,
                              fontSize: 13,
                              transition: "all 0.2s",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6
                            }}
                            title={isDisabled ? `Disabled: ${lockedType} is active` : ""}
                          >
                            {type === "theory" ? "Theory" : "Lab"}
                            {lockedType === type && (
                              <span style={{ fontSize: 11, background: "#10B981", color: "white", borderRadius: 4, padding: "2px 6px" }}>
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons Row - Rectangular side-by-side layout directly below Class Type */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)"
                  }}
                  title="Manually add a student row if missing"
                >
                  <FiUserPlus size={16} /> + Add Row (Student)
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDateModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    background: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)"
                  }}
                  title="Manually add a custom class date session column"
                >
                  <FiCalendar size={16} /> + Add Column (Date)
                </button>
                {!saved ? (
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={loading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 24px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      width: "auto",
                      boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
                    }}
                  >
                    <FiSave size={16} /> {loading ? "Saving..." : "Save"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSaved(false)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 24px",
                      background: "#3b8db3",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      width: "auto",
                      boxShadow: "0 2px 4px rgba(59, 141, 179, 0.2)"
                    }}
                  >
                    <FiEdit size={16} /> Edit
                  </button>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                margin: "16px 0",
                padding: "12px 16px",
                background: "#E8F4FD",
                borderRadius: 10,
              }}
            >
              <span style={{ color: "#10B981", fontWeight: 600 }}>
                <FiCheck size={14} /> Present: {presentCount}
              </span>
              <span style={{ color: "#EF4444", fontWeight: 600 }}>
                <FiX size={14} /> Absent: {absentCount}
              </span>
              <span style={{ color: "#2C4B66", fontWeight: 600 }}>
                Total: {records.length}
              </span>
            </div>

            {/* Editable Excel-like Formula Bar */}
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                fontSize: 13,
                color: "#0369a1",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <FiFileText size={15} style={{ color: "#0369a1" }} />
                <strong>Excel Marks Formula</strong>
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  (Variables: <code>Percentage</code> = (Present/TotalClasses)*100, <code>Credit</code> = {classType === "lab" ? "1 (Lab)" : "3 (Theory)"}, Max Marks: {classType === "lab" ? 10 : 30})
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ color: "#0369a1", fontSize: 13, whiteSpace: "nowrap" }}>Total Classes Count:</strong>
                  <input
                    type="number"
                    min="1"
                    value={totalClassesInput}
                    onChange={(e) => setTotalClassesInput(e.target.value)}
                    style={{
                      width: 70,
                      padding: "6px 8px",
                      border: "1.5px solid #bae6fd",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: "center",
                      background: "white",
                      color: "#0369a1",
                      outline: "none",
                    }}
                    title={`Default: ${classType === "lab" ? 14 : 28}`}
                  />
                </div>
                <div style={{ display: "flex", flex: 1, gap: 8, alignItems: "center", minWidth: 280 }}>
                  <span style={{ fontWeight: 700, color: "#0369a1", fontSize: 15, whiteSpace: "nowrap" }}>fx =</span>
                  <input
                    type="text"
                    value={formulaInput}
                    onChange={(e) => setFormulaInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      border: "1.5px solid #bae6fd",
                      borderRadius: 6,
                      fontFamily: "monospace",
                      fontSize: 13,
                      background: "white",
                      color: "#0f172a",
                      outline: "none",
                    }}
                    placeholder="e.g. =ROUND((4 + 6 * (Percentage - 75) / 25) * 3, 0)"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveFormula(); }}
                  />
                  <button
                    onClick={handleSaveFormula}
                    disabled={loading}
                    style={{
                      padding: "6px 16px",
                      background: "#0369a1",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {loading ? "Saving…" : "✔ Save Settings"}
                  </button>
                  <button
                    onClick={() => {
                      const defaultFormula = classType === "lab" 
                        ? "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 1, 0)" 
                        : "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 3, 0)";
                      const defaultTotal = classType === "lab" ? 14 : 28;
                      setFormulaInput(defaultFormula);
                      setTotalClassesInput(defaultTotal);
                      toast.success("Reset to default system formula and total classes!");
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      color: "#64748b",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                    title="Reset to system default formula & total classes"
                  >
                    ↩ Reset
                  </button>
                </div>
              </div>
              {(() => {
                const activeTotal = parseInt(totalClassesInput, 10) || (classType === "lab" ? 14 : 28);
                const halfCls = Math.round(activeTotal / 2);
                return (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                    Formula: <code style={{ color: "#0369a1", fontWeight: 600 }}>Percentage = (Present / {activeTotal}) * 100</code>
                    {" "}| Preview for 1 present:{" "}
                    <strong style={{ color: "#0369a1" }}>
                      {evaluateExcelFormula(formulaInput, 1, classType === "lab" ? 1 : 3, activeTotal)} marks
                    </strong>
                    {" "} | For {halfCls} present:{" "}
                    <strong style={{ color: "#10B981" }}>
                      {evaluateExcelFormula(formulaInput, halfCls, classType === "lab" ? 1 : 3, activeTotal)} marks
                    </strong>
                    {" "} | For {activeTotal} present:{" "}
                    <strong style={{ color: "#10B981" }}>
                      {evaluateExcelFormula(formulaInput, activeTotal, classType === "lab" ? 1 : 3, activeTotal)} marks
                    </strong>
                  </div>
                );
              })()}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="empty-state">
                <FiUser size={48} />
                <h3>No enrolled students match the selected Department / Session / Level / Term filter</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sl</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Present Count</th>
                      <th>Percentage (%)</th>
                      <th>Att. Marks</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => {
                      const stats = studentStats[r.studentId] || {
                        present: 0,
                        attendanceMarks: 0,
                      };
                      const activeTotal = classType === "lab" ? labTotalClasses : theoryTotalClasses;
                      const percentageVal = activeTotal > 0 ? ((stats.present / activeTotal) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={r.studentId}>
                          <td>{i + 1}</td>
                          <td style={{ fontSize: 13, color: "#6B89A0" }}>
                            {r.studentIdNumber ||
                              r.studentId?.substring(r.studentId.length - 8)}
                          </td>
                          <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                          <td
                            style={{
                              textAlign: "center",
                              color: "#3B8DB3",
                              fontWeight: 700,
                            }}
                          >
                            {stats.present}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              color: "#3B8DB3",
                              fontWeight: 700,
                            }}
                          >
                            {percentageVal}%
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              color: "#3B8DB3",
                              fontWeight: 700,
                            }}
                          >
                            {evaluateExcelFormula(formulaInput, stats.present, classType === "lab" ? 1 : 3)}/{classType === "lab" ? 10 : 30}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${r.status === "present" ? "ontime" : "late"}`}
                            >
                              {r.status === "present" ? (
                                <>
                                  <FiCheck size={14} /> Present
                                </>
                              ) : (
                                <>
                                  <FiX size={14} /> Absent
                                </>
                              )}
                            </span>
                          </td>
                          <td>
                            {!saved && (
                              <button
                                className={`attendance-toggle ${r.status}`}
                                onClick={() => toggleStatus(r.studentId)}
                                title={r.status === "present" ? "Mark Absent" : "Mark Present"}
                              >
                                <span className="toggle-track">
                                  <span className="toggle-thumb" />
                                </span>
                              </button>
                            )}
                            {saved && (
                              <span className={`attendance-toggle ${r.status}`} style={{ pointerEvents: "none", display: "inline-flex", alignItems: "center", cursor: "default" }}>
                                <span className="toggle-track">
                                  <span className="toggle-thumb" />
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* HISTORY VIEW */}
        {viewMode === "history" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>
              Attendance History - {courseCode}
            </h2>
            {attendanceHistory.length === 0 ? (
              <div className="empty-state">
                <FiCalendar size={48} />
                <h3>No records found for {courseCode}</h3>
              </div>
            ) : (
              attendanceHistory
                .filter(
                  (a) =>
                    new Date(a.date).getMonth() === month &&
                    new Date(a.date).getFullYear() === year,
                )
                .map((att) => (
                  <div
                    key={att._id}
                    className="card"
                    style={{ marginBottom: 16 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0 }}>{att.course}</h3>
                        <p
                          style={{
                            color: "#6B89A0",
                            margin: "4px 0 0 0",
                            fontSize: 13,
                          }}
                        >
                          {formatDate(new Date(att.date))}
                        </p>
                      </div>
                      <div>
                        <span className="status-badge ontime">
                          Present:{" "}
                          {
                            att.records.filter((r) => r.status === "present")
                              .length
                          }
                        </span>
                        <span
                          className="status-badge late"
                          style={{ marginLeft: 8 }}
                        >
                          Absent:{" "}
                          {
                            att.records.filter((r) => r.status === "absent")
                              .length
                          }
                        </span>
                      </div>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Sl</th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {att.records.map((r, i) => (
                            <tr key={r.studentId}>
                              <td>{i + 1}</td>
                              <td style={{ fontSize: 13, color: "#6B89A0" }}>
                                {r.studentIdNumber ||
                                  r.studentId?.substring(
                                    r.studentId.length - 8,
                                  )}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                {r.studentName}
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
                                  {r.status === "present"
                                    ? " Present"
                                    : " Absent"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* GRID VIEW */}
        {viewMode === "grid" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Attendance Grid - {courseCode}</h2>
            <div
              className="filters-bar"
              style={{
                marginBottom: 20,
                display: "flex",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
                background: "#ffffff",
                padding: "16px 20px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
              }}
            >
              <div className="filter-group">
                <label style={{ fontWeight: 700, fontSize: 12, color: "#475569" }}>Month:</label>
                <select
                  value={gridMonth}
                  onChange={(e) => setGridMonth(parseInt(e.target.value))}
                  style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: 600, background: "white" }}
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
                <label style={{ fontWeight: 700, fontSize: 12, color: "#475569" }}>Year:</label>
                <select
                  value={gridYear}
                  onChange={(e) => setGridYear(parseInt(e.target.value))}
                  style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: 600, background: "white" }}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Profile Filters in Grid View */}
              <div className="filter-group">
                <label style={{ fontWeight: 700, fontSize: 12, color: "#475569" }}>Department:</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: 600, background: "white" }}
                >
                  <option value="all">All Departments</option>
                  {["EDTE", "CSE", "EEE", "IRE"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label style={{ fontWeight: 700, fontSize: 12, color: "#475569" }}>Session:</label>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: 600, background: "white" }}
                >
                  <option value="all">All Sessions</option>
                  {["2022-23", "2023-24", "2024-25", "2025-26"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label style={{ fontWeight: 700, fontSize: 12, color: "#475569" }}>Level:</label>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: 600, background: "white" }}
                >
                  <option value="all">All Levels</option>
                  {["Level-1", "Level-2", "Level-3", "Level-4"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label style={{ fontWeight: 700, fontSize: 12, color: "#475569" }}>Term:</label>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: 600, background: "white" }}
                >
                  <option value="all">All Terms</option>
                  {["Term-1", "Term-2"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {gridData.students.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                  <button className="btn-primary" onClick={previewGridPDF} style={{ background: "#3b8db3", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <FiEye size={16} /> Preview PDF
                  </button>
                  <button className="btn-success" onClick={downloadGridPDF} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <FiDownload size={16} /> Download PDF
                  </button>
                  <button className="btn-success" onClick={downloadGridExcel} style={{ background: "#10b981", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <FiFileText size={16} /> Download Excel
                  </button>
                </div>
              )}
            </div>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : gridData.students.length === 0 ? (
              <div className="empty-state">
                <h3>No data found</h3>
                <p>No attendance records for {courseCode} in this month</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table
                  className="attendance-grid-table"
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    minWidth: 800,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          position: "sticky",
                          left: 0,
                          background: "#f5f5f5",
                          border: "1px solid #e0e0e0",
                          padding: "8px 12px",
                          minWidth: 40,
                        }}
                      >
                        #
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          left: 40,
                          background: "#f5f5f5",
                          border: "1px solid #e0e0e0",
                          padding: "8px 12px",
                          minWidth: 100,
                        }}
                      >
                        ID
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          left: 140,
                          background: "#f5f5f5",
                          border: "1px solid #e0e0e0",
                          padding: "8px 12px",
                          minWidth: 150,
                        }}
                      >
                        Name
                      </th>
                      {gridData.dates.map((date, di) => (
                        <th
                          key={di}
                          style={{
                            border: "1px solid #e0e0e0",
                            padding: "6px 4px",
                            textAlign: "center",
                            fontSize: 10,
                            minWidth: 45,
                          }}
                        >
                          {formatShortDate(date)}
                        </th>
                      ))}
                      <th
                        style={{
                          background: "#dcfce7",
                          border: "1px solid #e0e0e0",
                          padding: "8px 10px",
                          minWidth: 70,
                        }}
                      >
                        Present
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredIndices = gridData.students
                        .map((student, index) => (isAcademicMatch(student, deptFilter, sessionFilter, levelFilter, termFilter) ? index : -1))
                        .filter((index) => index !== -1);

                      if (filteredIndices.length === 0) {
                        return (
                          <tr>
                            <td colSpan={gridData.dates.length + 4} style={{ textAlign: "center", padding: "24px", color: "#64748b", fontWeight: 600 }}>
                              No enrolled students match the selected Department / Session / Level / Term filter.
                            </td>
                          </tr>
                        );
                      }

                      return filteredIndices.map((si, displayIdx) => {
                        const student = gridData.students[si];
                        const stats = studentStats[student.id] || {
                          present: 0,
                          percentage: 0,
                          attendanceMarks: 0,
                        };
                        return (
                          <tr key={student.id}>
                            <td
                              style={{
                                position: "sticky",
                                left: 0,
                                background: "#fafafa",
                                border: "1px solid #e0e0e0",
                                padding: "6px 8px",
                                textAlign: "center",
                              }}
                            >
                              {displayIdx + 1}
                            </td>
                            <td
                              style={{
                                position: "sticky",
                                left: 40,
                                background: "#fafafa",
                                border: "1px solid #e0e0e0",
                                padding: "6px 8px",
                                textAlign: "center",
                                fontSize: 12,
                                color: "#6B89A0",
                              }}
                            >
                              {student.studentIdNumber ||
                                student.id?.substring(student.id.length - 8)}
                            </td>
                            <td
                              style={{
                                position: "sticky",
                                left: 140,
                                background: "#fafafa",
                                border: "1px solid #e0e0e0",
                                padding: "6px 8px",
                                fontWeight: 600,
                              }}
                            >
                              {student.name}
                            </td>
                            {gridData.dates.map((date, di) => {
                              const cell = gridData.matrix[si]?.[di];
                              const status = cell?.status || "none";
                              return (
                                <td
                                  key={di}
                                  onClick={() =>
                                    toggleGridCell(student.id, date, status)
                                  }
                                  style={{
                                    border: "1px solid #e0e0e0",
                                    padding: "4px",
                                    textAlign: "center",
                                    background:
                                      status === "present"
                                        ? "#dcfce7"
                                        : status === "absent"
                                          ? "#fee2e2"
                                          : "#f9f9f9",
                                    cursor: "pointer",
                                  }}
                                >
                                  {status === "present" ? (
                                    <span
                                      style={{
                                        color: "#10B981",
                                        fontWeight: 700,
                                        fontSize: 16,
                                      }}
                                    >
                                      ✓
                                    </span>
                                  ) : status === "absent" ? (
                                    <span
                                      style={{
                                        color: "#EF4444",
                                        fontWeight: 700,
                                        fontSize: 16,
                                      }}
                                    >
                                      ✗
                                    </span>
                                  ) : (
                                    <span style={{ color: "#ccc" }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #e0e0e0",
                                padding: "6px 8px",
                                textAlign: "center",
                                fontWeight: 700,
                                color: "#10B981",
                              }}
                            >
                              {stats.present}
                            </td>

                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {viewMode === "mark" && !selectedDate && (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <FiCalendar size={64} />
            <h3>Select a Date</h3>
            <p>
              Click on any date from the calendar above to mark attendance for{" "}
              {courseCode}
            </p>
          </div>
        )}

        {/* File Preview Modal */}
        {previewPdfBlobUrl && (
          <div className="preview-modal-overlay" onClick={() => {
            URL.revokeObjectURL(previewPdfBlobUrl);
            setPreviewPdfBlobUrl(null);
          }}>
            <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="preview-modal-header">
                <h3>{previewPdfTitle}</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <a
                    href={previewPdfBlobUrl}
                    download={`${previewPdfTitle}.pdf`}
                    className="btn-primary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textDecoration: "none",
                      background: "#10b981",
                    }}
                  >
                    <FiDownload size={14} /> Download
                  </a>
                  <button className="preview-close-btn" onClick={() => {
                    URL.revokeObjectURL(previewPdfBlobUrl);
                    setPreviewPdfBlobUrl(null);
                  }}>
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              <div className="preview-modal-body" style={{ position: "relative", minHeight: "450px", height: "70vh" }}>
                <iframe
                  src={previewPdfBlobUrl}
                  title="PDF Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: "8px",
                    background: "#ffffff",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* MANUAL ADD STUDENT (ROW) MODAL */}
        {showAddStudentModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowAddStudentModal(false)}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(4px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-card, #ffffff)",
                color: "var(--text-primary, #1e293b)",
                borderRadius: 16,
                padding: "24px 28px",
                maxWidth: 450,
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <FiUserPlus style={{ color: "#3b82f6" }} /> Add Manual Student Row
                </h3>
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                >
                  <FiX size={20} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
                Manually insert a student row if missing from attendance list.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Student ID Number</label>
                  <input
                    type="text"
                    value={manualStudentIdNumber}
                    onChange={(e) => setManualStudentIdNumber(e.target.value)}
                    placeholder="e.g. 20210084"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Student Full Name</label>
                  <input
                    type="text"
                    value={manualStudentName}
                    onChange={(e) => setManualStudentName(e.target.value)}
                    placeholder="e.g. Shakil Ahmed"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Initial Attendance Status</label>
                  <select
                    value={manualStudentStatus}
                    onChange={(e) => setManualStudentStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}
                  >
                    <option value="present">Present (P)</option>
                    <option value="absent">Absent (A)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, color: "#475569", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddManualStudent}
                  style={{ padding: "8px 20px", background: "#3b82f6", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: "pointer" }}
                >
                  Add Student Row
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANUAL ADD DATE (COLUMN) MODAL */}
        {showAddDateModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowAddDateModal(false)}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(4px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-card, #ffffff)",
                color: "var(--text-primary, #1e293b)",
                borderRadius: 16,
                padding: "24px 28px",
                maxWidth: 420,
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <FiCalendar style={{ color: "#8b5cf6" }} /> Add Custom Class Session Date
                </h3>
                <button
                  onClick={() => setShowAddDateModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                >
                  <FiX size={20} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
                Select a custom class date to create a new attendance column/session.
              </p>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Class Session Date</label>
                <input
                  type="date"
                  value={manualDateInput}
                  onChange={(e) => setManualDateInput(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowAddDateModal(false)}
                  style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 8, color: "#475569", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddManualDate}
                  style={{ padding: "8px 20px", background: "#8b5cf6", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: "pointer" }}
                >
                  Create Date Session Column
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
