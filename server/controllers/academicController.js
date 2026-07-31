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
    const cgpaSummary = await calculateStudentCGPA(req.user);

    const studentOrConditions = [];
    if (req.user.email) studentOrConditions.push({ universityEmail: req.user.email });
    if (req.user.studentId) studentOrConditions.push({ studentId: req.user.studentId });

    const studentProfile = studentOrConditions.length > 0
      ? await Student.findOne({ $or: studentOrConditions }).lean()
      : null;

    const studentIdStr = studentProfile?.studentId || req.user.studentId || "";

    const activeReg = await Registration.findOne({
      $or: [
        ...(userId ? [{ student: userId }] : []),
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
        ...(req.user.email ? [{ studentEmail: req.user.email }] : []),
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
    const deptImports = await CourseImport.find({
      department: { $regex: new RegExp(`^${studentDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
    }).lean();

    const completedCodes = new Set((profile?.completedCourses || []).map((c) => (c.courseCode || "").toUpperCase()));
    const incompleteCourses = deptImports.filter((ci) => !completedCodes.has((ci.courseCode || "").toUpperCase()));

    const currentLevelStr = activeReg?.level || profile?.currentLevel || (studentProfile?.currentLevel ? `Level-${studentProfile.currentLevel}` : "Level-1");
    const currentTermStr = activeReg?.term || profile?.currentTerm || (studentProfile?.currentTerm ? `Term-${studentProfile.currentTerm}` : "Term-1");
    const activeSessionStr = activeReg?.session || studentProfile?.session || req.user.session || "2025-26";
    const activeBatchStr = studentProfile?.batch || req.user.batch || "2023";
    const activeProgramStr = studentProfile?.program || req.user.program || `B.Sc. in ${studentDept}`;

    res.json({
      profile: {
        studentName: studentProfile?.name || req.user.name || activeReg?.studentName || "Student",
        studentId: studentIdStr || req.user.studentId || activeReg?.studentId || "N/A",
        department: studentDept,
        program: activeProgramStr,
        session: activeSessionStr,
        batch: activeBatchStr,
        hallName: studentProfile?.hallName || req.user.hallName || "N/A",
        phone: studentProfile?.phone || req.user.phone || "N/A",
        universityEmail: studentProfile?.universityEmail || req.user.email,
        ...(profile || {}),
        currentLevel: currentLevelStr,
        currentTerm: currentTermStr,
        totalCreditsRequired: profile?.totalCreditsRequired || 140,
        totalCreditsEarned: cgpaSummary.totalCreditsEarned || profile?.totalCreditsEarned || 0,
        creditsRemaining: cgpaSummary.creditsRemaining || profile?.creditsRemaining || 140,
        currentCGPA: cgpaSummary.overallCGPA || profile?.currentCGPA || 0.0,
        lastSemesterGPA: cgpaSummary.lastSemGPA || profile?.lastSemesterGPA || 0.0,
        academicStatus: profile?.academicStatus || "Regular",
        cgpaSummary,
      },
      completedCourses: profile?.completedCourses || [],
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

    const publishedResults = await Result.find({
      status: "Published",
      $or: [{ student: studentUser._id }, ...(studentIdStr ? [{ studentId: studentIdStr }] : [])],
    }).lean();

    // Find courses with F or 0 grade point
    const failedMap = new Map();
    publishedResults.forEach((r) => {
      const code = r.courseCode.toUpperCase();
      if (r.letterGrade === "F" || r.gradePoint === 0) {
        failedMap.set(code, r);
      }
    });

    // Remove courses if passed in a later published result
    publishedResults.forEach((r) => {
      const code = r.courseCode.toUpperCase();
      if (r.letterGrade !== "F" && r.gradePoint > 0) {
        failedMap.delete(code);
      }
    });

    // Remove courses already requested for retake
    const existingRetakes = await RetakeRequest.find({
      student: studentUser._id,
      status: { $in: ["Pending Adviser Approval", "Approved"] },
    }).lean();

    existingRetakes.forEach((rr) => {
      failedMap.delete(rr.courseCode.toUpperCase());
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
    const studentProfile = await Student.findOne({ universityEmail: studentUser.email }).lean();
    const studentIdStr = studentProfile?.studentId || studentUser.studentId || "";

    const adviserDoc = await require("../models/Adviser").findOne({ session: studentProfile?.session || "2022-23" }).lean();
    const adviserEmail = adviserDoc?.email || "";

    const retake = await RetakeRequest.create({
      student: studentUser._id,
      studentId: studentIdStr,
      studentName: studentUser.name,
      department: studentProfile?.department || studentUser.department || "",
      courseCode: String(courseCode).toUpperCase(),
      courseTitle,
      creditHours: Number(creditHours) || 3,
      previousGrade: previousGrade || "F",
      previousGradePoint: Number(previousGradePoint) || 0.0,
      targetSession,
      level: `Level ${studentProfile?.currentLevel || 1}`,
      term: `Term ${studentProfile?.currentTerm || 1}`,
      adviserEmail,
      status: "Pending Adviser Approval",
    });

    await createAuditLog(req, studentUser, "Retake Request", `Submitted retake request for ${courseCode} (${targetSession})`);

    // Notify Adviser
    if (adviserEmail) {
      const adviserUser = await User.findOne({ email: adviserEmail });
      if (adviserUser) {
        const notif = await Notification.create({
          userId: adviserUser._id,
          title: `Retake Request: ${studentIdStr}`,
          message: `Student ${studentUser.name} (${studentIdStr}) requested retake for ${courseCode}.`,
          type: "general",
        });

        const io = getIO();
        if (io) io.emit("new_notification", { userId: adviserUser._id.toString(), notif });
      }
    }

    res.status(201).json({ message: "Retake request submitted to Adviser successfully.", retake });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Get Adviser Retake Requests
exports.getTeacherRetakeRequests = async (req, res) => {
  try {
    const teacherEmailClean = (req.user.email || "").toLowerCase().trim();
    const requests = await RetakeRequest.find({
      status: "Pending Adviser Approval",
      adviserEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
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

// 8. Admin Academic Progression (Promote Students)
exports.promoteStudentsBatch = async (req, res) => {
  try {
    const { studentIds, targetLevel, targetTerm, autoNextStep } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "No students selected for promotion." });
    }

    const updatedStudents = [];
    for (const sId of studentIds) {
      const sDoc = await Student.findOne({ studentId: sId });
      if (sDoc) {
        // Fallback for schema required fields to prevent validation errors on save
        if (!sDoc.program) sDoc.program = "B.Sc. in EDTE";
        if (!sDoc.batch) sDoc.batch = sDoc.session || "2022-23";
        if (!sDoc.admissionSemester) sDoc.admissionSemester = "Spring";

        if (autoNextStep || (!targetLevel && !targetTerm)) {
          // Automatic +1 Step Progression (e.g. L1T1 -> L1T2 -> L2T1 -> L2T2...)
          let nextLevel = sDoc.currentLevel || 1;
          let nextTerm = sDoc.currentTerm || 1;

          if (nextTerm === 1) {
            nextTerm = 2;
          } else {
            nextTerm = 1;
            nextLevel = Math.min(4, nextLevel + 1);
          }

          sDoc.currentLevel = nextLevel;
          sDoc.currentTerm = nextTerm;
        } else {
          if (targetLevel) sDoc.currentLevel = Number(targetLevel);
          if (targetTerm) sDoc.currentTerm = Number(targetTerm);
        }

        await sDoc.save();

        const userDoc = await User.findOne({ email: sDoc.universityEmail });
        if (userDoc) {
          await AcademicProfile.findOneAndUpdate(
            { student: userDoc._id },
            {
              currentLevel: `Level ${sDoc.currentLevel}`,
              currentTerm: `Term ${sDoc.currentTerm}`,
              updatedAt: new Date(),
            },
            { upsert: true }
          );
        }
        updatedStudents.push(sId);
      }
    }

    await createAuditLog(req, req.user, "Academic Promotion", `Promoted ${updatedStudents.length} students.`);

    res.json({ message: `Promoted ${updatedStudents.length} students successfully.` });
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
