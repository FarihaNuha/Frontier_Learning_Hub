const Result = require("../models/Result");
const ResultUpload = require("../models/ResultUpload");
const ResultLog = require("../models/ResultLog");
const Teacher = require("../models/Teacher");
const TeacherImportBatch = require("../models/TeacherImportBatch");
const Student = require("../models/Student");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseImport = require("../models/CourseImport");
const Notification = require("../models/Notification");
const Notice = require("../models/Notice");
const CGPARecord = require("../models/CGPARecord");
const AcademicProfile = require("../models/AcademicProfile");
const ResultCorrectionRequest = require("../models/ResultCorrectionRequest");
const { sendEmail } = require("../services/emailService");
const { getIO } = require("../socket");

// Helper to safely parse optional numeric values (preserve null for empty cells)
const parseOptionalNumber = (val) => {
  if (val === undefined || val === null || String(val).trim() === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// Helper to validate Excel columns and row data
// Helper to validate Excel columns and row data
const validateResultRows = async (teacherUser, rows, resultType = "Final") => {
  const errors = [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return { isValid: false, errors: ["Excel file contains no data rows."] };
  }

  const normalizeCode = (c) => String(c || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const normalizeSession = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^0-9-]/g, "");
  const normalizeLvl = (s) => { const m = String(s || "").match(/(\d+)/); return m ? m[1] : ""; };

  // Fetch Teacher, TeacherImportBatch, Course, CourseImport
  const teacherProfile = await Teacher.findOne({ email: teacherUser.email.toLowerCase() }).lean();
  const teacherBatches = await TeacherImportBatch.find().lean();
  const lmsCourses = await Course.find({ teacher: teacherUser._id || teacherUser.id }).lean();
  const CourseImport = require("../models/CourseImport");
  const allCourseImports = await CourseImport.find().lean();

  const teacherEmail = (teacherUser.email || "").toLowerCase().trim();
  const teacherIdStr = String(teacherUser.teacherId || "").trim();

  const findImportDoc = (codeStr, titleStr) => {
    const cleanC = normalizeCode(codeStr);
    const cleanT = String(titleStr || "").trim().toLowerCase();
    return allCourseImports.find((ci) => {
      const ciC = normalizeCode(ci.courseCode);
      const ciT = String(ci.courseTitle || "").trim().toLowerCase();
      return (cleanC && ciC === cleanC) || (cleanT && ciT === cleanT);
    });
  };

  const resolveLevelTerm = (acObj, fallbackLTerm, codeStr, titleStr) => {
    if (acObj && acObj.levelTerm && acObj.levelTerm.trim()) return acObj.levelTerm.trim();
    if (acObj && (acObj.level || acObj.term)) {
      const l = String(acObj.level || "").replace(/\D/g, "");
      const t = String(acObj.term || "").replace(/\D/g, "");
      if (l && t) return `Level ${l} - Term ${t}`;
      if (l) return `Level ${l}`;
      if (t) return `Term ${t}`;
    }
    if (fallbackLTerm && fallbackLTerm.trim()) return fallbackLTerm.trim();

    const ci = findImportDoc(codeStr, titleStr);
    if (ci && (ci.level || ci.term)) {
      const l = String(ci.level || "").replace(/\D/g, "");
      const t = String(ci.term || "").replace(/\D/g, "");
      if (l && t) return `Level ${l} - Term ${t}`;
      if (l) return `Level ${l}`;
      if (t) return `Term ${t}`;
    }
    return "";
  };

  const validAssignments = [];

  // 1. Process Teacher collection
  if (teacherProfile && Array.isArray(teacherProfile.assignedCourses)) {
    teacherProfile.assignedCourses.forEach((ac) => {
      const codeClean = normalizeCode(ac.courseCode || ac.courseName);
      if (!codeClean) return;
      validAssignments.push({
        code: codeClean,
        rawCode: ac.courseCode || ac.courseName || "",
        title: ac.courseTitle || ac.courseName || "",
        session: (ac.session || "").trim(),
        levelTerm: resolveLevelTerm(ac, teacherProfile.assignedLevelTerm, ac.courseCode || ac.courseName, ac.courseTitle || ac.courseName),
        department: (ac.department || teacherProfile.department || "").trim().toUpperCase(),
      });
    });
  }

  // 2. Process TeacherImportBatch
  if (Array.isArray(teacherBatches)) {
    teacherBatches.forEach((batch) => {
      if (!Array.isArray(batch.records)) return;
      batch.records.forEach((r) => {
        const rEmail = (r.email || "").toLowerCase().trim();
        const rId = String(r.teacherId || "").trim();
        const isMatch = (teacherEmail && rEmail === teacherEmail) || (teacherIdStr && rId === teacherIdStr);
        if (!isMatch || !Array.isArray(r.assignedCourses)) return;

        r.assignedCourses.forEach((ac) => {
          const acObj = typeof ac === "object" && ac !== null ? ac : {};
          const codeClean = normalizeCode(acObj.courseCode || acObj.courseName);
          if (!codeClean) return;

          validAssignments.push({
            code: codeClean,
            rawCode: acObj.courseCode || acObj.courseName || "",
            title: acObj.courseTitle || acObj.courseName || "",
            session: (acObj.session || "").trim(),
            levelTerm: resolveLevelTerm(acObj, r.assignedLevelTerm, acObj.courseCode || acObj.courseName, acObj.courseTitle || acObj.courseName),
            department: (acObj.department || r.department || "").trim().toUpperCase(),
          });
        });
      });
    });
  }

  // 3. Process LMS Courses
  if (Array.isArray(lmsCourses)) {
    lmsCourses.forEach((c) => {
      const codeClean = normalizeCode(c.displayCode || c.courseCode || c.name);
      if (!codeClean) return;

      let lt = (c.level || c.term) ? `Level ${c.level || "?"} - Term ${c.term || "?"}` : "";
      if (!lt) {
        lt = resolveLevelTerm({}, "", c.displayCode || c.courseCode || c.name, c.name);
      }

      validAssignments.push({
        code: codeClean,
        rawCode: c.displayCode || c.courseCode || c.name || "",
        title: c.name || "",
        session: (c.session || "").trim(),
        levelTerm: lt,
        department: (c.department || "").trim().toUpperCase(),
      });
    });
  }

  // Read header row / first row metadata
  const firstRow = rows[0] || {};
  const excelCourseCodeRaw = String(firstRow.courseCode  || firstRow["Course Code"]  || firstRow["course_code"]  || "").trim().toUpperCase();
  const excelSessionRaw    = String(firstRow.session     || firstRow["Session"]      || firstRow["session"]      || "").trim();
  const excelLevelRaw      = String(firstRow.level       || firstRow["Level"]        || firstRow["level"]        || "").trim();
  const excelTermRaw       = String(firstRow.term        || firstRow["Term"]         || firstRow["term"]         || "").trim();
  const combinedLT         = String(firstRow["Level-Term"] || firstRow["levelTerm"] || firstRow["LevelTerm"] || "").trim();

  let effectiveLevelRaw = excelLevelRaw;
  let effectiveTermRaw = excelTermRaw;
  if (combinedLT && (!effectiveLevelRaw || !effectiveTermRaw)) {
    const lMatch = combinedLT.match(/level\s*:?\s*(\d+)/i) || combinedLT.match(/L(\d+)/i);
    const tMatch = combinedLT.match(/term\s*:?\s*(\d+)/i) || combinedLT.match(/T(\d+)/i);
    if (lMatch && !effectiveLevelRaw) effectiveLevelRaw = lMatch[1];
    if (tMatch && !effectiveTermRaw) effectiveTermRaw = tMatch[1];
  }

  const excelSession   = normalizeSession(excelSessionRaw);
  const excelLdig      = normalizeLvl(effectiveLevelRaw);
  const excelTdig      = normalizeLvl(effectiveTermRaw);
  const cleanExcelCode = normalizeCode(excelCourseCodeRaw);
  const department     = String(firstRow.department || firstRow["Department"] || "").trim().toUpperCase();

  if (teacherUser.role !== "admin") {
    if (validAssignments.length === 0) {
      errors.push("⛔ UPLOAD BLOCKED: No course assignments found for your teacher account. Please contact system admin.");
      return { isValid: false, errors };
    }

    const matchingCodeAssignments = validAssignments.filter((a) => {
      if (!a.code) return false;
      return a.code === cleanExcelCode || a.code.includes(cleanExcelCode) || cleanExcelCode.includes(a.code);
    });

    if (matchingCodeAssignments.length === 0) {
      const uniqueAssignmentsMap = new Map();
      validAssignments.forEach((a) => {
        const key = `${a.rawCode || a.code}_${a.session}_${a.levelTerm}_${a.department}`;
        if (!uniqueAssignmentsMap.has(key)) {
          uniqueAssignmentsMap.set(key, a);
        }
      });
      const uniqueAssignments = Array.from(uniqueAssignmentsMap.values());

      const warningLines = [
        `⛔ UPLOAD BLOCKED: Unassigned Course Code!`,
        ``,
        `Uploaded Course Code: "${excelCourseCodeRaw}"`,
        ``,
        `Your Assigned Courses:`,
        ...uniqueAssignments.map((a) =>
          `  • ${a.rawCode || a.code}${a.title ? ` (${a.title})` : ""}${a.session ? ` — Session: ${a.session}` : ""}${a.levelTerm ? `, ${a.levelTerm}` : ""}${a.department ? `, Dept: ${a.department}` : ""}`
        ),
      ];
      return { isValid: false, errors: [warningLines.join("\n")] };
    }

    let isStrictMatch = false;
    const mismatchReasons = [];

    const lmsCourseSessionMap = {};
    for (const lc of lmsCourses) {
      const lcCode = normalizeCode(lc.displayCode || lc.courseCode || lc.name);
      if (lcCode && lc.session) {
        if (!lmsCourseSessionMap[lcCode]) lmsCourseSessionMap[lcCode] = [];
        lmsCourseSessionMap[lcCode].push({
          session: (lc.session || "").trim(),
          level: String(lc.level || ""),
          term: String(lc.term || ""),
        });
      }
    }

    for (const assignment of matchingCodeAssignments) {
      const reasons = [];

      let authSession = normalizeSession(assignment.session);
      if (!authSession) {
        const lmsEntries = lmsCourseSessionMap[assignment.code] || [];
        if (lmsEntries.length > 0) {
          const lmsLevelMatch = lmsEntries.find((e) => {
            const eLvl = normalizeLvl(e.level);
            const eTrm = normalizeLvl(e.term);
            return (eLvl && excelLdig ? eLvl === excelLdig : true) &&
                   (eTrm && excelTdig ? eTrm === excelTdig : true);
          });
          if (lmsLevelMatch) {
            authSession = normalizeSession(lmsLevelMatch.session);
          } else {
            authSession = normalizeSession(lmsEntries[0].session);
          }
        }
      }

      if (authSession && excelSession) {
        if (authSession !== excelSession) {
          reasons.push(
            `Session mismatch: Excel header specifies "${excelSessionRaw || "N/A"}" but this course (${assignment.rawCode || assignment.code}) requires Session "${assignment.session || authSession}"`
          );
        }
      } else if (authSession && !excelSession) {
        reasons.push(
          `Session not found in Excel header: This course requires Session "${assignment.session || authSession}". Please add "Session: XXXX-XX" in your Excel header.`
        );
      } else if (!authSession && excelSession) {
        reasons.push(
          `Session not configured for this assignment in the system. Please ask admin to set the session for course "${assignment.rawCode || assignment.code}".`
        );
      }

      const assLT = assignment.levelTerm || "";
      const assLvlMatch = assLT.match(/level\s*:?\s*(\d+)/i) || assLT.match(/L(\d+)/i);
      const assTrmMatch = assLT.match(/term\s*:?\s*(\d+)/i) || assLT.match(/T(\d+)/i);
      const assLvl = assLvlMatch ? assLvlMatch[1] : "";
      const assTrm = assTrmMatch ? assTrmMatch[1] : "";

      if (assLvl && excelLdig && assLvl !== excelLdig) {
        reasons.push(
          `Level mismatch: Excel header specifies "Level ${excelLdig}" but this course requires "Level ${assLvl}"`
        );
      } else if (assLvl && !excelLdig) {
        reasons.push(
          `Level missing in Excel header: This course requires "Level ${assLvl}". Please specify "Level: ${assLvl}" in your Excel header.`
        );
      }

      if (assTrm && excelTdig && assTrm !== excelTdig) {
        reasons.push(
          `Term mismatch: Excel header specifies "Term ${excelTdig}" but this course requires "Term ${assTrm}"`
        );
      } else if (assTrm && !excelTdig) {
        reasons.push(
          `Term missing in Excel header: This course requires "Term ${assTrm}". Please specify "Term: ${assTrm}" in your Excel header.`
        );
      }

      if (assignment.department && department) {
        if (assignment.department.toUpperCase() !== department.toUpperCase()) {
          reasons.push(
            `Department mismatch: Excel header specifies "${department}" but this course requires "${assignment.department}"`
          );
        }
      }

      if (reasons.length === 0) {
        isStrictMatch = true;
        break;
      } else {
        mismatchReasons.push(
          `  [Course: ${assignment.rawCode || assignment.code} | Section: Session ${assignment.session || authSession || "?"}, ${assignment.levelTerm || "Level/Term unspecified"}]\n` +
          reasons.map((r) => `    ❌ ${r}`).join("\n")
        );
      }
    }

    if (!isStrictMatch) {
      const warningLines = [
        `⛔ UPLOAD BLOCKED: Marksheet Parameters Do Not Match Your Assignment!`,
        ``,
        `You uploaded an Excel file for Course "${excelCourseCodeRaw}" with these parameters:`,
        excelSessionRaw ? `  • Session      : ${excelSessionRaw}` : `  • Session      : Not specified in Excel`,
        (excelLdig || excelTdig) ? `  • Level & Term : Level ${excelLdig || "?"} - Term ${excelTdig || "?"}` : `  • Level & Term : Not specified in Excel`,
        department ? `  • Department   : ${department}` : null,
        ``,
        `But this course is assigned to you ONLY for these specific section(s):`,
        ...matchingCodeAssignments.map((a) =>
          `  ✅ Session: ${a.session || "Any"} | ${a.levelTerm || "Level/Term unspecified"}${a.department ? ` | Dept: ${a.department}` : ""}`
        ),
        ``,
        `Detected Mismatch Reasons:`,
        ...mismatchReasons,
        ``,
        `Please correct Session / Level / Term in your Excel file header to match your assigned section and re-upload.`,
      ].filter((l) => l !== null);

      return { isValid: false, errors: [warningLines.join("\n")] };
    }
  }

  // Per-row checks: required fields + duplicate rows
  const seenStudentCodes = new Set();
  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const studentIdVal  = row.studentId   || row["Student ID"]   || row["ID"]           || row["student_id"];
    const courseCodeVal = row.courseCode  || row["Course Code"]  || row["course_code"];
    const courseTitleVal= row.courseTitle || row["Course Title"] || row["course_title"];

    if (!studentIdVal  || String(studentIdVal).trim()   === "") errors.push(`Row ${rowNum}: Missing required field 'Student ID'.`);
    if (!courseCodeVal || String(courseCodeVal).trim()  === "") errors.push(`Row ${rowNum}: Missing required field 'Course Code'.`);
    if (!courseTitleVal|| String(courseTitleVal).trim() === "") errors.push(`Row ${rowNum}: Missing required field 'Course Title'.`);

    const cCode      = String(courseCodeVal || "").trim().toUpperCase();
    const cleanCCode = normalizeCode(cCode);
    const sId        = String(studentIdVal  || "").trim();

    const dupKey = `${sId}_${cleanCCode}`;
    if (seenStudentCodes.has(dupKey)) {
      errors.push(`Row ${rowNum}: Duplicate result row found for Student ID '${sId}' and Course '${cCode}'.`);
    } else {
      seenStudentCodes.add(dupKey);
    }
  });

  return { isValid: errors.length === 0, errors };
};



// 1. Teacher Result Upload (Excel JSON)
exports.uploadResultExcel = async (req, res) => {
  try {
    const { results, resultType } = req.body;
    const activeResultType = resultType === "Midterm" ? "Midterm" : "Final";

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "No result records submitted for import." });
    }

    // Validate rows before import
    const validation = await validateResultRows(req.user, results, activeResultType);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Excel validation failed. Please correct errors and re-upload.",
        validationErrors: validation.errors,
      });
    }

    const firstRow = results[0] || {};
    const courseCode = String(firstRow.courseCode || firstRow["Course Code"] || "").trim().toUpperCase();
    const courseTitle = String(firstRow.courseTitle || firstRow["Course Title"] || "").trim();
    const session = String(firstRow.session || firstRow["Session"] || "").trim();

    let rawLevel = String(firstRow.level || firstRow["Level"] || "").trim();
    let rawTerm = String(firstRow.term || firstRow["Term"] || "").trim();

    // Parse combined Level-Term if provided (e.g., "Level 1 - Term 2")
    const combinedLT = String(firstRow["Level-Term"] || firstRow["levelTerm"] || "").trim();
    if (combinedLT && (!rawLevel || !rawTerm)) {
      const lMatch = combinedLT.match(/level\s*:?\s*(\d+)/i) || combinedLT.match(/L(\d+)/i);
      const tMatch = combinedLT.match(/term\s*:?\s*(\d+)/i) || combinedLT.match(/T(\d+)/i);
      if (lMatch && !rawLevel) rawLevel = lMatch[1];
      if (tMatch && !rawTerm) rawTerm = tMatch[1];
    }

    const levelDigit = rawLevel.replace(/\D/g, "") || "1";
    const termDigit = rawTerm.replace(/\D/g, "") || "1";

    let level = `Level-${levelDigit}`;
    let term = `Term-${termDigit}`;

    const checkAdminDeadlinePassed = async (sess, lvl, trm, resType) => {
      if (!sess || !lvl || !trm) return false;
      const lDigit = String(lvl).replace(/\D/g, "");
      const tDigit = String(trm).replace(/\D/g, "");
      const lRegex = lDigit ? new RegExp(`(Level\\s*[-_]?\\s*${lDigit}|\\b${lDigit}\\b)`, "i") : new RegExp(lvl, "i");
      const tRegex = tDigit ? new RegExp(`(Term\\s*[-_]?\\s*${tDigit}|\\b${tDigit}\\b)`, "i") : new RegExp(trm, "i");

      const notice = await Notice.findOne({
        category: "Academic",
        deadlineDate: { $ne: null },
        $or: [
          { resultDeadlineType: resType },
          { title: { $regex: new RegExp(resType || "Result", "i") } }
        ],
        session: { $regex: new RegExp(String(sess).replace("-", "[- ]?"), "i") },
        level: lRegex,
        term: tRegex,
      }).sort({ deadlineDate: -1 }).lean();

      if (notice && notice.deadlineDate && new Date() > new Date(notice.deadlineDate)) {
        return notice.deadlineDate;
      }
      return false;
    };

    const expiredDeadline = await checkAdminDeadlinePassed(session, level, term, activeResultType);
    if (expiredDeadline) {
      return res.status(403).json({
        error: `Submission deadline passed on ${new Date(expiredDeadline).toLocaleString()}. No uploads or modifications are accepted after the deadline.`,
      });
    }

    const teacherProfile = await Teacher.findOne({ email: req.user.email }).lean();
    const initialStatus = activeResultType === "Midterm" ? "Published" : "Submitted";

    const targetUploadId = req.body.uploadId;
    let uploadBatch = null;

    if (targetUploadId) {
      uploadBatch = await ResultUpload.findById(targetUploadId);
    }

    if (!uploadBatch) {
      const cleanCode = courseCode.replace(/\s+/g, "").toUpperCase();
      const teacherEmail = req.user.email.toLowerCase();
      const existingUploads = await ResultUpload.find({
        teacherEmail,
        resultType: activeResultType,
      });

      uploadBatch = existingUploads.find(u =>
        u.courseCode.replace(/\s+/g, "").toUpperCase() === cleanCode &&
        u.session === session &&
        (u.level || "") === level &&
        (u.term || "") === term
      );
    }

    if (uploadBatch) {
      await Result.deleteMany({ uploadId: uploadBatch._id });

      uploadBatch.courseCode = courseCode;
      uploadBatch.courseTitle = courseTitle;
      uploadBatch.session = session;
      uploadBatch.level = level;
      uploadBatch.term = term;
      uploadBatch.totalRecords = results.length;
      if (activeResultType === "Midterm") {
        uploadBatch.status = "Published";
      }
      uploadBatch.updatedAt = new Date();
      await uploadBatch.save();
    } else {
      uploadBatch = await ResultUpload.create({
        teacher: req.user._id || req.user.id,
        teacherEmail: req.user.email,
        resultType: activeResultType,
        department: teacherProfile?.department || req.user.department || "EDTE",
        courseCode,
        courseTitle,
        session,
        level,
        term,
        totalRecords: results.length,
        status: initialStatus,
      });
    }

    const lmsCourse = await Course.findOne({ displayCode: courseCode });
    const allStudents = await Student.find().lean();
    const allUsers = await User.find({ role: "student" }).lean();

    const createdResults = [];
    for (const row of results) {
      const sId = String(row.studentId || row["Student ID"] || row["ID"] || row["student_id"]).trim();
      const sProfile = allStudents.find(s => s.studentId === sId);
      const sUser = allUsers.find(u => u.studentId === sId || (sProfile && u.email === sProfile.universityEmail));

      const cType = row.courseType || row["Course Type"] || "Theory";
      const cTitle = row.courseTitle || row["Course Title"] || courseTitle;
      const isLab = (cType + " " + cTitle + " " + courseCode).toLowerCase().includes("lab") || 
                    (cType + " " + cTitle + " " + courseCode).toLowerCase().includes("sessional") || 
                    (cType + " " + cTitle + " " + courseCode).toLowerCase().includes("practical");

      let resCreditHours = parseOptionalNumber(row.creditHours || row["Credit Hours"]);
      if (!resCreditHours || (isLab && resCreditHours === 3)) {
        resCreditHours = isLab ? 1 : 3;
      }

      const rDoc = await Result.create({
        uploadId: uploadBatch._id,
        resultType: activeResultType,
        student: sUser ? sUser._id : null,
        studentId: sId,
        studentName: sUser?.name || sProfile?.name || "Student",
        teacher: req.user._id || req.user.id,
        teacherEmail: req.user.email,
        course: lmsCourse ? lmsCourse._id : null,
        courseCode,
        courseTitle: cTitle,
        courseType: isLab ? (cType.toLowerCase().includes("lab") ? cType : "Lab") : cType,
        creditHours: resCreditHours,
        department: teacherProfile?.department || req.user.department || sProfile?.department || "EDTE",
        session: row.session || row["Session"] || session,
        level: row.level || level,
        term: row.term || term,
        midPartA: parseOptionalNumber(row.midPartA ?? row["MT Part A Marks"] ?? row["MT Part A"] ?? row["MT part A Marks"]),
        midPartB: parseOptionalNumber(row.midPartB ?? row["MT Part B Marks"] ?? row["MT Part B"] ?? row["MT part B Marks"]),
        finalPartA: parseOptionalNumber(row.finalPartA ?? row["FT Part A Marks"] ?? row["FT Part A"] ?? row["FT part A Marks"]),
        finalPartB: parseOptionalNumber(row.finalPartB ?? row["FT Part B Marks"] ?? row["FT Part B"] ?? row["FT part B Marks"]),
        attendance: parseOptionalNumber(row.attendance ?? row["Attendance Marks"] ?? row["Attendance"] ?? row["Attendanc"]),
        continuousAssessment: parseOptionalNumber(row.continuousAssessment ?? row["Continuous Assessment Marks"] ?? row["Continous Assessment Marks"] ?? row["Continuous Assessment"] ?? row["Continous Assessment"] ?? row["Continuous"] ?? row["Continous"]),
        finalExam: parseOptionalNumber(row.finalExam ?? row["Final Exam Marks"] ?? row["Final Exam"] ?? ((parseOptionalNumber(row.finalPartA ?? row["FT Part A Marks"] ?? row["FT Part A"]) || 0) + (parseOptionalNumber(row.finalPartB ?? row["FT Part B Marks"] ?? row["FT Part B"]) || 0))),
        totalMarks: parseOptionalNumber(row.totalMarks ?? row["Total Marks"] ?? row["Total"]),
        letterGrade: String(row.letterGrade || row["GPA"] || row["CGPA"] || row["Letter Grade"] || "").trim().toUpperCase(),
        gradePoint: parseOptionalNumber(row.gradePoint ?? row["GPA"] ?? row["CGPA"] ?? row["Grade Point"]),
        status: initialStatus,
      });

      createdResults.push(rDoc);
    }

    await ResultLog.create({
      uploadId: uploadBatch._id,
      action: activeResultType === "Midterm" ? "Published" : "Submitted",
      performedBy: req.user._id || req.user.id,
      comment: activeResultType === "Midterm"
        ? `Midterm results published directly to students for ${courseCode} (${session}).`
        : `Submitted draft Final results batch containing ${results.length} student records.`,
    });

    res.status(201).json({
      message: `${activeResultType} Result Excel imported successfully as Draft.`,
      upload: uploadBatch,
      totalImported: createdResults.length,
    });
  } catch (error) {
    console.error("Result upload error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 1b. Get Active Result Deadlines for Teachers (set by Admin)
exports.getResultDeadlines = async (req, res) => {
  try {
    const midtermDeadline = await Notice.findOne({
      resultDeadlineType: "Midterm",
      targetAudience: { $in: ["Teachers", "All"] },
    }).sort({ createdAt: -1 }).lean();

    const finalDeadline = await Notice.findOne({
      resultDeadlineType: "Final",
      targetAudience: { $in: ["Teachers", "All"] },
    }).sort({ createdAt: -1 }).lean();

    const allDeadlines = await Notice.find({
      deadlineDate: { $ne: null },
      targetAudience: { $in: ["Teachers", "All"] },
    }).sort({ createdAt: -1 }).lean();

    res.json({
      midtermDeadline: midtermDeadline || null,
      finalDeadline: finalDeadline || null,
      allDeadlines: allDeadlines || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Get Teacher Results
exports.getTeacherResults = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user.uid || req.user._id;
    const teacherEmail = (req.user.email || "").toLowerCase().trim();
    const { resultType } = req.query;

    const query = {
      $or: [
        { teacher: teacherId },
        { teacherEmail: teacherEmail }
      ]
    };
    if (resultType && resultType !== "all") {
      query.resultType = resultType;
    }

    const uploads = await ResultUpload.find(query).sort({ uploadedAt: -1 }).lean();

    const uploadsWithResults = await Promise.all(
      uploads.map(async (up) => {
        const results = await Result.find({ uploadId: up._id }).sort({ studentId: 1 }).lean();
        return {
          ...up,
          results,
        };
      })
    );

    res.json({ uploads: uploadsWithResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Draft Result item
exports.updateDraftResult = async (req, res) => {
  try {
    const { id } = req.params;
    const resultDoc = await Result.findById(id);
    if (!resultDoc) {
      return res.status(404).json({ error: "Result record not found." });
    }

    if (resultDoc.status !== "Draft" && resultDoc.status !== "Correction Requested") {
      return res.status(400).json({ error: "Cannot edit result after submission unless Correction Requested." });
    }

    Object.assign(resultDoc, req.body);
    resultDoc.updatedAt = new Date();
    await resultDoc.save();

    res.json({ message: "Result updated successfully.", result: resultDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete Result Batch
exports.deleteDraftUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const upload = await ResultUpload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Upload batch not found." });
    }

    const isTeacher = upload.teacherEmail.toLowerCase() === req.user.email.toLowerCase() || String(upload.teacher) === String(req.user._id || req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized to delete this result batch." });
    }

    await Result.deleteMany({ uploadId: upload._id });
    await ResultUpload.findByIdAndDelete(upload._id);

    await ResultLog.create({
      uploadId: upload._id,
      action: "Deleted",
      performedBy: req.user._id || req.user.id,
      comment: "Result batch deleted.",
    });

    res.json({ message: "Result batch deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Submit Result to Admin
exports.submitResultToAdmin = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const upload = await ResultUpload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Upload batch not found." });
    }

    if (upload.resultType === "Midterm") {
      // Midterm submission -> Publishes directly to students!
      upload.status = "Published";
      upload.updatedAt = new Date();
      await upload.save();

      await Result.updateMany(
        { uploadId: upload._id },
        { status: "Published", publishedAt: new Date() }
      );

      await ResultLog.create({
        uploadId: upload._id,
        action: "Published",
        performedBy: req.user._id || req.user.id,
        comment: `Midterm results published directly to students for ${upload.courseCode} (${upload.session}).`,
      });

      // Notify Enrolled Students immediately
      const batchResults = await Result.find({ uploadId: upload._id }).lean();
      for (const r of batchResults) {
        if (r.student) {
          try {
            const notif = await Notification.create({
              userId: r.student,
              title: `Midterm Result Published: ${r.courseCode}`,
              message: `Your Midterm result for ${r.courseCode} (${r.courseTitle}) has been published to your dashboard!`,
              type: "general",
            });

            const io = getIO();
            if (io) io.emit("new_notification", { userId: r.student.toString(), notif });
          } catch (err) {}
        }
      }

      return res.json({ message: "Midterm results published directly to students' dashboard!", upload });
    } else {
      // Final submission -> Submits to Admin for verification
      upload.status = "Submitted";
      upload.updatedAt = new Date();
      await upload.save();

      await Result.updateMany(
        { uploadId: upload._id },
        { status: "Submitted", submittedAt: new Date() }
      );

      await ResultLog.create({
        uploadId: upload._id,
        action: "Submitted",
        performedBy: req.user._id || req.user.id,
        comment: `Final result batch submitted to Admin for verification.`,
      });

      // Notify Admin users
      const adminUsers = await User.find({ role: "admin" }).lean();
      for (const admin of adminUsers) {
        try {
          const notif = await Notification.create({
            userId: admin._id,
            title: `Final Result Submitted: ${upload.courseCode}`,
            message: `Teacher ${req.user.email} submitted Final results for ${upload.courseCode} (${upload.session}) for verification.`,
            type: "general",
          });

          const io = getIO();
          if (io) io.emit("new_notification", { userId: admin._id.toString(), notif });
        } catch (err) {}
      }

      return res.json({ message: "Final result batch submitted to Admin for verification.", upload });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Admin Get All Results (Final or Midterm based on resultType query param)
exports.getAdminResults = async (req, res) => {
  try {
    const { status, session, level, term, department, resultType } = req.query;

    const activeResultType = resultType === "Midterm" ? "Midterm" : "Final";
    const query = { resultType: activeResultType };
    if (status && status !== "all" && status.toLowerCase() !== "pending") query.status = status;
    if (session && session !== "all") query.session = session;
    if (level && level !== "all") query.level = level;
    if (term && term !== "all") query.term = term;
    if (department && department !== "all") query.department = department;

    const uploads = await ResultUpload.find(query).sort({ updatedAt: -1 }).lean();

    const uploadsWithResults = await Promise.all(
      uploads.map(async (up) => {
        const results = await Result.find({ uploadId: up._id }).sort({ studentId: 1 }).lean();
        const logs = await ResultLog.find({ uploadId: up._id }).populate("performedBy", "name email").sort({ createdAt: -1 }).lean();

        let teacherUser = null;
        if (up.teacher) {
          teacherUser = await User.findById(up.teacher).lean();
        } else if (up.teacherEmail) {
          teacherUser = await User.findOne({ email: up.teacherEmail.toLowerCase() }).lean();
        }

        const isPendingStatus = !up.status || up.status === "Draft" || up.status === "Pending Upload" || up.status === "Pending";

        return {
          ...up,
          status: isPendingStatus ? "Pending" : up.status,
          teacherName: teacherUser?.name || up.teacherName || "Assigned Teacher",
          teacherEmail: teacherUser?.email || up.teacherEmail || "",
          results,
          logs,
        };
      })
    );

    // If status filter is "all" or "Pending", discover pending assigned courses that haven't been uploaded yet
    if (!status || status === "all" || status.toLowerCase() === "pending") {
      const existingUploadKeys = new Set();
      uploadsWithResults.forEach((u) => {
        const code = (u.courseCode || "").trim().toUpperCase();
        const sess = (u.session || "").trim();
        const ldig = (String(u.level || "").match(/\d+/) || [])[0] || "1";
        const tdig = (String(u.term || "").match(/\d+/) || [])[0] || "1";
        if (code) {
          existingUploadKeys.add(`${code}_${sess}_${ldig}_${tdig}`);
        }
      });

      const allTeachers = await User.find({ role: "teacher" }).lean();
      const Course = require("../models/Course");
      const CourseImport = require("../models/CourseImport");
      const allLmsCourses = await Course.find({}).populate("teacher", "name email department").lean();
      const allCourseImports = await CourseImport.find({}).lean();

      const pendingAutoCards = [];

      // 1. From CourseImport (Department Syllabus Curriculum)
      allCourseImports.forEach((ci) => {
        const code = (ci.courseCode || "").trim().toUpperCase();
        if (!code) return;
        const sess = "2022-23";
        const ldig = (String(ci.level || "").match(/\d+/) || [])[0] || "3";
        const tdig = (String(ci.term || "").match(/\d+/) || [])[0] || "2";
        const key = `${code}_${sess}_${ldig}_${tdig}`;

        if (!existingUploadKeys.has(key)) {
          existingUploadKeys.add(key);

          const matchedTeacher = allTeachers.find((t) =>
            t.department === ci.department ||
            (t.assignedCourses || []).some((ac) => (ac.courseCode || ac.courseName || "").toUpperCase().includes(code))
          ) || allTeachers[0];

          pendingAutoCards.push({
            _id: `pending_${code}_${sess}_${ldig}_${tdig}`,
            isPendingAutoCard: true,
            courseCode: ci.courseCode,
            courseTitle: ci.courseTitle,
            department: ci.department || "EDTE",
            session: sess,
            level: ci.level ? (ci.level.startsWith("Level") ? ci.level : `Level-${ci.level}`) : `Level-${ldig}`,
            term: ci.term ? (ci.term.startsWith("Term") ? ci.term : `Term-${ci.term}`) : `Term-${tdig}`,
            totalRecords: 0,
            resultType: activeResultType,
            status: "Pending",
            teacherEmail: matchedTeacher?.email || "farihatasnim0903@gmail.com",
            teacherName: matchedTeacher?.name || "Rabbi Khan",
            results: [],
          });
        }
      });

      // 2. From LMS Course models
      allLmsCourses.forEach((c) => {
        const code = (c.displayCode || c.courseCode || "").trim().toUpperCase();
        const sess = (c.session || "2022-23").trim();
        const ldig = (String(c.level || "").match(/\d+/) || [])[0] || "3";
        const tdig = (String(c.term || "").match(/\d+/) || [])[0] || "2";
        const key = `${code}_${sess}_${ldig}_${tdig}`;

        if (code && !existingUploadKeys.has(key)) {
          existingUploadKeys.add(key);
          pendingAutoCards.push({
            _id: `pending_${code}_${sess}_${ldig}_${tdig}`,
            isPendingAutoCard: true,
            courseCode: c.displayCode || c.courseCode || code,
            courseTitle: c.courseTitle || c.title || c.name || "Course",
            department: c.department || c.teacher?.department || "EDTE",
            session: sess,
            level: c.level || `Level-${ldig}`,
            term: c.term || `Term-${tdig}`,
            totalRecords: 0,
            resultType: activeResultType,
            status: "Pending",
            teacherEmail: c.teacher?.email || "",
            teacherName: c.teacher?.name || "Assigned Teacher",
            results: [],
          });
        }
      });

      // 3. From User assignedCourses
      allTeachers.forEach((t) => {
        (t.assignedCourses || []).forEach((ac) => {
          const code = (ac.courseCode || ac.courseName || "").trim().toUpperCase();
          if (!code) return;
          const sess = (ac.session || "2022-23").trim();
          const ldig = (String(ac.level || ac.levelTerm || "").match(/\d+/) || [])[0] || "3";
          const tdig = (String(ac.term || ac.levelTerm || "").match(/\d+/) || [])[0] || "2";
          const key = `${code}_${sess}_${ldig}_${tdig}`;

          if (!existingUploadKeys.has(key)) {
            existingUploadKeys.add(key);
            pendingAutoCards.push({
              _id: `pending_${code}_${sess}_${ldig}_${tdig}`,
              isPendingAutoCard: true,
              courseCode: ac.displayCode || ac.courseCode || code,
              courseTitle: ac.name || ac.courseTitle || ac.displayCode || code,
              department: ac.department || t.department || "EDTE",
              session: sess,
              level: ac.level || `Level-${ldig}`,
              term: ac.term || `Term-${tdig}`,
              totalRecords: 0,
              resultType: activeResultType,
              status: "Pending",
              teacherEmail: t.email || "",
              teacherName: t.name || "Assigned Teacher",
              results: [],
            });
          }
        });
      });

      // Fetch active Academic Notices for deadlines & scheduled publication table
      const activeNotices = await Notice.find({
        $or: [
          { deadlineDate: { $ne: null } },
          { category: "Academic" }
        ]
      }).sort({ createdAt: -1 }).lean();

      // Attach deadline Date & Time to pending cards
      const pendingWithDeadlines = pendingAutoCards.map((card) => {
        const cL = (String(card.level || "").match(/\d+/) || [])[0];
        const cT = (String(card.term || "").match(/\d+/) || [])[0];
        const matchedNotice = activeNotices.find((n) => {
          if (!n.deadlineDate) return false;
          const sMatch = !n.session || String(n.session).toLowerCase().includes(String(card.session).toLowerCase());
          const nL = (String(n.level || "").match(/\d+/) || [])[0];
          const nT = (String(n.term || "").match(/\d+/) || [])[0];
          const lMatch = !nL || nL === cL;
          const tMatch = !nT || nT === cT;
          const rMatch = !n.resultDeadlineType || n.resultDeadlineType === activeResultType;
          return sMatch && lMatch && tMatch && rMatch;
        });
        return {
          ...card,
          cutoffDeadline: matchedNotice ? matchedNotice.deadlineDate : null,
        };
      });

      const uploadsWithDeadlines = uploadsWithResults.map((upload) => {
        const uL = (String(upload.level || "").match(/\d+/) || [])[0];
        const uT = (String(upload.term || "").match(/\d+/) || [])[0];
        const matchedNotice = activeNotices.find((n) => {
          if (!n.deadlineDate) return false;
          const sMatch = !n.session || String(n.session).toLowerCase().includes(String(upload.session).toLowerCase());
          const nL = (String(n.level || "").match(/\d+/) || [])[0];
          const nT = (String(n.term || "").match(/\d+/) || [])[0];
          const lMatch = !nL || nL === uL;
          const tMatch = !nT || nT === uT;
          const rMatch = !n.resultDeadlineType || n.resultDeadlineType === (upload.resultType || activeResultType);
          return sMatch && lMatch && tMatch && rMatch;
        });
        return {
          ...upload,
          cutoffDeadline: matchedNotice ? matchedNotice.deadlineDate : upload.correctionWindowEnd || null,
        };
      });

      if (status && status.toLowerCase() === "pending") {
        return res.json({ uploads: pendingWithDeadlines, notices: activeNotices });
      }

      res.json({ uploads: [...uploadsWithDeadlines, ...pendingWithDeadlines], notices: activeNotices });
    } else {
      const activeNotices = await Notice.find({
        $or: [
          { deadlineDate: { $ne: null } },
          { category: "Academic" }
        ]
      }).sort({ createdAt: -1 }).lean();
      res.json({ uploads: uploadsWithResults, notices: activeNotices });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send direct personal reminder to teacher for pending marksheet upload
exports.sendTeacherReminder = async (req, res) => {
  try {
    const { teacherEmail, courseCode, courseTitle, session, level, term, resultType, message } = req.body;
    if (!teacherEmail) {
      return res.status(400).json({ error: "Teacher email is required" });
    }

    const teacherUser = await User.findOne({ email: teacherEmail.toLowerCase().trim() });
    if (!teacherUser) {
      return res.status(404).json({ error: `Teacher with email ${teacherEmail} not found.` });
    }

    const examType = resultType || "Result";
    const title = `URGENT REMINDER: ${examType} Marksheet Pending for ${courseCode}`;
    const noticeMsg = message || `Dear ${teacherUser.name},\n\nThis is an urgent reminder to upload and submit the ${examType} result marksheet for course ${courseCode} (${courseTitle || ""}) for ${level || "Level-3"} ${term || "Term-2"} (Session: ${session || "2022-23"}).\n\nPlease upload the marksheet as soon as possible.`;

    const notif = await Notification.create({
      userId: teacherUser._id,
      title,
      message: noticeMsg,
      type: "general",
    });

    const io = getIO();
    if (io) io.emit("new_notification", { userId: teacherUser._id.toString(), notif });

    try {
      await sendEmail({
        to: teacherUser.email,
        subject: title,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; border-radius: 8px;">
          <h2 style="color: #dc2626;">⚠️ ${title}</h2>
          <p style="font-size: 14px; line-height: 1.6;">${noticeMsg.replace(/\n/g, "<br/>")}</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #64748b;">Frontier Learning Academy - Result Publication Portal</p>
        </div>`,
      });
    } catch (e) {
      console.error("Email reminder error:", e.message);
    }

    res.json({ success: true, message: `Reminder notification & email sent to ${teacherUser.name} (${teacherUser.email})!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Admin Verify Result Batch
exports.verifyResultBatch = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const upload = await ResultUpload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Upload batch not found." });
    }

    upload.status = "Verified";
    upload.updatedAt = new Date();
    await upload.save();

    await Result.updateMany(
      { uploadId: upload._id },
      { status: "Verified", verifiedAt: new Date() }
    );

    await ResultLog.create({
      uploadId: upload._id,
      action: "Verified",
      performedBy: req.user._id || req.user.id,
      comment: "Result batch verified by Admin.",
    });

    // Notify Teacher
    const teacherUser = await User.findById(upload.teacher);
    if (teacherUser) {
      const notif = await Notification.create({
        userId: teacherUser._id,
        title: `Result Verified: ${upload.courseCode}`,
        message: `Admin verified your ${upload.resultType || "Final"} result upload for ${upload.courseCode} (${upload.session}).`,
        type: "general",
      });

      const io = getIO();
      if (io) io.emit("new_notification", { userId: teacherUser._id.toString(), notif });
    }

    res.json({ message: "Result batch verified successfully.", upload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 8. Admin Request Correction Batch
exports.requestCorrectionBatch = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Correction comment/reason is required." });
    }

    const upload = await ResultUpload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Upload batch not found." });
    }

    upload.status = "Correction Requested";
    upload.correctionComment = comment.trim();
    upload.updatedAt = new Date();
    await upload.save();

    await Result.updateMany(
      { uploadId: upload._id },
      { status: "Correction Requested", correctionComment: comment.trim() }
    );

    await ResultLog.create({
      uploadId: upload._id,
      action: "Correction Requested",
      performedBy: req.user._id || req.user.id,
      comment: comment.trim(),
    });

    // Notify Teacher in-app & email
    const teacherUser = await User.findById(upload.teacher);
    if (teacherUser && teacherUser.email) {
      const notif = await Notification.create({
        userId: teacherUser._id,
        title: `Correction Requested: ${upload.courseCode}`,
        message: `Admin requested result corrections for ${upload.courseCode}: "${comment.trim()}"`,
        type: "general",
      });

      const io = getIO();
      if (io) io.emit("new_notification", { userId: teacherUser._id.toString(), notif });
    }

    res.json({ message: "Correction request sent to teacher.", upload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 9. Admin Publish Result Batch
exports.publishResultBatch = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const upload = await ResultUpload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Upload batch not found." });
    }

    upload.status = "Published";
    upload.updatedAt = new Date();
    await upload.save();

    const publishDate = new Date();
    await Result.updateMany(
      { uploadId: upload._id },
      { status: "Published", publishedAt: publishDate }
    );

    await ResultLog.create({
      uploadId: upload._id,
      action: "Published",
      performedBy: req.user._id || req.user.id,
      comment: `${upload.resultType || "Final"} result batch published by Admin.`,
    });

    // Notify Enrolled Students immediately
    const batchResults = await Result.find({ uploadId: upload._id }).lean();
    for (const r of batchResults) {
      if (r.student) {
        try {
          const notif = await Notification.create({
            userId: r.student,
            title: `${r.resultType || "Final"} Result Published: ${r.courseCode}`,
            message: `Your ${r.resultType || "Final"} result for ${r.courseCode} (${r.courseTitle}) has been published!`,
            type: "general",
          });

          const io = getIO();
          if (io) io.emit("new_notification", { userId: r.student.toString(), notif });
        } catch (err) {}
      }
    }

    res.json({ message: "Results published successfully! Notifications sent to students.", upload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 10. Admin Calculate Semester GPA / CGPA
exports.calculateSemesterGPA = async (req, res) => {
  try {
    const { session, level, term } = req.body;
    if (!session || !level || !term) {
      return res.status(400).json({ error: "Session, Level, and Term are required." });
    }

    // Extract digits to support variants like "3", "Level 3", "Level-3"
    const levelDigit = String(level).replace(/\D/g, "");
    const termDigit = String(term).replace(/\D/g, "");

    const levelRegex = levelDigit ? new RegExp(`(Level\\s*[-_]?\\s*${levelDigit}|\\b${levelDigit}\\b)`, "i") : new RegExp(level, "i");
    const termRegex = termDigit ? new RegExp(`(Term\\s*[-_]?\\s*${termDigit}|\\b${termDigit}\\b)`, "i") : new RegExp(term, "i");
    const sessionRegex = new RegExp(String(session).replace("-", "[- ]?"), "i");

    // 1. Find matching batch upload IDs
    const matchingUploads = await ResultUpload.find({
      session: sessionRegex,
      level: levelRegex,
      term: termRegex,
    }).select("_id").lean();

    const uploadIds = matchingUploads.map((u) => u._id);

    // 2. Query Result records by uploadIds OR direct level/term/session match
    const termResults = await Result.find({
      $or: [
        { uploadId: { $in: uploadIds } },
        {
          session: sessionRegex,
          level: levelRegex,
          term: termRegex,
        },
      ],
    }).lean();

    if (termResults.length === 0) {
      return res.status(404).json({ error: `No result records found for ${level} ${term} (${session}).` });
    }

    const extractCourseGradePoint = (r) => {
      // 1. Check if gradePoint is a valid grade point number (0.0 to 4.0)
      if (r.gradePoint !== null && r.gradePoint !== undefined && !isNaN(Number(r.gradePoint))) {
        const num = Number(r.gradePoint);
        if (num >= 0 && num <= 4.0) return num;
      }

      // 2. Check letterGrade string (e.g. "3.50", "3.75", "4.00" or "A+", "A", "A-", etc.)
      const lgStr = String(r.letterGrade || "").trim().toUpperCase();
      if (lgStr !== "") {
        const parsedAsNum = Number(lgStr);
        if (!isNaN(parsedAsNum) && parsedAsNum >= 0 && parsedAsNum <= 4.0) {
          return parsedAsNum;
        }
        const gMap = {
          "A+": 4.00, "A": 3.75, "A-": 3.50, "B+": 3.25, "B": 3.00,
          "B-": 2.75, "C+": 2.50, "C": 2.25, "D": 2.00, "F": 0.00
        };
        if (gMap[lgStr] !== undefined) return gMap[lgStr];
      }

      // 3. Fallback to totalMarks calculation
      if (r.totalMarks !== null && r.totalMarks !== undefined && !isNaN(Number(r.totalMarks))) {
        const marks = Number(r.totalMarks);
        const cr = Number(r.creditHours) || 3;
        let pct = marks;
        if (marks >= 0 && marks <= 4.0) return marks;
        if (cr === 3 && marks <= 100) pct = marks;
        else if (cr === 1 && marks <= 50) pct = (marks / 50) * 100;
        else if (cr === 1.5 && marks <= 50) pct = (marks / 50) * 100;

        if (pct >= 80) return 4.00;
        if (pct >= 75) return 3.75;
        if (pct >= 70) return 3.50;
        if (pct >= 65) return 3.25;
        if (pct >= 60) return 3.00;
        if (pct >= 55) return 2.75;
        if (pct >= 50) return 2.50;
        if (pct >= 45) return 2.25;
        if (pct >= 40) return 2.00;
        return 0.00;
      }

      return 0.00;
    };

    const getLetterGrade = (gp) => {
      if (gp >= 4.00) return "A+";
      if (gp >= 3.75) return "A";
      if (gp >= 3.50) return "A-";
      if (gp >= 3.25) return "B+";
      if (gp >= 3.00) return "B";
      if (gp >= 2.75) return "B-";
      if (gp >= 2.50) return "C+";
      if (gp >= 2.25) return "C";
      if (gp >= 2.00) return "D";
      return "F";
    };

    const studentIds = Array.from(new Set(termResults.map((r) => r.studentId).filter(Boolean)));
    const calculatedSummary = [];

    for (const sId of studentIds) {
      // Filter target Level-Term course results for this student (excluding Midterm duplicate rows)
      const studentTermResults = termResults.filter((r) => String(r.studentId) === String(sId) && r.resultType !== "Midterm");

      // Deduplicate by courseCode (keep latest upload per course)
      const courseMap = {};
      studentTermResults.forEach((r) => {
        const cCode = String(r.courseCode || r._id).trim().toUpperCase();
        if (!courseMap[cCode] || new Date(r.updatedAt || r.createdAt) > new Date(courseMap[cCode].updatedAt || courseMap[cCode].createdAt)) {
          courseMap[cCode] = r;
        }
      });

      const uniqueCourses = Object.values(courseMap);
      
      let totalCiGi = 0;  // sum(Credit * GradePoint)
      let totalCi = 0;    // sum(Credit)
      let studentName = "";
      let studentObjId = null;

      for (const r of uniqueCourses) {
        if (!studentName && r.studentName) studentName = r.studentName;
        if (!studentObjId && r.student) studentObjId = r.student;

        const isLab = (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("lab") ||
                      (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("sessional") ||
                      (r.courseType + " " + r.courseTitle + " " + r.courseCode).toLowerCase().includes("practical");
        
        const ci = isLab ? 1 : (Number(r.creditHours) > 0 ? Number(r.creditHours) : 3);
        const gi = extractCourseGradePoint(r);
        
        totalCiGi += (ci * gi);
        totalCi += ci;

        // Ensure creditHours, gradePoint, and letterGrade are set on the Result document
        const lg = getLetterGrade(gi);
        await Result.findByIdAndUpdate(r._id, { creditHours: ci, gradePoint: gi, letterGrade: lg });
      }

      if (totalCi > 0) {
        // CGPA = sum(Ci * Gi) / sum(Ci)
        const cgpa = Number((totalCiGi / totalCi).toFixed(2));

        // Update all Result records for this student with their calculated CGPA
        await Result.updateMany(
          { studentId: sId },
          { semesterGPA: cgpa }
        );

        // Update or Create CGPARecord for student
        await CGPARecord.findOneAndUpdate(
          { studentId: sId, level, term },
          {
            student: studentObjId,
            studentId: sId,
            studentName: studentName || sId,
            session,
            level,
            term,
            semesterGPA: cgpa,
            semesterCredits: totalCi,
            cumulativeCGPA: cgpa,
            totalCumulativeCredits: totalCi,
            calculatedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        calculatedSummary.push({
          studentId: sId,
          studentName: studentName || sId,
          totalCredits: totalCi,
          cgpa,
        });
      }
    }

    res.json({
      message: `CGPA calculated successfully for ${calculatedSummary.length} students in ${level} ${term} (${session}).`,
      summary: calculatedSummary,
    });
  } catch (error) {
    console.error("calculateSemesterGPA error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 11. Admin Set Submission Deadline & Post Notice
exports.setDeadlineAndNotice = async (req, res) => {
  try {
    const {
      deadline,
      noticeTitle: _noticeTitle,
      noticeContent: _noticeContent,
      targetAudience,
      resultType,
      title: _title,
      content: _content,
      deadlineDate,
      session,
      level,
      term,
    } = req.body;

    // Support both field naming conventions
    const noticeTitle = _noticeTitle || _title;
    const noticeContent = _noticeContent || _content;

    if (!noticeContent || !noticeTitle) {
      return res.status(400).json({ error: "Notice title and content are required." });
    }

    const resolvedDeadline = deadlineDate || deadline || null;
    const resolvedAudience = targetAudience || "Teachers";

    // Determine resultDeadlineType from title or resultType field
    let resultDeadlineType = null;
    if (resultType === "Midterm" || (noticeTitle || "").toLowerCase().includes("midterm")) {
      resultDeadlineType = "Midterm";
    } else if (resultType === "Final" || (noticeTitle || "").toLowerCase().includes("final")) {
      resultDeadlineType = "Final";
    }

    // Create targeted Notice (with deadline info)
    const notice = await Notice.create({
      title: noticeTitle,
      content: noticeContent,
      author: req.user._id || req.user.id,
      authorName: req.user.name || "System Admin",
      targetAudience: resolvedAudience,
      isPinned: true,
      category: "Academic",
      deadlineDate: resolvedDeadline ? new Date(resolvedDeadline) : null,
      resultDeadlineType,
      session: session || "",
      level: level || "",
      term: term || "",
    });

    // Format deadline for display
    const deadlineDisplay = resolvedDeadline
      ? new Date(resolvedDeadline).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      : null;

    // Send Notification + Email to all targeted teachers/students
    const roleToNotify =
      resolvedAudience === "Teachers" ? "teacher" :
      resolvedAudience === "Students" ? "student" : null; // null = all

    const userQuery = roleToNotify ? { role: roleToNotify } : { role: { $in: ["teacher", "student"] } };
    const targetUsers = await User.find(userQuery).select("_id email").lean();

    // 1. Bulk insert in-app notifications (instant)
    const notifDocs = targetUsers.map((u) => ({
      userId: u._id,
      title: noticeTitle,
      message: deadlineDisplay
        ? `${noticeContent} — Deadline: ${deadlineDisplay}`
        : noticeContent,
      type: "general",
    }));

    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs);
    }

    const io = getIO();
    if (io) {
      targetUsers.forEach((u) => {
        io.emit("new_notification", { userId: u._id.toString(), title: noticeTitle });
      });
      io.emit("new_notice", { notice });
    }

    // 2. Respond to client IMMEDIATELY (under 50ms)
    res.json({ message: "Deadline notice posted and all teachers notified successfully.", notice });

    // 3. Dispatch emails asynchronously in background without blocking response
    setImmediate(async () => {
      for (const u of targetUsers) {
        if (!u.email) continue;
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #3b8db3, #2c4b66); padding: 24px 28px; color: white;">
                <h2 style="margin: 0; font-size: 20px;">📋 Result Deadline Notice</h2>
                <p style="margin: 4px 0 0 0; opacity: 0.85; font-size: 13px;">University of Frontier Technology, Bangladesh — Academic Registrar</p>
              </div>
              <div style="padding: 24px 28px; color: #1e293b;">
                <h3 style="color: #0f172a; margin: 0 0 12px 0;">${noticeTitle}</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">${noticeContent}</p>
                ${deadlineDisplay ? `
                  <div style="margin: 20px 0; padding: 14px 18px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                    <strong style="color: #92400e;">⏰ Submission Deadline:</strong>
                    <span style="color: #78350f; font-size: 15px; font-weight: 600; margin-left: 8px;">${deadlineDisplay}</span>
                  </div>` : ""}
                ${resultDeadlineType ? `
                  <div style="margin: 12px 0; padding: 10px 14px; background: #e0f2fe; border-radius: 6px; font-size: 13px; color: #0369a1;">
                    📚 This notice applies to: <strong>${resultDeadlineType} Result Submission</strong>
                  </div>` : ""}
                <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Please log in to your dashboard to view full details and upload your result marksheet before the deadline.</p>
              </div>
              <div style="background: #f8fafc; padding: 14px 28px; text-align: center; font-size: 12px; color: #94a3b8;">
                University of Frontier Technology, Bangladesh · UMS Result Portal
              </div>
            </div>
          `;
          await sendEmail(u.email, `[FLA] ${noticeTitle}`, emailHtml).catch(() => {});
        } catch (err) {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 12. Admin Schedule Automatic Publication for Final Results by Session & Level-Term
exports.schedulePublicationBySession = async (req, res) => {
  try {
    const { session, level, term, scheduledPublishDate } = req.body;
    if (!session || !level || !term || !scheduledPublishDate) {
      return res.status(400).json({ error: "Session, Level, Term, and Scheduled Publish Date are required." });
    }

    const pubDate = new Date(scheduledPublishDate);
    if (isNaN(pubDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for publication schedule." });
    }

    const levelDigit = String(level).replace(/\D/g, "");
    const termDigit = String(term).replace(/\D/g, "");

    const levelRegex = levelDigit ? new RegExp(`(Level\\s*[-_]?\\s*${levelDigit}|\\b${levelDigit}\\b)`, "i") : new RegExp(level, "i");
    const termRegex = termDigit ? new RegExp(`(Term\\s*[-_]?\\s*${termDigit}|\\b${termDigit}\\b)`, "i") : new RegExp(term, "i");
    const sessionRegex = new RegExp(String(session).replace("-", "[- ]?"), "i");

    // Update all Final result uploads for this session/level/term
    const updatedUploads = await ResultUpload.updateMany(
      {
        session: sessionRegex,
        level: levelRegex,
        term: termRegex,
        resultType: "Final",
      },
      { scheduledPublishDate: pubDate }
    );

    // Create targeted Notice announcement for students
    const formattedDate = pubDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    const notice = await Notice.create({
      title: `Final Results Release Schedule: ${level} ${term} (${session})`,
      content: `Official Final Results for ${level} ${term} (Session: ${session}) are scheduled for automatic publication on ${formattedDate}.`,
      author: req.user._id || req.user.id,
      authorName: req.user.name || "System Admin",
      targetAudience: "Students",
      isPinned: true,
      category: "Academic",
    });

    const io = getIO();
    if (io) io.emit("new_notice", { notice });

    res.json({
      message: `Automatic publication scheduled for ${level} ${term} (${session}) on ${formattedDate}.`,
      updatedCount: updatedUploads.modifiedCount,
      scheduledPublishDate: pubDate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 12. Teacher Set Midterm Correction Window Deadline & Lock
exports.setMidtermCorrectionDeadline = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { correctionWindowEnd } = req.body;

    const upload = await ResultUpload.findById(uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Result upload batch not found." });
    }

    if (upload.teacherEmail.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized to modify this result batch." });
    }

    upload.correctionWindowEnd = correctionWindowEnd ? new Date(correctionWindowEnd) : null;
    upload.updatedAt = new Date();
    await upload.save();

    await Result.updateMany(
      {
        $or: [
          { uploadId: upload._id },
          { courseCode: upload.courseCode, session: upload.session, resultType: upload.resultType }
        ]
      },
      { correctionWindowEnd: upload.correctionWindowEnd }
    );

    res.json({
      message: correctionWindowEnd
        ? `Midterm correction deadline set to ${new Date(correctionWindowEnd).toLocaleString()}. Marksheet will lock after this time.`
        : "Correction window deadline cleared.",
      upload,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 13. Student Get Published Results (with Automated Timed Scheduled Publication check & Level-Term Normalization)
exports.getStudentPublishedResults = async (req, res) => {
  try {
    const studentUser = req.user;
    const studentProfile = await Student.findOne({ universityEmail: studentUser.email }).lean();

    const studentIdStr = studentProfile?.studentId || studentUser.studentId || "";
    const emailPrefix = studentUser.email ? studentUser.email.split("@")[0] : "";

    // Automated Scheduled Publication Check: Check if any scheduled final upload batches reached release time
    const now = new Date();
    const scheduledUploads = await ResultUpload.find({
      resultType: "Final",
      status: { $ne: "Published" },
      scheduledPublishDate: { $ne: null, $lte: now },
    });

    for (const batch of scheduledUploads) {
      batch.status = "Published";
      batch.updatedAt = now;
      await batch.save();

      await Result.updateMany(
        { uploadId: batch._id },
        { status: "Published" }
      );
    }

    // Auto-correct any existing result records where Lab/Sessional course creditHours was set to 3 by default
    await Result.updateMany(
      {
        $or: [
          { courseType: { $regex: /lab|sessional|practical/i } },
          { courseTitle: { $regex: /lab|sessional|practical/i } },
          { courseCode: { $regex: /lab|sessional|practical/i } },
        ],
        creditHours: 3,
      },
      { $set: { creditHours: 1 } }
    );

    // Build comprehensive query conditions for student
    const studentUserEmail = studentUser.email ? studentUser.email.toLowerCase().trim() : "";
    const rawConditions = [
      { student: studentUser._id || studentUser.id },
      studentIdStr ? { studentId: studentIdStr } : null,
      studentUser.studentId ? { studentId: studentUser.studentId } : null,
      emailPrefix ? { studentId: emailPrefix } : null,
      studentUserEmail ? { studentEmail: studentUserEmail } : null,
      studentUserEmail ? { email: studentUserEmail } : null,
    ].filter(Boolean);

    let publishedResults = await Result.find({
      status: "Published",
      $or: rawConditions,
    })
      .populate("teacher", "name email department")
      .sort({ session: -1, level: 1, term: 1 })
      .lean();

    // Attach correctionWindowEnd from ResultUpload batch or Notice deadline to each result record
    const allUploads = await ResultUpload.find().lean();
    const deadlineNotices = await Notice.find({
      category: "Academic",
      deadlineDate: { $ne: null },
    }).lean();

    const nowTime = new Date();
    publishedResults = publishedResults.map(r => {
      let uBatch = r.uploadId ? allUploads.find(u => u._id.toString() === r.uploadId.toString()) : null;
      if (!uBatch && r.courseCode) {
        const cleanC = r.courseCode.replace(/\s+/g, "").toUpperCase();
        uBatch = allUploads.find(u =>
          u.courseCode.replace(/\s+/g, "").toUpperCase() === cleanC &&
          u.session === r.session &&
          (u.resultType || "Final") === (r.resultType || "Final")
        );
      }

      let cEnd = uBatch?.correctionWindowEnd || r.correctionWindowEnd || null;

      // Check if Admin Notice set a deadline Date for this session/level/term/resultType
      if (r.session && r.level && r.term) {
        const lDigit = String(r.level).replace(/\D/g, "");
        const tDigit = String(r.term).replace(/\D/g, "");
        const matchedNotice = deadlineNotices.find(n => {
          if (!n.session || !n.deadlineDate) return false;
          const sMatch = String(n.session).toLowerCase().includes(String(r.session).toLowerCase());
          const lMatch = lDigit ? n.level && n.level.includes(lDigit) : true;
          const tMatch = tDigit ? n.term && n.term.includes(tDigit) : true;
          const rTypeMatch = !n.resultDeadlineType || n.resultDeadlineType === r.resultType || (n.title && n.title.toLowerCase().includes((r.resultType || "").toLowerCase()));
          return sMatch && lMatch && tMatch && rTypeMatch;
        });

        if (matchedNotice && matchedNotice.deadlineDate) {
          cEnd = matchedNotice.deadlineDate;
        }
      }

      const isClosed = cEnd ? new Date(cEnd) < nowTime : false;

      return {
        ...r,
        uploadId: r.uploadId || uBatch?._id || null,
        correctionWindowEnd: cEnd,
        isCorrectionClosed: isClosed,
      };
    });

    // STRICT FILTER: Fetch student's APPROVED registrations ONLY
    const Registration = require("../models/Registration");
    const approvedRegs = await Registration.find({
      $or: [
        { user: studentUser._id || studentUser.id },
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
        ...(studentUser.studentId ? [{ studentId: studentUser.studentId }] : [])
      ],
      status: "Approved"
    }).lean();

    const approvedLevelTerms = new Set();
    const approvedCourseCodes = new Set();

    approvedRegs.forEach(reg => {
      const lDigit = (reg.level || "").replace(/\D/g, "");
      const tDigit = (reg.term || "").replace(/\D/g, "");
      if (lDigit && tDigit) {
        approvedLevelTerms.add(`Level ${lDigit} - Term ${tDigit}`);
        approvedLevelTerms.add(`Level ${lDigit} Term ${tDigit}`);
        approvedLevelTerms.add(`L${lDigit}T${tDigit}`);
        approvedLevelTerms.add(`${lDigit}-${tDigit}`);
      }
      (reg.selectedCourses || []).forEach(sc => {
        const codeClean = (sc.courseCode || sc.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (codeClean) approvedCourseCodes.add(codeClean);
      });
    });

    publishedResults = publishedResults.filter(r => {
      if (approvedRegs.length === 0) return false;

      const codeClean = (r.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const rLDigit = (r.level || "").replace(/\D/g, "");
      const rTDigit = (r.term || "").replace(/\D/g, "");

      if (codeClean && approvedCourseCodes.has(codeClean)) return true;

      if (rLDigit && rTDigit) {
        const rLTKey = `Level ${rLDigit} - Term ${rTDigit}`;
        if (approvedLevelTerms.has(rLTKey)) return true;
      }

      return false;
    });

    // Helper to normalize Level-Term keys cleanly (e.g. "Level-3", "Term-2" -> "Level 3 - Term 2")
    const normalizeLevelTermKey = (lStr, tStr) => {
      const lNum = String(lStr || "").match(/\d+/)?.[0] || "1";
      const tNum = String(tStr || "").match(/\d+/)?.[0] || "1";
      return `Level ${lNum} - Term ${tNum}`;
    };

    // Group results by normalized Level-Term
    const resultsByLevelTerm = {};
    publishedResults.forEach(r => {
      const ltKey = normalizeLevelTermKey(r.level, r.term);
      if (!resultsByLevelTerm[ltKey]) {
        resultsByLevelTerm[ltKey] = [];
      }
      resultsByLevelTerm[ltKey].push(r);
    });

    res.json({
      student: studentProfile,
      currentLevel: studentProfile?.currentLevel || 1,
      currentTerm: studentProfile?.currentTerm || 1,
      session: studentProfile?.session || "2024-25",
      results: publishedResults,
      resultsByLevelTerm,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPaymentReceiptData = exports.getMoneyReceipt = async (req, res) => {
  res.json({ message: "Receipt endpoint" });
};

// Student submits a correction request
exports.createCorrectionRequest = async (req, res) => {
  try {
    const { uploadId, resultId, courseCode, courseTitle, teacherEmail, studentMessage } = req.body;

    if (!studentMessage || !studentMessage.trim()) {
      return res.status(400).json({ error: "Please write a message explaining the correction issue." });
    }

    let uploadBatch = uploadId ? await ResultUpload.findById(uploadId) : null;
    if (!uploadBatch && courseCode) {
      const cleanC = courseCode.replace(/\s+/g, "").toUpperCase();
      uploadBatch = await ResultUpload.findOne({ courseCode: { $regex: new RegExp(cleanC, "i") } });
    }

    if (uploadBatch && (uploadBatch.isCorrectionClosed || (uploadBatch.correctionWindowEnd && new Date() > new Date(uploadBatch.correctionWindowEnd)))) {
      return res.status(400).json({
        error: `Correction deadline passed for this marksheet. Further correction requests are locked.`,
      });
    }

    if (courseCode) {
      const Assessment = require("../models/Assessment");
      const cleanC = courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const assCheck = await Assessment.findOne({ courseCode: { $regex: new RegExp(cleanC, "i") } }).lean();
      if (assCheck && (assCheck.isCorrectionClosed || (assCheck.correctionWindowEnd && new Date() > new Date(assCheck.correctionWindowEnd)))) {
        return res.status(400).json({
          error: `Correction request deadline passed for this assessment. Submissions are locked.`,
        });
      }
    }

    let actualStudentId = req.user.studentId;
    if (!actualStudentId || actualStudentId === "Student") {
      if (resultId) {
        const rDoc = await Result.findById(resultId).lean();
        if (rDoc && rDoc.studentId) actualStudentId = rDoc.studentId;
      }
    }
    if (!actualStudentId || actualStudentId === "Student") {
      const sProf = await Student.findOne({ universityEmail: req.user.email.toLowerCase() }).lean();
      if (sProf && sProf.studentId) actualStudentId = sProf.studentId;
    }

    let finalTeacherEmail = (teacherEmail || uploadBatch?.teacherEmail || "").toLowerCase().trim();

    if (!finalTeacherEmail && courseCode) {
      const Assessment = require("../models/Assessment");
      const cleanCode = courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const assDoc = await Assessment.findOne({ courseCode: { $regex: new RegExp(cleanCode, "i") } }).populate("uploadedBy", "email");
      if (assDoc && assDoc.uploadedBy && assDoc.uploadedBy.email) {
        finalTeacherEmail = assDoc.uploadedBy.email.toLowerCase().trim();
      }
    }

    if (!finalTeacherEmail && courseCode) {
      const Course = require("../models/Course");
      const cleanCode = courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const courseDoc = await Course.findOne({ displayCode: { $regex: new RegExp(cleanCode, "i") } }).populate("teacher", "email");
      if (courseDoc && courseDoc.teacher && courseDoc.teacher.email) {
        finalTeacherEmail = courseDoc.teacher.email.toLowerCase().trim();
      }
    }

    const reqDoc = await ResultCorrectionRequest.create({
      uploadId: uploadBatch ? uploadBatch._id : null,
      resultId: resultId || null,
      student: req.user._id || req.user.id,
      studentId: actualStudentId || "Student",
      studentName: req.user.name || "Student",
      teacherEmail: finalTeacherEmail,
      courseCode: courseCode || uploadBatch?.courseCode || "",
      courseTitle: courseTitle || uploadBatch?.courseTitle || "",
      studentMessage: studentMessage.trim(),
    });

    // Notify Course Teacher
    if (finalTeacherEmail) {
      const teacherUser = await User.findOne({ email: finalTeacherEmail });
      if (teacherUser) {
        try {
          const notif = await Notification.create({
            userId: teacherUser._id,
            title: `Correction Request: ${courseCode || uploadBatch?.courseCode || ""}`,
            message: `Student ${req.user.name} (${actualStudentId}) submitted a correction request for ${courseCode || uploadBatch?.courseCode || ""}.`,
            type: "general",
          });
          const io = getIO();
          if (io) io.emit("new_notification", { userId: teacherUser._id.toString(), notif });
        } catch (err) {}
      }
    }

    res.json({ message: "Correction request sent to course teacher successfully!", request: reqDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch student's correction requests
exports.getStudentCorrectionRequests = async (req, res) => {
  try {
    const requests = await ResultCorrectionRequest.find({
      student: req.user._id || req.user.id,
    }).sort({ createdAt: -1 }).lean();

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch teacher's correction requests
exports.getTeacherCorrectionRequests = async (req, res) => {
  try {
    const teacherEmail = (req.user.email || "").toLowerCase().trim();

    const Course = require("../models/Course");
    const Teacher = require("../models/Teacher");
    const teacherLmsCourses = await Course.find({ teacher: req.user.uid || req.user._id || req.user.id }).lean();
    const teacherProfile = await Teacher.findOne({ email: { $regex: new RegExp(`^${teacherEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }).lean();

    const assignedCodesList = [];
    (teacherLmsCourses || []).forEach(c => {
      const code = String(c.displayCode || c.name || "").trim();
      if (code) assignedCodesList.push(code);
    });
    (teacherProfile?.assignedCourses || []).forEach(c => {
      const code = String(c.courseCode || c.courseName || "").trim();
      if (code) assignedCodesList.push(code);
    });

    const conditions = [
      { teacherEmail: { $regex: new RegExp(`^${teacherEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
      { teacher: req.user.uid || req.user._id || req.user.id }
    ];

    if (assignedCodesList.length > 0) {
      const codeRegexes = assignedCodesList.map(c => new RegExp(c.replace(/[^a-zA-Z0-9]/g, ""), "i"));
      conditions.push({ courseCode: { $in: codeRegexes } });
    }

    const requests = await ResultCorrectionRequest.find({ $or: conditions })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Teacher replies to student request or marks resolved
exports.replyToCorrectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { teacherReply, status } = req.body;

    const reqDoc = await ResultCorrectionRequest.findById(requestId);
    if (!reqDoc) {
      return res.status(404).json({ error: "Correction request not found." });
    }

    if (teacherReply !== undefined) reqDoc.teacherReply = teacherReply;
    if (status) reqDoc.status = status;
    reqDoc.updatedAt = new Date();
    await reqDoc.save();

    // Notify Student
    if (reqDoc.student) {
      try {
        const notif = await Notification.create({
          userId: reqDoc.student,
          title: `Result Request Updated: ${reqDoc.courseCode}`,
          message: `Teacher ${req.user.name || req.user.email} responded to your correction request for ${reqDoc.courseCode}: "${status || 'Updated'}"`,
          type: "general",
        });
        const io = getIO();
        if (io) io.emit("new_notification", { userId: reqDoc.student.toString(), notif });
      } catch (err) {}
    }

    res.json({ message: "Response sent to student successfully.", request: reqDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Teacher batch update marks directly from View Marksheet Modal
exports.batchUpdateMarks = async (req, res) => {
  try {
    const { uploadId, updatedResults } = req.body;
    if (!Array.isArray(updatedResults) || updatedResults.length === 0) {
      return res.status(400).json({ error: "No marks provided for update." });
    }

    if (uploadId) {
      const upBatch = await ResultUpload.findById(uploadId);
      if (upBatch) {
        const lDigit = String(upBatch.level || "").replace(/\D/g, "");
        const tDigit = String(upBatch.term || "").replace(/\D/g, "");
        const lRegex = lDigit ? new RegExp(`(Level\\s*[-_]?\\s*${lDigit}|\\b${lDigit}\\b)`, "i") : new RegExp(upBatch.level || "", "i");
        const tRegex = tDigit ? new RegExp(`(Term\\s*[-_]?\\s*${tDigit}|\\b${tDigit}\\b)`, "i") : new RegExp(upBatch.term || "", "i");

        const notice = await Notice.findOne({
          category: "Academic",
          deadlineDate: { $ne: null },
          $or: [
            { resultDeadlineType: upBatch.resultType },
            { title: { $regex: new RegExp(upBatch.resultType || "Result", "i") } }
          ],
          session: { $regex: new RegExp(String(upBatch.session).replace("-", "[- ]?"), "i") },
          level: lRegex,
          term: tRegex,
        }).sort({ deadlineDate: -1 }).lean();

        if (notice && notice.deadlineDate && new Date() > new Date(notice.deadlineDate)) {
          return res.status(403).json({
            error: `Submission deadline passed on ${new Date(notice.deadlineDate).toLocaleString()}. Marksheet modifications are locked.`,
          });
        }
      }
    }

    for (const item of updatedResults) {
      const rDoc = await Result.findById(item.resultId || item._id);
      if (rDoc) {
        if (item.midPartA !== undefined) rDoc.midPartA = parseOptionalNumber(item.midPartA);
        if (item.midPartB !== undefined) rDoc.midPartB = parseOptionalNumber(item.midPartB);
        if (item.finalPartA !== undefined) rDoc.finalPartA = parseOptionalNumber(item.finalPartA);
        if (item.finalPartB !== undefined) rDoc.finalPartB = parseOptionalNumber(item.finalPartB);
        if (item.attendance !== undefined) rDoc.attendance = parseOptionalNumber(item.attendance);
        if (item.continuousAssessment !== undefined) rDoc.continuousAssessment = parseOptionalNumber(item.continuousAssessment);
        if (item.totalMarks !== undefined) rDoc.totalMarks = parseOptionalNumber(item.totalMarks);

        // Recalculate total if individual marks updated
        const midSum = (Number(rDoc.midPartA) || 0) + (Number(rDoc.midPartB) || 0);
        const finalSum = (rDoc.finalPartA !== null || rDoc.finalPartB !== null) 
          ? ((Number(rDoc.finalPartA) || 0) + (Number(rDoc.finalPartB) || 0))
          : (Number(rDoc.finalExam) || 0);
        const attSum = (Number(rDoc.attendance) || 0);
        const contSum = (Number(rDoc.continuousAssessment) || 0);
        rDoc.totalMarks = midSum + finalSum + attSum + contSum;

        rDoc.updatedAt = new Date();
        await rDoc.save();
      }
    }

    if (uploadId) {
      await ResultUpload.findByIdAndUpdate(uploadId, { updatedAt: new Date() });
    }

    res.json({ message: "Marksheet updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
