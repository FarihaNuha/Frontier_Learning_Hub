const AcademicProfile = require("../models/AcademicProfile");
const CGPARecord = require("../models/CGPARecord");
const RetakeRequest = require("../models/RetakeRequest");
const Transcript = require("../models/Transcript");
const AuditLog = require("../models/AuditLog");
const Result = require("../models/Result");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseImport = require("../models/CourseImport");
const Enrollment = require("../models/Enrollment");
const Registration = require("../models/Registration");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

// Audit Log Helper
const createAuditLog = async (req, userObj, action, details) => {
  try {
    const user = userObj || req?.user;
    await AuditLog.create({
      user: user?._id || user?.id || null,
      userName: user?.name || "System",
      userEmail: user?.email || "",
      role: user?.role || "system",
      action,
      details,
      ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || "",
    });
  } catch (err) {
    console.error("Error creating audit log:", err);
  }
};
exports.createAuditLog = createAuditLog;

// Helper to compute grade point from letter grade or stored number
const computeGradePoint = (letterGrade, existingGp) => {
  if (existingGp !== undefined && existingGp !== null && existingGp !== "" && !isNaN(Number(existingGp)) && Number(existingGp) > 0) {
    return Number(existingGp);
  }
  const l = String(letterGrade || "").toUpperCase().trim();
  switch (l) {
    case "A+": return 4.00;
    case "A": return 3.75;
    case "A-": return 3.50;
    case "B+": return 3.25;
    case "B": return 3.00;
    case "B-": return 2.75;
    case "C+": return 2.50;
    case "C": return 2.25;
    case "D": return 2.00;
    case "F": return 0.00;
    default: return existingGp ? Number(existingGp) : 0.00;
  }
};

// 1. Core CGPA Calculation Engine with Retake Replacement Rule
const calculateStudentCGPA = async (studentUserObj) => {
  try {
    const studentUser = studentUserObj || {};
    const userId = studentUser._id || studentUser.id || studentUser.uid;
    
    const studentOrConditions = [];
    if (studentUser.email) studentOrConditions.push({ universityEmail: studentUser.email });
    if (studentUser.studentId) studentOrConditions.push({ studentId: studentUser.studentId });

    const studentProfile = studentOrConditions.length > 0
      ? await Student.findOne({ $or: studentOrConditions }).lean()
      : null;

    const studentIdStr = studentProfile?.studentId || studentUser.studentId || "";

    // Query all Published results for student
    const queryConditions = [];
    if (userId) queryConditions.push({ student: userId });
    if (studentIdStr) queryConditions.push({ studentId: studentIdStr });

    const publishedResults = queryConditions.length > 0
      ? await Result.find({
          status: "Published",
          $or: queryConditions,
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    // Group results by Course Code to apply Retake Replacement Rule
    const courseAttemptsMap = new Map();
    publishedResults.forEach((r) => {
      const code = (r.courseCode || "").toUpperCase();
      if (code) {
        if (!courseAttemptsMap.has(code)) {
          courseAttemptsMap.set(code, []);
        }
        courseAttemptsMap.get(code).push(r);
      }
    });

    const latestCourseResults = [];
    const completedCoursesList = [];
    let totalCreditsEarned = 0;
    let totalPointsEarned = 0;
    let totalCreditsAttemptedForCGPA = 0;

    courseAttemptsMap.forEach((attempts) => {
      attempts.sort((a, b) => {
        const gpA = computeGradePoint(a.letterGrade, a.gradePoint);
        const gpB = computeGradePoint(b.letterGrade, b.gradePoint);
        if (gpB !== gpA) return gpB - gpA;
        return new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0);
      });
      const latest = attempts[0];
      latestCourseResults.push(latest);

      const cr = Number(latest.creditHours) || 3;
      const gp = computeGradePoint(latest.letterGrade, latest.gradePoint);

      if (latest.letterGrade !== "F" && gp > 0) {
        totalCreditsEarned += cr;
        completedCoursesList.push({
          courseCode: latest.courseCode,
          courseTitle: latest.courseTitle,
          creditHours: cr,
          letterGrade: latest.letterGrade || (gp >= 4.0 ? "A+" : gp >= 3.75 ? "A" : gp >= 3.5 ? "A-" : gp >= 3.25 ? "B+" : gp >= 3.0 ? "B" : "P"),
          gradePoint: gp,
          completedSession: latest.session,
        });

        totalPointsEarned += gp * cr;
        totalCreditsAttemptedForCGPA += cr;
      }
    });

    const overallCGPA = totalCreditsAttemptedForCGPA > 0
      ? Number((totalPointsEarned / totalCreditsAttemptedForCGPA).toFixed(2))
      : 0.0;

    // Calculate Semester GPAs
    const semesterGroups = {};
    publishedResults.forEach((r) => {
      const semKey = `${r.level || "Level-1"} - ${r.term || "Term-1"}`;
      if (!semesterGroups[semKey]) semesterGroups[semKey] = [];
      semesterGroups[semKey].push(r);
    });

    let lastSemGPA = 0.0;
    const totalReqCredits = 140;

    for (const [semKey, rawResList] of Object.entries(semesterGroups)) {
      const semCourseMap = new Map();
      rawResList.forEach((r) => {
        const code = (r.courseCode || "").toUpperCase().trim();
        if (!code) return;
        const gp = computeGradePoint(r.letterGrade, r.gradePoint);
        if (!semCourseMap.has(code) || gp > semCourseMap.get(code).gp) {
          semCourseMap.set(code, { r, cr: Number(r.creditHours) || 3, gp });
        }
      });

      let semPoints = 0;
      let semCredits = 0;
      semCourseMap.forEach(({ cr, gp, r }) => {
        if (r.letterGrade !== "F" && gp > 0) {
          semPoints += gp * cr;
          semCredits += cr;
        }
      });

      const semGPA = semCredits > 0 ? Number((semPoints / semCredits).toFixed(2)) : 0.0;
      lastSemGPA = semGPA;

      const parts = semKey.split("-").map((s) => s.trim());
      if (studentIdStr && studentIdStr.trim()) {
        try {
          await CGPARecord.findOneAndUpdate(
            { studentId: studentIdStr, level: parts[0] || "Level-1", term: parts[1] || "Term-1" },
            {
              student: userId,
              studentId: studentIdStr,
              session: rawResList[0]?.session || "2025-26",
              level: parts[0] || "Level-1",
              term: parts[1] || "Term-1",
              semesterGPA: semGPA,
              semesterCredits: semCredits,
              cumulativeCGPA: overallCGPA,
              totalCumulativeCredits: totalCreditsEarned,
              calculatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error("CGPARecord upsert error:", err.message);
        }
      }
    }

    // Update or Create AcademicProfile safely
    let academicProfile = null;
    if (userId || studentIdStr) {
      try {
        academicProfile = await AcademicProfile.findOne({
          $or: [
            ...(userId ? [{ student: userId }] : []),
            ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
          ],
        });
      } catch (err) {
        console.error("AcademicProfile query error:", err.message);
      }
    }

    let academicStatus = "Regular";
    if (overallCGPA > 0 && overallCGPA < 2.0) academicStatus = "Probation";
    if (completedCoursesList.some((c) => c.letterGrade === "F")) academicStatus = "Retake";
    if (totalCreditsEarned >= totalReqCredits) academicStatus = "Graduated";

    const levelStr = studentProfile?.currentLevel ? `Level-${studentProfile.currentLevel}` : "Level-1";
    const termStr = studentProfile?.currentTerm ? `Term-${studentProfile.currentTerm}` : "Term-1";

    try {
      if (!academicProfile && (userId || studentIdStr)) {
        academicProfile = await AcademicProfile.create({
          student: userId,
          studentId: studentIdStr || "STD_001",
          department: studentProfile?.department || studentUser.department || "EDTE",
          program: studentProfile?.program || "B.Sc. in EDTE",
          batch: studentProfile?.batch || "2023",
          session: studentProfile?.session || "2025-26",
          currentLevel: levelStr,
          currentTerm: termStr,
          totalCreditsRequired: totalReqCredits,
          totalCreditsEarned,
          creditsRemaining: Math.max(0, totalReqCredits - totalCreditsEarned),
          currentCGPA: overallCGPA,
          lastSemesterGPA: lastSemGPA,
          academicStatus,
          completedCourses: completedCoursesList,
          isGraduated: totalCreditsEarned >= totalReqCredits,
        });
      } else if (academicProfile) {
        if (!academicProfile.studentId) academicProfile.studentId = studentIdStr || studentUser.studentId || "STD_001";
        if (!academicProfile.department) academicProfile.department = studentProfile?.department || studentUser.department || "EDTE";
        if (!academicProfile.program) academicProfile.program = studentProfile?.program || studentUser.program || "B.Sc. in EDTE";
        if (!academicProfile.session) academicProfile.session = studentProfile?.session || studentUser.session || "2022-23";
        if (!academicProfile.batch) academicProfile.batch = studentProfile?.batch || studentUser.batch || "5th";
        academicProfile.currentLevel = levelStr;
        academicProfile.currentTerm = termStr;
        academicProfile.totalCreditsEarned = totalCreditsEarned;
        academicProfile.creditsRemaining = Math.max(0, totalReqCredits - totalCreditsEarned);
        academicProfile.currentCGPA = overallCGPA;
        academicProfile.lastSemesterGPA = lastSemGPA;
        academicProfile.academicStatus = academicProfile.isGraduated ? "Graduated" : academicStatus;
        academicProfile.completedCourses = completedCoursesList;
        academicProfile.updatedAt = new Date();
        await academicProfile.save();
      }
    } catch (err) {
      console.error("AcademicProfile update error:", err.message);
    }

    return {
      overallCGPA,
      lastSemGPA,
      totalCreditsEarned,
      creditsRemaining: Math.max(0, totalReqCredits - totalCreditsEarned),
      academicStatus: academicProfile?.academicStatus || "Regular",
      completedCourses: completedCoursesList,
    };
  } catch (error) {
    console.error("calculateStudentCGPA error:", error);
    return {
      overallCGPA: 0.0,
      lastSemGPA: 0.0,
      totalCreditsEarned: 0,
      creditsRemaining: 140,
      academicStatus: "Regular",
    };
  }
};
exports.calculateStudentCGPA = calculateStudentCGPA;

// 2. Get Student Academic Profile
exports.getStudentAcademicProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id || req.user.uid;
    const emailLower = (req.user.email || "").toLowerCase().trim();

    const cgpaSummary = await calculateStudentCGPA(req.user);

    const studentOrConditions = [];
    if (emailLower) {
      studentOrConditions.push({ universityEmail: emailLower });
      studentOrConditions.push({ universityEmail: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });
    }
    if (req.user.studentId) studentOrConditions.push({ studentId: req.user.studentId });

    const studentProfile = studentOrConditions.length > 0
      ? await Student.findOne({ $or: studentOrConditions }).lean()
      : null;

    const studentIdStr = studentProfile?.studentId || req.user.studentId || "";

    const activeReg = await Registration.findOne({
      $or: [
        ...(userId ? [{ student: userId }] : []),
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
        ...(emailLower ? [{ studentEmail: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }] : []),
      ],
    }).sort({ createdAt: -1 }).lean();

    const profileOrConditions = [];
    if (userId) profileOrConditions.push({ student: userId });
    if (studentIdStr) profileOrConditions.push({ studentId: studentIdStr });

    const profile = profileOrConditions.length > 0
      ? await AcademicProfile.findOne({ $or: profileOrConditions }).lean()
      : null;

    const retakes = profileOrConditions.length > 0
      ? await RetakeRequest.find({ $or: profileOrConditions }).lean()
      : [];

    const studentDept = studentProfile?.department || req.user.department || activeReg?.department || "EDTE";

    // Gather all distinct courses the student has registered for, completed, or enrolled in
    const registeredCoursesMap = new Map();

    (profile?.completedCourses || []).forEach((c) => {
      const code = (c.courseCode || "").toUpperCase().trim();
      if (code && !registeredCoursesMap.has(code)) {
        registeredCoursesMap.set(code, Number(c.creditHours) || 3);
      }
    });

    const allStudentRegs = await Registration.find({
      $or: [
        ...(userId ? [{ student: userId }] : []),
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
        ...(emailLower ? [{ studentEmail: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }] : []),
      ],
    }).lean();

    allStudentRegs.forEach((reg) => {
      (reg.selectedCourses || []).forEach((sc) => {
        const code = (sc.courseCode || sc.code || "").toUpperCase().trim();
        const cr = Number(sc.creditHours) || 3;
        if (code && (!registeredCoursesMap.has(code) || cr > registeredCoursesMap.get(code))) {
          registeredCoursesMap.set(code, cr);
        }
      });
    });

    const enrollments = await Enrollment.find({
      $or: [
        ...(userId ? [{ student: userId }] : []),
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      ]
    }).populate("course").lean();

    enrollments.forEach((e) => {
      if (e.course && e.course.displayCode) {
        const code = (e.course.displayCode || "").toUpperCase().trim();
        if (code && !registeredCoursesMap.has(code)) {
          registeredCoursesMap.set(code, 3);
        }
      }
    });

    let totalRegisteredCredits = 0;
    registeredCoursesMap.forEach((cr) => {
      totalRegisteredCredits += cr;
    });

    const totalReqCredits = 140;
    const finalCreditsEarned = totalRegisteredCredits > 0 ? totalRegisteredCredits : (cgpaSummary.totalCreditsEarned || profile?.totalCreditsEarned || 0);
    const finalCreditsRemaining = Math.max(0, totalReqCredits - finalCreditsEarned);

    const formatLvl = (l) => {
      if (!l) return null;
      const s = String(l).trim();
      if (s.toLowerCase().startsWith("level-")) return s;
      if (s.toLowerCase().startsWith("level")) return s.replace(/level\s*/i, "Level-");
      return `Level-${s}`;
    };

    const formatTrm = (t) => {
      if (!t) return null;
      const s = String(t).trim();
      if (s.toLowerCase().startsWith("term-")) return s;
      if (s.toLowerCase().startsWith("term")) return s.replace(/term\s*/i, "Term-");
      return `Term-${s}`;
    };

    const rawLevel = activeReg?.level || studentProfile?.currentLevel || profile?.currentLevel || req.user?.currentLevel;
    const rawTerm = activeReg?.term || studentProfile?.currentTerm || profile?.currentTerm || req.user?.currentTerm;

    const currentLevelStr = formatLvl(rawLevel) || "Level-3";
    const currentTermStr = formatTrm(rawTerm) || "Term-2";

    const activeSessionStr = studentProfile?.session || activeReg?.session || profile?.session || req.user.session || "2024-25";
    const activeBatchStr = studentProfile?.batch || profile?.batch || req.user.batch || (activeSessionStr ? activeSessionStr.split("-")[0] : "2024");
    const activeProgramStr = studentProfile?.program || profile?.program || req.user.program || `B.Sc. in ${studentDept}`;

    // Resolved completed courses: prefer populated profile.completedCourses or fallback to cgpaSummary.completedCourses
    const resolvedCompletedCourses = (profile?.completedCourses && profile.completedCourses.length > 0)
      ? profile.completedCourses
      : (cgpaSummary?.completedCourses || []);

    // Build completed courses lookup set
    const completedCodeSet = new Set(
      resolvedCompletedCourses.map((c) => (c.courseCode || "").replace(/\s+/g, "").toUpperCase())
    );

    // Fetch official curriculum courses for student's department from CourseImport
    const deptConditions = [
      { department: new RegExp(`^${studentDept}$`, "i") }
    ];
    if (studentDept && studentDept.toUpperCase() === "EDTE") {
      deptConditions.push({ department: /educational technology/i });
    }
    const allCurriculumCourses = await CourseImport.find({ $or: deptConditions })
      .sort({ level: 1, term: 1, courseCode: 1 })
      .lean();

    // Filter out courses already completed to get incomplete/remaining courses
    const incompleteCourses = allCurriculumCourses.filter((ci) => {
      const cleanCode = (ci.courseCode || "").replace(/\s+/g, "").toUpperCase();
      return !completedCodeSet.has(cleanCode);
    });

    const profileObj = {
      ...(profile || {}),
      studentName: studentProfile?.name || req.user.name || activeReg?.studentName || profile?.studentName || "Student",
      studentId: studentIdStr || req.user.studentId || activeReg?.studentId || profile?.studentId || "N/A",
      department: studentProfile?.department || req.user.department || activeReg?.department || profile?.department || "EDTE",
      program: activeProgramStr,
      session: activeSessionStr,
      batch: activeBatchStr,
      universityEmail: studentProfile?.universityEmail || req.user.email,
      currentLevel: currentLevelStr,
      currentTerm: currentTermStr,
      totalCreditsRequired: totalReqCredits,
      totalCreditsEarned: finalCreditsEarned,
      creditsRemaining: finalCreditsRemaining,
      currentCGPA: cgpaSummary.overallCGPA || profile?.currentCGPA || 0.0,
      lastSemesterGPA: cgpaSummary.lastSemGPA || profile?.lastSemesterGPA || 0.0,
      academicStatus: profile?.academicStatus || "Regular",
      cgpaSummary,
    };

    res.json({
      profile: profileObj,
      completedCourses: resolvedCompletedCourses,
      incompleteCourses,
      retakes,
    });
  } catch (error) {
    console.error("getStudentAcademicProfile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 3. Get Student Transcript & PDF Export Data
exports.getStudentTranscript = async (req, res) => {
  try {
    let targetUser = req.user;
    if (req.query.studentId && (req.user.role === "admin" || req.user.role === "teacher")) {
      const foundUser = await User.findOne({ studentId: req.query.studentId, role: "student" });
      if (foundUser) targetUser = foundUser;
    }

    const studentProfile = await Student.findOne({ universityEmail: targetUser.email }).lean();
    const studentIdStr = studentProfile?.studentId || targetUser.studentId || "";
    const targetUserId = targetUser._id || targetUser.id || targetUser.uid;

    const cgpaSummary = await calculateStudentCGPA(targetUser);

    const academicProfile = await AcademicProfile.findOne({
      $or: [
        ...(targetUserId ? [{ student: targetUserId }] : []),
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      ],
    }).lean();

    const publishedResults = await Result.find({
      status: "Published",
      $or: [
        ...(targetUserId ? [{ student: targetUserId }] : []),
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      ],
    })
      .sort({ session: 1, level: 1, term: 1, createdAt: -1 })
      .lean();

    // Group by Level-Term and deduplicate per course code
    const semesterResultsMap = {};
    publishedResults.forEach((r) => {
      const semKey = `${r.level || "Level-1"} - ${r.term || "Term-1"}`;
      if (!semesterResultsMap[semKey]) semesterResultsMap[semKey] = [];
      semesterResultsMap[semKey].push(r);
    });

    const semesterBreakdown = [];
    for (const [semKey, rawList] of Object.entries(semesterResultsMap)) {
      const courseMap = new Map();

      rawList.forEach((r) => {
        const code = (r.courseCode || "").toUpperCase().trim();
        if (!code) return;

        const gp = computeGradePoint(r.letterGrade, r.gradePoint);
        const courseObj = {
          ...r,
          courseCode: code,
          letterGrade: r.letterGrade || (gp > 0 ? "P" : "-"),
          gradePoint: gp,
        };

        if (!courseMap.has(code)) {
          courseMap.set(code, courseObj);
        } else {
          const existing = courseMap.get(code);
          if ((!existing.letterGrade || existing.letterGrade === "-") && r.letterGrade) {
            courseMap.set(code, courseObj);
          } else if (gp > existing.gradePoint) {
            courseMap.set(code, courseObj);
          }
        }
      });

      const deduplicatedCourses = Array.from(courseMap.values());
      if (deduplicatedCourses.length === 0) continue;

      let semPoints = 0;
      let semCredits = 0;
      deduplicatedCourses.forEach((r) => {
        const cr = Number(r.creditHours) || 3;
        const gp = Number(r.gradePoint) || 0;
        if (r.letterGrade !== "F" && gp > 0) {
          semPoints += gp * cr;
          semCredits += cr;
        }
      });
      const semGPA = semCredits > 0 ? Number((semPoints / semCredits).toFixed(2)) : 0.0;

      semesterBreakdown.push({
        semesterName: semKey,
        session: rawList[0]?.session || "",
        courses: deduplicatedCourses,
        semesterGPA: semGPA,
        totalCredits: semCredits,
      });
    }

    await createAuditLog(req, req.user, "Transcript Download", `Downloaded official transcript for student ID ${studentIdStr}`);

    res.json({
      studentInfo: {
        name: targetUser.name,
        studentId: studentIdStr,
        email: targetUser.email,
        department: studentProfile?.department || targetUser.department || "EDTE",
        program: studentProfile?.program || "B.Sc. in EDTE",
        batch: studentProfile?.batch || "2022-23",
        session: studentProfile?.session || "2023-24",
        currentLevel: academicProfile?.currentLevel || "Level 1",
        currentTerm: academicProfile?.currentTerm || "Term 1",
        academicStatus: academicProfile?.academicStatus || "Regular",
      },
      cgpa: cgpaSummary.overallCGPA !== undefined ? cgpaSummary.overallCGPA : (academicProfile?.currentCGPA || 0.0),
      totalCreditsEarned: cgpaSummary.totalCreditsEarned !== undefined ? cgpaSummary.totalCreditsEarned : (academicProfile?.totalCreditsEarned || 0),
      semesterBreakdown,
      issueDate: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Get Failed Courses for Retake Registration
exports.getFailedCoursesForRetake = async (req, res) => {
  try {
    const studentUser = req.user;
    const studentProfile = await Student.findOne({ universityEmail: studentUser.email }).lean();
    const studentIdStr = studentProfile?.studentId || studentUser.studentId || "";
    const studentUserEmail = studentUser.email ? studentUser.email.toLowerCase().trim() : "";
    const emailPrefix = studentUser.email ? studentUser.email.split("@")[0] : "";

    const rawConditions = [
      { student: studentUser._id || studentUser.id },
      studentIdStr ? { studentId: studentIdStr } : null,
      studentUser.studentId ? { studentId: studentUser.studentId } : null,
      emailPrefix ? { studentId: emailPrefix } : null,
      studentUserEmail ? { studentEmail: studentUserEmail } : null,
      studentUserEmail ? { email: studentUserEmail } : null,
    ].filter(Boolean);

    const publishedResults = await Result.find({
      status: "Published",
      $or: rawConditions,
    }).lean();

    // Find courses with F or 0 grade point on FINAL term results
    const failedMap = new Map();
    publishedResults.forEach((r) => {
      if (r.resultType === "Midterm") return;

      const code = String(r.courseCode || "").toUpperCase().trim();
      const lg = String(r.letterGrade || "").trim().toUpperCase();
      const gp = r.gradePoint !== null && r.gradePoint !== undefined ? Number(r.gradePoint) : null;

      const isFailed = lg === "F" || (gp !== null && gp === 0);
      if (isFailed) {
        failedMap.set(code, r);
      }
    });

    // Remove courses if passed in a later published Final result
    publishedResults.forEach((r) => {
      if (r.resultType === "Midterm") return;

      const code = String(r.courseCode || "").toUpperCase().trim();
      const lg = String(r.letterGrade || "").trim().toUpperCase();
      const gp = r.gradePoint !== null && r.gradePoint !== undefined ? Number(r.gradePoint) : null;

      const isPassed = lg !== "F" && gp !== null && gp > 0;
      if (isPassed) {
        failedMap.delete(code);
      }
    });

    // Remove courses already requested for retake
    const existingRetakes = await RetakeRequest.find({
      $or: [
        { student: studentUser._id },
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
        ...(studentUser.studentId ? [{ studentId: studentUser.studentId }] : [])
      ],
      status: { $in: ["Pending Adviser Approval", "Approved"] },
    }).lean();

    existingRetakes.forEach((rr) => {
      failedMap.delete(String(rr.courseCode || "").toUpperCase().trim());
    });

    res.json({ failedCourses: Array.from(failedMap.values()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Submit Retake Request
exports.submitRetakeRequest = async (req, res) => {
  try {
    const { courseCode, courseTitle, creditHours, previousGrade, previousGradePoint, targetSession } = req.body;
    const studentUser = req.user;

    const userEmailClean = (studentUser?.email || "").trim().toLowerCase();
    const emailPrefix = userEmailClean ? userEmailClean.split("@")[0].toUpperCase() : "";

    let studentProfile = await Student.findOne({
      $or: [
        ...(userEmailClean ? [{ universityEmail: { $regex: new RegExp(`^${userEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }] : []),
        ...(studentUser?.studentId ? [{ studentId: studentUser.studentId }] : []),
        ...(emailPrefix ? [{ studentId: emailPrefix }] : [])
      ]
    }).lean();

    const studentIdStr = studentProfile?.studentId || studentUser?.studentId || emailPrefix || "STUDENT";
    const studentNameStr = studentProfile?.name || studentUser?.name || "Student";
    const courseTitleStr = courseTitle || courseCode || "Course";

    const Adviser = require("../models/Adviser");
    const adviserDoc = await Adviser.findOne({
      $or: [
        { session: studentProfile?.session || "2022-23" },
        { department: studentProfile?.department || studentUser?.department || "EDTE" }
      ]
    }).lean();
    const adviserEmail = adviserDoc?.teacherEmail || adviserDoc?.email || "";

    const studentUserId = studentUser._id || studentUser.id || studentUser.uid;
    const creditsNum = Number(creditHours) || 3;
    const retakeAmount = creditsNum <= 1 ? 100 : (creditsNum >= 3 ? 300 : Math.round(creditsNum * 100));

    const retake = await RetakeRequest.create({
      student: studentUserId,
      studentId: studentIdStr,
      studentName: studentNameStr,
      department: studentProfile?.department || studentUser?.department || "EDTE",
      courseCode: String(courseCode || "").toUpperCase(),
      courseTitle: courseTitleStr,
      creditHours: creditsNum,
      previousGrade: previousGrade || "F",
      previousGradePoint: Number(previousGradePoint) || 0.0,
      targetSession: targetSession || "2023-24",
      level: `Level ${studentProfile?.currentLevel || 1}`,
      term: `Term ${studentProfile?.currentTerm || 1}`,
      adviserEmail,
      status: "Pending Adviser Approval",
      paymentStatus: "Unpaid",
      amount: retakeAmount,
    });

    await createAuditLog(req, studentUser, "Retake Request", `Submitted retake request for ${courseCode} (${targetSession})`);

    // Notify Adviser
    if (adviserEmail) {
      const adviserUser = await User.findOne({ email: { $regex: new RegExp(`^${adviserEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });
      if (adviserUser) {
        const notif = await Notification.create({
          userId: adviserUser._id,
          title: `Retake Request: ${studentIdStr}`,
          message: `Student ${studentNameStr} (${studentIdStr}) requested retake for ${courseCode}.`,
          type: "general",
        });

        try {
          const io = getIO();
          if (io) io.emit("new_notification", { userId: adviserUser._id.toString(), notif });
        } catch (ioErr) {
          // Socket emit skipped if socket server is not connected or in standalone test mode
        }
      }
    }

    res.status(201).json({ message: "Retake request submitted to Adviser successfully.", retake });
  } catch (error) {
    console.error("Error in submitRetakeRequest:", error);
    res.status(500).json({ error: error.message });
  }
};

// 5.5 Pay Online Retake Fee (Post-Approval)
exports.payRetakeFee = async (req, res) => {
  try {
    const { id } = req.params;
    const studentUser = req.user;
    const userId = studentUser._id || studentUser.id || studentUser.uid;

    const retake = await RetakeRequest.findById(id);
    if (!retake) {
      return res.status(404).json({ error: "Retake request not found." });
    }

    if (retake.student.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized to pay for this retake request." });
    }

    if (retake.status !== "Approved") {
      return res.status(400).json({ error: "Retake request must be approved by Adviser before payment." });
    }

    if (retake.paymentStatus === "Paid") {
      return res.status(400).json({ error: "Payment for this retake request has already been completed." });
    }

    const transactionId = `TXN_RETAKE_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const creditsNum = Number(retake.creditHours) || 3;
    const calculatedFee = creditsNum <= 1 ? 100 : (creditsNum >= 3 ? 300 : Math.round(creditsNum * 100));
    const retakeAmount = retake.amount || calculatedFee;

    retake.paymentStatus = "Paid";
    retake.amount = retakeAmount;
    retake.transactionId = transactionId;
    retake.paidAt = new Date();
    await retake.save();

    // Auto-sync Enrollment & LMS Course Card into Target Session
    const Enrollment = require("../models/Enrollment");
    const Course = require("../models/Course");
    const Student = require("../models/Student");

    const studentProfile = await Student.findOne({
      $or: [
        { universityEmail: { $regex: new RegExp(`^${(studentUser.email || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        ...(studentUser.studentId ? [{ studentId: studentUser.studentId }] : [])
      ]
    }).lean();

    const studentIdStr = studentProfile?.studentId || studentUser.studentId || retake.studentId;
    const codeStr = String(retake.courseCode || "").toUpperCase().trim();
    const targetSession = retake.targetSession || "2023-24";

    // Find LMS Course matching displayCode and target session
    let lmsCourse = await Course.findOne({
      displayCode: codeStr,
      session: targetSession
    });

    if (!lmsCourse) {
      // Resolve valid teacher for Course model required field
      let defaultTeacherId = null;
      if (retake.adviserEmail) {
        const advTeacher = await User.findOne({
          email: { $regex: new RegExp(`^${retake.adviserEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
        });
        if (advTeacher) defaultTeacherId = advTeacher._id;
      }

      if (!defaultTeacherId) {
        const existingCourse = await Course.findOne({ displayCode: codeStr }).lean();
        if (existingCourse?.teacher) defaultTeacherId = existingCourse.teacher;
      }

      if (!defaultTeacherId) {
        const anyTeacher = await User.findOne({ role: "teacher" }).lean();
        if (anyTeacher) defaultTeacherId = anyTeacher._id;
      }

      const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
      lmsCourse = await Course.create({
        name: retake.courseTitle || codeStr,
        displayCode: codeStr,
        session: targetSession,
        department: studentProfile?.department || studentUser.department || "EDTE",
        teacher: defaultTeacherId,
        joinCode,
        students: [userId]
      });
    } else {
      await Course.updateOne(
        { _id: lmsCourse._id },
        { $addToSet: { students: userId } }
      );
    }

    // Create / Update Enrollment record for target session
    await Enrollment.findOneAndUpdate(
      {
        $or: [
          { student: userId, courseCode: codeStr, session: targetSession },
          ...(studentIdStr ? [{ studentId: studentIdStr, courseCode: codeStr, session: targetSession }] : [])
        ]
      },
      {
        student: userId,
        studentId: studentIdStr || retake.studentId,
        course: lmsCourse._id,
        courseCode: codeStr,
        courseTitle: retake.courseTitle,
        session: targetSession,
        level: retake.level,
        term: retake.term,
      },
      { upsert: true, returnDocument: "after" }
    );

    await createAuditLog(req, studentUser, "Retake Fee Payment", `Paid ${retakeAmount} BDT retake fee for ${codeStr} (${targetSession}). Txn: ${transactionId}`);

    res.json({
      message: `Retake fee payment of ${retakeAmount} BDT completed successfully! Target session course card enabled.`,
      retake,
      transactionId,
    });
  } catch (error) {
    console.error("Error in payRetakeFee:", error);
    res.status(500).json({ error: error.message });
  }
};

// 6. Get Adviser Retake Requests
exports.getTeacherRetakeRequests = async (req, res) => {
  try {
    const teacherEmailClean = (req.user.email || "").toLowerCase().trim();
    const Adviser = require("../models/Adviser");

    const adviserDocs = await Adviser.find({
      $or: [
        { teacherEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        { email: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
      ]
    }).lean();

    const adviserSessions = adviserDocs.map(a => a.session).filter(Boolean);
    const adviserDepts = adviserDocs.map(a => a.department).filter(Boolean);

    const requests = await RetakeRequest.find({
      status: "Pending Adviser Approval",
      $or: [
        { adviserEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        ...(adviserSessions.length ? [{ targetSession: { $in: adviserSessions } }] : []),
        ...(adviserDepts.length ? [{ department: { $in: adviserDepts } }] : []),
        { adviserEmail: "" },
        { adviserEmail: null }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Process Adviser Retake Request (Approve / Reject) & Auto LMS Roster Integration
exports.processRetakeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body; // Approved or Rejected

    const retake = await RetakeRequest.findById(id);
    if (!retake) {
      return res.status(404).json({ error: "Retake request not found." });
    }

    retake.status = status;
    retake.comment = comment || "";
    retake.updatedAt = new Date();
    await retake.save();

    if (status === "Approved") {
      // 1. Create Enrollment document
      await Enrollment.create({
        student: retake.student,
        studentId: retake.studentId,
        courseCode: retake.courseCode,
        courseTitle: retake.courseTitle,
        session: retake.targetSession,
        level: retake.level,
        term: retake.term,
      });

      // 2. Find LMS Course & Auto-Add Student into Course.students Array
      const lmsCourse = await Course.findOne({
        displayCode: retake.courseCode.toUpperCase(),
      });

      if (lmsCourse) {
        if (!lmsCourse.students.includes(retake.student)) {
          lmsCourse.students.push(retake.student);
          await lmsCourse.save();
        }
      }
    }

    await createAuditLog(req, req.user, "Retake Approval", `${status} retake request for student ID ${retake.studentId} in course ${retake.courseCode}`);

    // Notify Student
    const notif = await Notification.create({
      userId: retake.student,
      title: `Retake Request ${status}`,
      message: `Your retake request for ${retake.courseCode} has been ${status.toLowerCase()}. ${comment ? `Comment: ${comment}` : ""}`,
      type: "general",
    });

    const io = getIO();
    if (io) io.emit("new_notification", { userId: retake.student.toString(), notif });

    res.json({ message: `Retake request ${status.toLowerCase()} successfully.`, retake });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 8. Admin Academic Progression (Promote Students) - Optimized High-Performance Batch Execution
exports.promoteStudentsBatch = async (req, res) => {
  try {
    const { studentIds, targetLevel, targetTerm, autoNextStep } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "No students selected for promotion." });
    }

    // 1. Query all targeted students in a single indexed query
    const studentDocs = await Student.find({ studentId: { $in: studentIds } });
    if (!studentDocs || studentDocs.length === 0) {
      return res.status(404).json({ error: "No matching student records found." });
    }

    const studentBulkOps = [];
    const emailToProgression = new Map();
    const updatedStudents = [];

    for (const sDoc of studentDocs) {
      let nextLevel = sDoc.currentLevel || 1;
      let nextTerm = sDoc.currentTerm || 1;

      if (autoNextStep || (!targetLevel && !targetTerm)) {
        // Automatic +1 Step Progression (e.g. L1T1 -> L1T2 -> L2T1 -> L2T2...)
        if (nextTerm === 1) {
          nextTerm = 2;
        } else {
          nextTerm = 1;
          nextLevel = Math.min(4, nextLevel + 1);
        }
      } else {
        if (targetLevel) nextLevel = Number(targetLevel);
        if (targetTerm) nextTerm = Number(targetTerm);
      }

      studentBulkOps.push({
        updateOne: {
          filter: { _id: sDoc._id },
          update: {
            $set: {
              currentLevel: nextLevel,
              currentTerm: nextTerm,
              program: sDoc.program || "B.Sc. in EDTE",
              batch: sDoc.batch || sDoc.session || "2022-23",
              admissionSemester: sDoc.admissionSemester || "Spring",
            },
          },
        },
      });

      if (sDoc.universityEmail) {
        emailToProgression.set(sDoc.universityEmail.toLowerCase().trim(), {
          level: nextLevel,
          term: nextTerm,
        });
      }
      updatedStudents.push(sDoc.studentId);
    }

    // 2. Perform bulk update on Student collection in a single roundtrip
    if (studentBulkOps.length > 0) {
      await Student.bulkWrite(studentBulkOps, { ordered: false });
    }

    // 3. Batch update corresponding AcademicProfiles
    const emails = Array.from(emailToProgression.keys());
    if (emails.length > 0) {
      const userDocs = await User.find({
        email: { $in: emails },
      }).select("_id email").lean();

      if (userDocs && userDocs.length > 0) {
        const now = new Date();
        const profileBulkOps = [];

        for (const u of userDocs) {
          const normEmail = (u.email || "").toLowerCase().trim();
          const target = emailToProgression.get(normEmail);
          if (target) {
            profileBulkOps.push({
              updateOne: {
                filter: { student: u._id },
                update: {
                  $set: {
                    currentLevel: `Level ${target.level}`,
                    currentTerm: `Term ${target.term}`,
                    updatedAt: now,
                  },
                },
                upsert: true,
              },
            });
          }
        }

        if (profileBulkOps.length > 0) {
          await AcademicProfile.bulkWrite(profileBulkOps, { ordered: false });
        }
      }
    }

    // Non-blocking audit log
    createAuditLog(req, req.user, "Academic Promotion", `Promoted ${updatedStudents.length} students.`).catch(() => {});

    res.json({ message: `Promoted ${updatedStudents.length} students successfully.`, count: updatedStudents.length });
  } catch (error) {
    console.error("Error in promoteStudentsBatch:", error);
    res.status(500).json({ error: error.message });
  }
};

// 9. Admin Graduation Engine
exports.graduateStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const sDoc = await Student.findOne({ studentId });
    if (!sDoc) {
      return res.status(404).json({ error: "Student not found." });
    }

    sDoc.accountStatus = "Graduated";
    await sDoc.save();

    const userDoc = await User.findOne({ email: sDoc.universityEmail });
    if (userDoc) {
      await AcademicProfile.findOneAndUpdate(
        { student: userDoc._id },
        {
          academicStatus: "Graduated",
          isGraduated: true,
          graduationDate: new Date(),
          isRegistrationLocked: true,
          updatedAt: new Date(),
        }
      );
    }

    await createAuditLog(req, req.user, "Graduation Approval", `Marked student ID ${studentId} as Graduated.`);

    res.json({ message: `Student ID ${studentId} marked as Graduated successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 10. Dashboard Stats Upgrades
exports.getStudentDashboardStats = async (req, res) => {
  try {
    const summary = await calculateStudentCGPA(req.user);
    const profile = await AcademicProfile.findOne({ student: req.user._id }).lean();

    res.json({
      currentCGPA: summary.overallCGPA,
      currentSemesterGPA: summary.lastSemGPA,
      totalCreditsEarned: summary.totalCreditsEarned,
      creditsRemaining: summary.creditsRemaining,
      academicStatus: profile?.academicStatus || "Regular",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeacherDashboardStats = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const coursesCount = await Course.countDocuments({ teacher: teacherId });
    const teacherEmail = req.user.email;

    const teacherDoc = await Teacher.findOne({ email: teacherEmail }).lean();
    const assignedCodes = (teacherDoc?.assignedCourses || []).map((ac) => ac.courseCode).filter(Boolean);

    const pendingResultsCount = await require("../models/ResultUpload").countDocuments({
      teacher: teacherId,
      status: "Draft",
    });

    const pendingRetakesCount = await RetakeRequest.countDocuments({
      $or: [{ adviserEmail: teacherEmail }, { status: "Pending Adviser Approval" }],
    });

    res.json({
      totalCourses: coursesCount || assignedCodes.length,
      pendingResults: pendingResultsCount,
      pendingRetakeRequests: pendingRetakesCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminDashboardStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const totalRegistrations = await Registration.countDocuments();
    const totalPublishedResults = await Result.countDocuments({ status: "Published" });
    const totalGraduated = await AcademicProfile.countDocuments({ academicStatus: "Graduated" });

    res.json({
      students: totalStudents,
      teachers: totalTeachers,
      departments: totalDepartments,
      registrations: totalRegistrations,
      publishedResults: totalPublishedResults,
      graduatedStudents: totalGraduated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 11. Audit Logs Retrieval
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
