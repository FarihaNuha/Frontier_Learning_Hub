const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");

// Create course (Teacher only) - WITH JOIN CODE
exports.createCourse = async (req, res) => {
  try {
    const { name, session, displayCode, department } = req.body;

    if (!name || !displayCode || !department) {
      return res
        .status(400)
        .json({ error: "Course name, code, and department are required" });
    }

    // Generate random 6-digit join code
    const joinCode = Math.floor(100000 + Math.random() * 900000).toString();

    const course = await Course.create({
      name,
      session: session || "",
      displayCode: displayCode.toUpperCase(),
      joinCode: joinCode,
      department,
      teacher: req.user.uid,
      students: [],
    });

    res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id || req.user.uid;
    const userRole = req.user.role;

    if (userRole === "student") {
      const Enrollment = require("../models/Enrollment");
      const Student = require("../models/Student");
      const User = require("../models/User");
      const Registration = require("../models/Registration");

      const studentProfile = await Student.findOne({
        $or: [
          { universityEmail: req.user.email },
          { universityEmail: { $regex: new RegExp(`^${(req.user.email || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
        ]
      }).lean();

      const studentIdStr = studentProfile?.studentId || req.user.studentId;

      // Auto-sync courses ONLY from student's APPROVED registrations
      const approvedRegs = await Registration.find({
        $or: [
          { user: userId },
          ...(studentIdStr ? [{ studentId: studentIdStr }] : [])
        ],
        status: "Approved"
      }).lean();

      for (const reg of approvedRegs) {
        for (const courseItem of reg.selectedCourses || []) {
          const codeStr = (courseItem.courseCode || courseItem.code || "").toUpperCase().trim();
          if (!codeStr) continue;

          // FIXED: Filter by both displayCode AND session — each session gets its own fresh Course card.
          // This prevents 2025-26 students from being added to old 2024-25 cards.
          const regSession = reg.session || studentProfile?.session || "";
          const lmsQuery = { displayCode: codeStr };
          if (regSession) lmsQuery.session = regSession;
          let lmsCourse = await Course.findOne(lmsQuery);
          if (!lmsCourse) {
            let teacherId = null;
            if (reg.adviserEmail) {
              const advTeacher = await User.findOne({
                email: { $regex: new RegExp(`^${reg.adviserEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
              });
              if (advTeacher) teacherId = advTeacher._id;
            }

            const joinCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Normalize department enum for Course model
            let normalizedDept = "EDTE";
            const rawDept = String(studentProfile?.department || reg.department || "").toUpperCase();
            if (rawDept.includes("IRE")) normalizedDept = "IRE";
            else if (rawDept.includes("SOFTWARE")) normalizedDept = "Software";
            else if (rawDept.includes("CYBER")) normalizedDept = "Cyber";
            else if (rawDept.includes("DATA")) normalizedDept = "DataScience";
            else if (rawDept.includes("GENERAL")) normalizedDept = "General";

            lmsCourse = await Course.create({
              name: courseItem.courseTitle || codeStr,
              displayCode: codeStr,
              session: regSession || "2024-25",
              department: normalizedDept,
              teacher: teacherId || null,
              joinCode,
              students: [userId]
            });
          } else {
            await Course.updateOne(
              { _id: lmsCourse._id },
              { $addToSet: { students: userId } }
            );
          }

          // FIXED: Include session in upsert filter so each session gets its own Enrollment record
          await Enrollment.findOneAndUpdate(
            {
              $or: [
                { student: userId, courseCode: codeStr, session: reg.session },
                ...(studentIdStr ? [{ studentId: studentIdStr, courseCode: codeStr, session: reg.session }] : [])
              ]
            },
            {
              student: userId,
              studentId: studentIdStr || reg.studentId,
              course: lmsCourse._id,
              courseTitle: courseItem.courseTitle,
              session: reg.session,
              level: reg.level,
              term: reg.term,
            },
            { upsert: true, returnDocument: "after" }
          );
        }
      }

      // Auto-sync APPROVED AND PAID retake courses
      const RetakeRequest = require("../models/RetakeRequest");
      const approvedPaidRetakes = await RetakeRequest.find({
        $or: [
          { student: userId },
          ...(studentIdStr ? [{ studentId: studentIdStr }] : [])
        ],
        status: "Approved",
        paymentStatus: "Paid"
      }).lean();

      for (const retake of approvedPaidRetakes) {
        const codeStr = (retake.courseCode || "").toUpperCase().trim();
        if (!codeStr) continue;

        const targetSession = retake.targetSession || "2023-24";
        let lmsCourse = await Course.findOne({ displayCode: codeStr, session: targetSession });
        if (!lmsCourse) {
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
            department: studentProfile?.department || req.user.department || "EDTE",
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

        const CourseImport = require("../models/CourseImport");
        const cImportRetake = await CourseImport.findOne({
          courseCode: { $regex: new RegExp(`^${codeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
        }).lean();

        let retakeLevelSync = cImportRetake?.level ? `Level-${String(cImportRetake.level).replace(/\D/g, "")}` : "";
        let retakeTermSync = cImportRetake?.term ? `Term-${String(cImportRetake.term).replace(/\D/g, "")}` : "";

        if (!retakeLevelSync || !retakeTermSync) {
          const matchL = codeStr.match(/(\d)\d{2}/);
          if (matchL) {
            const lNum = parseInt(matchL[1]);
            const matchT = codeStr.match(/\d(\d\d)/);
            let tNum = 1;
            if (matchT) {
              const numVal = parseInt(matchT[1]);
              tNum = (numVal >= 10 || (numVal === 9 && codeStr.includes("MATH"))) ? 2 : 1;
            }
            if (!retakeLevelSync) retakeLevelSync = `Level-${lNum}`;
            if (!retakeTermSync) retakeTermSync = `Term-${tNum}`;
          }
        }

        if (!retakeLevelSync) retakeLevelSync = retake.level ? `Level-${String(retake.level).replace(/\D/g, "")}` : "Level-1";
        if (!retakeTermSync) retakeTermSync = retake.term ? `Term-${String(retake.term).replace(/\D/g, "")}` : "Term-1";

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
            level: retakeLevelSync,
            term: retakeTermSync,
          },
          { upsert: true, returnDocument: "after" }
        );
      }

      // Collect all course codes strictly from APPROVED registrations AND APPROVED+PAID retakes
      const approvedCourseCodes = new Set();
      approvedRegs.forEach((r) => {
        (r.selectedCourses || []).forEach((c) => {
          const code = (c.courseCode || c.code || "").toUpperCase().trim();
          if (code) approvedCourseCodes.add(code);
        });
      });

      approvedPaidRetakes.forEach((r) => {
        const code = (r.courseCode || "").toUpperCase().trim();
        if (code) approvedCourseCodes.add(code);
      });

      const enrollments = await Enrollment.find({
        $or: [
          { student: userId },
          ...(studentIdStr ? [{ studentId: studentIdStr }] : [])
        ]
      }).lean();

      enrollments.forEach((e) => {
        const code = (e.courseCode || "").toUpperCase().trim();
        if (code && approvedCourseCodes.has(code)) {
          approvedCourseCodes.add(code);
        }
      });

      // If student has no approved course registrations, return empty array immediately (block pending registrations from displaying)
      if (approvedCourseCodes.size === 0) {
        return res.json([]);
      }

      // Fetch ONLY LMS courses matching approved course codes AND where this student is enrolled.
      // Using students:userId ensures we see ONLY the session-specific cards where this student
      // was added — not old sessions' cards with overlapping course codes.
      let lmsCourses = await Course.find({
        displayCode: { $in: Array.from(approvedCourseCodes) },
        students: userId,
      })
        .populate("teacher", "name email profilePicture department")
        .sort({ createdAt: -1 })
        .lean();

      // STRICT SESSION FILTERING FOR STUDENT:
      // A course from another session (e.g. 2023-24 for a 2022-23 student) MUST ONLY BE SHOWN if the student has an approved and paid RetakeRequest for that specific displayCode + targetSession!
      lmsCourses = lmsCourses.filter((c) => {
        const cSession = (c.session || "").trim().toLowerCase();
        const studentSess = (studentProfile?.session || "").trim().toLowerCase();

        if (!cSession || !studentSess || cSession === studentSess) {
          return true;
        }

        const cCodeClean = (c.displayCode || c.code || "").trim().toUpperCase();
        const hasApprovedPaidRetake = approvedPaidRetakes.some((retake) => {
          const retakeCode = (retake.courseCode || "").trim().toUpperCase();
          const retakeSess = (retake.targetSession || "2023-24").trim().toLowerCase();
          return retakeCode === cCodeClean && retakeSess === cSession;
        });

        return hasApprovedPaidRetake;
      });

      // Fetch all Teacher master records and User teacher accounts to ensure fresh teacher assignment mapping
      const Teacher = require("../models/Teacher");
      const teachersList = await Teacher.find().lean();
      const teacherUsers = await User.find({ role: "teacher" }).lean();

      // Attach level, term, session metadata and dynamic assigned teacher to each course
      const finalCourses = await Promise.all(
        lmsCourses.map(async (c) => {
          const matchingEnrollment = enrollments.find(
            (e) => (e.courseCode || "").toUpperCase() === (c.displayCode || "").toUpperCase()
              && (e.session || "").trim().toLowerCase() === (c.session || "").trim().toLowerCase()
          ) || enrollments.find(
            (e) => (e.courseCode || "").toUpperCase() === (c.displayCode || "").toUpperCase()
          );

          const courseSession = (c.session || matchingEnrollment?.session || studentProfile?.session || "").trim().toLowerCase();
          const courseCode = (c.displayCode || "").trim().toUpperCase();

          // Find teacher assigned to THIS course AND THIS session in Teacher model master data
          let assignedTeacherObj = null;
          const matchedTeacherDoc = teachersList.find((t) =>
            (t.assignedCourses || []).some((ac) => {
              const acCode = (ac.courseCode || "").trim().toUpperCase();
              const acName = (ac.courseName || "").trim().toLowerCase();
              const acSess = (ac.session || t.assignedSession || "").trim().toLowerCase();

              const cleanCName = (c.name || "").trim().toLowerCase().replace(/\btheory\b/g, "").replace(/\s+/g, " ").trim();
              const cleanAcName = acName.replace(/\btheory\b/g, "").replace(/\s+/g, " ").trim();

              const codeMatch = Boolean(
                acCode && (
                  acCode === courseCode ||
                  acCode.replace(/\s+/g, "") === courseCode.replace(/\s+/g, "")
                )
              );

              const nameMatch = Boolean(
                acName && (
                  (c.name || "").trim().toLowerCase() === acName ||
                  (cleanAcName && cleanCName && cleanAcName === cleanCName) ||
                  acName.includes((c.name || "").trim().toLowerCase()) ||
                  (c.name || "").trim().toLowerCase().includes(acName)
                )
              );

              const codeOrNameMatch = codeMatch || nameMatch;

              if (!codeOrNameMatch) return false;

              // STRICT SESSION MATCHING RULE:
              if (acSess && courseSession && acSess !== courseSession) {
                return false;
              }
              return true;
            })
          );

          if (matchedTeacherDoc) {
            let teacherUserDoc = teacherUsers.find(
              (u) => u.email && u.email.toLowerCase() === matchedTeacherDoc.email?.toLowerCase()
            );

            if (!teacherUserDoc && matchedTeacherDoc.name) {
              teacherUserDoc = teacherUsers.find(
                (u) => u.name && u.name.toLowerCase().trim() === matchedTeacherDoc.name.toLowerCase().trim()
              );
            }

            if (teacherUserDoc) {
              assignedTeacherObj = {
                _id: teacherUserDoc._id,
                name: teacherUserDoc.name,
                email: teacherUserDoc.email,
                profilePicture: teacherUserDoc.profilePicture || "",
                department: teacherUserDoc.department || matchedTeacherDoc.department,
              };

              // Persist link in MongoDB if needed
              if (!c.teacher || c.teacher._id?.toString() !== teacherUserDoc._id.toString()) {
                await Course.findByIdAndUpdate(c._id, { teacher: teacherUserDoc._id }).catch(() => {});
              }
            }
          }

          // Fallback: If Course object already has a populated teacher from DB, use it!
          if (!assignedTeacherObj && c.teacher && c.teacher.name) {
            assignedTeacherObj = {
              _id: c.teacher._id || c.teacher,
              name: c.teacher.name,
              email: c.teacher.email || "",
              profilePicture: c.teacher.profilePicture || "",
              department: c.teacher.department || "",
            };
          }

          const CourseImport = require("../models/CourseImport");
          const importDoc = await CourseImport.findOne({
            courseCode: { $regex: new RegExp(`^${(c.displayCode || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
          }).lean();

          // INTRINSIC LEVEL-TERM RESOLUTION FOR COURSES:
          // Master CourseImport > Course Doc > Course Code Digits > Enrollment Doc > Student Profile
          let resolvedLevel = "";
          let resolvedTerm = "";

          if (importDoc?.level) resolvedLevel = `Level-${String(importDoc.level).replace(/\D/g, "")}`;
          if (!resolvedLevel && c.level) resolvedLevel = `Level-${String(c.level).replace(/\D/g, "")}`;

          if (importDoc?.term) resolvedTerm = `Term-${String(importDoc.term).replace(/\D/g, "")}`;
          if (!resolvedTerm && c.term) resolvedTerm = `Term-${String(c.term).replace(/\D/g, "")}`;

          const codeClean = (c.displayCode || "").toUpperCase().trim();
          const matchL = codeClean.match(/(\d)\d{2}/);
          if (matchL) {
            const lNum = parseInt(matchL[1]);
            const matchT = codeClean.match(/\d(\d\d)/);
            let tNum = 1;
            if (matchT) {
              const numVal = parseInt(matchT[1]);
              tNum = (numVal >= 10 || (numVal === 9 && codeClean.includes("MATH"))) ? 2 : 1;
            }
            if (!resolvedLevel) resolvedLevel = `Level-${lNum}`;
            if (!resolvedTerm) resolvedTerm = `Term-${tNum}`;
          }

          if (!resolvedLevel) resolvedLevel = matchingEnrollment?.level || (studentProfile?.currentLevel ? `Level-${studentProfile.currentLevel}` : "Level-1");
          if (!resolvedTerm) resolvedTerm = matchingEnrollment?.term || (studentProfile?.currentTerm ? `Term-${studentProfile.currentTerm}` : "Term-1");

          const resolvedSession = c.session || matchingEnrollment?.session || importDoc?.session || studentProfile?.session || "2023-24";

          return {
            ...c,
            teacher: assignedTeacherObj,
            session: resolvedSession,
            level: resolvedLevel,
            term: resolvedTerm,
          };
        })
      );

      // Deduplicate courses by displayCode AND session to guarantee student never sees duplicate cards for the exact same course+session, but preserves retake cards from different target sessions
      const uniqueStudentCoursesMap = new Map();
      finalCourses.forEach((c) => {
        const codeKey = (c.displayCode || c.code || "").toUpperCase().trim();
        const sessionKey = (c.session || "").toLowerCase().trim();
        if (!codeKey) return;
        const fullKey = `${codeKey}_${sessionKey}`;
        if (!uniqueStudentCoursesMap.has(fullKey)) {
          uniqueStudentCoursesMap.set(fullKey, c);
        } else {
          const existing = uniqueStudentCoursesMap.get(fullKey);
          if (!existing.teacher && c.teacher) {
            uniqueStudentCoursesMap.set(fullKey, c);
          }
        }
      });
      const uniqueFinalCourses = Array.from(uniqueStudentCoursesMap.values());

      return res.json({ courses: uniqueFinalCourses });
    } else {
      const Teacher = require("../models/Teacher");
      const CourseImport = require("../models/CourseImport");
      const Registration = require("../models/Registration");
      const Enrollment = require("../models/Enrollment");
      const RetakeRequest = require("../models/RetakeRequest");
      const { syncTeacherCourseAssignments } = require("./umsAdminController");

      const teacherProfile = await Teacher.findOne({ email: req.user.email }).lean();

      if (teacherProfile) {
        await syncTeacherCourseAssignments(teacherProfile);
      }

      let courses = await Course.find({ teacher: userId })
        .populate("teacher", "name email profilePicture department")
        .sort({ createdAt: -1 })
        .lean();

      // Helper to consolidate duplicate course cards for the same (displayCode + session)
      const deduplicateTeacherCourses = async (rawCourses) => {
        if (!Array.isArray(rawCourses) || rawCourses.length === 0) return [];
        const CourseModel = require("../models/Course");
        const EnrollmentModel = require("../models/Enrollment");

        const uniqueMap = new Map();
        const dupIdsToDelete = [];

        for (const c of rawCourses) {
          const codeKey = (c.displayCode && c.displayCode.toUpperCase() !== "COURSE")
            ? c.displayCode
            : (c.name || c.displayCode || "");
          const normCode = codeKey.replace(/[-\s]/g, "").toUpperCase();
          const normSess = (c.session || "").replace(/[-\s]/g, "").toLowerCase();
          const key = `${normCode}_${normSess}`;

          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, { ...c, students: [...(c.students || [])] });
          } else {
            const primary = uniqueMap.get(key);
            const existingStudentIds = new Set((primary.students || []).map(s => (s._id || s).toString()));
            (c.students || []).forEach(s => {
              const sid = (s._id || s).toString();
              if (!existingStudentIds.has(sid)) {
                primary.students.push(s);
                existingStudentIds.add(sid);
              }
            });
            if (c._id && !String(c._id).startsWith("assigned_") && !c.isVirtual) {
              dupIdsToDelete.push(c._id);
            }
          }
        }

        if (dupIdsToDelete.length > 0) {
          try {
            for (const primary of uniqueMap.values()) {
              if (primary._id && !String(primary._id).startsWith("assigned_")) {
                const studentObjIds = (primary.students || []).map(s => s._id || s);
                await CourseModel.findByIdAndUpdate(primary._id, { students: studentObjIds }).catch(() => {});
              }
            }
            for (const dupId of dupIdsToDelete) {
              const dupDoc = rawCourses.find(c => c._id && c._id.toString() === dupId.toString());
              if (dupDoc) {
                const codeKey = (dupDoc.displayCode && dupDoc.displayCode.toUpperCase() !== "COURSE")
                  ? dupDoc.displayCode
                  : (dupDoc.name || dupDoc.displayCode || "");
                const normCode = codeKey.replace(/[-\s]/g, "").toUpperCase();
                const normSess = (dupDoc.session || "").replace(/[-\s]/g, "").toLowerCase();
                const primary = uniqueMap.get(`${normCode}_${normSess}`);
                if (primary && primary._id && !String(primary._id).startsWith("assigned_")) {
                  await EnrollmentModel.updateMany({ course: dupId }, { course: primary._id }).catch(() => {});
                }
              }
              await CourseModel.findByIdAndDelete(dupId).catch(() => {});
            }
          } catch (e) {
            console.error("Non-fatal duplicate cleanup error:", e.message);
          }
        }

        return Array.from(uniqueMap.values());
      };

      const courseImports = await CourseImport.find().lean();

      if (teacherProfile && Array.isArray(teacherProfile.assignedCourses) && teacherProfile.assignedCourses.length > 0) {
        courses = courses.filter((c) => {
          const code = (c.displayCode || "").trim().toUpperCase();
          const name = (c.name || "").trim().toLowerCase();
          const sess = (c.session || "").trim().toLowerCase();

          return teacherProfile.assignedCourses.some((ac) => {
            const acCode = (ac.courseCode || "").trim().toUpperCase();
            const acName = (ac.courseName || "").trim().toLowerCase();
            const acSess = (ac.session || "").trim().toLowerCase();

            const codeMatch = (acCode && acCode === code) || (acName && acName === name);
            const sessMatch = !acSess || !sess || acSess === sess;
            return codeMatch && sessMatch;
          });
        });

        // Ensure every assigned course in teacherProfile exists in courses array even if no LMS Course exists yet
        for (const ac of teacherProfile.assignedCourses) {
          const acCode = (ac.courseCode || "").trim().toUpperCase();
          const acName = (ac.courseName || "").trim().toLowerCase();
          const acSess = (ac.session || "").trim().toLowerCase();

          if (!acCode && !acName) continue;

          const alreadyExists = courses.some((c) => {
            const code = (c.displayCode || "").trim().toUpperCase();
            const name = (c.name || "").trim().toLowerCase();
            const sess = (c.session || "").trim().toLowerCase();

            const codeMatch = (acCode && acCode === code) || (acName && acName === name);
            const sessMatch = !acSess || !sess || acSess === sess;
            return codeMatch && sessMatch;
          });

          if (!alreadyExists) {
            const matchImport = courseImports.find((ci) =>
              (acCode && (ci.courseCode || "").trim().toUpperCase() === acCode) ||
              (acName && (ci.courseTitle || "").trim().toLowerCase() === acName)
            );

            const virtualCourse = {
              _id: `assigned_${ac._id || Math.random().toString(36).substring(2, 9)}`,
              displayCode: matchImport?.courseCode || ac.courseCode || "COURSE",
              name: ac.courseName || matchImport?.courseTitle || "Course",
              session: ac.session || teacherProfile.assignedSession || "2023-24",
              department: ac.department || teacherProfile.department || "EDTE",
              levelTerm: ac.levelTerm || "",
              level: matchImport?.level || ac.level || "",
              term: matchImport?.term || ac.term || "",
              students: [],
              isVirtual: true,
            };
            courses.push(virtualCourse);
          }
        }
      }

      courses = await deduplicateTeacherCourses(courses);

      const { resolveCourseCode } = require("../utils/courseUtils");

      courses = await Promise.all(
        courses.map(async (c) => {
          const resolvedCode = resolveCourseCode(c.name, c.displayCode, courseImports);

          // Persist resolved displayCode to MongoDB if this is a real Course document and displayCode was "COURSE"
          if (
            c._id &&
            !String(c._id).startsWith("assigned_") &&
            !c.isVirtual &&
            (c.displayCode === "COURSE" || !c.displayCode) &&
            resolvedCode !== "COURSE"
          ) {
            const CourseModel = require("../models/Course");
            CourseModel.findByIdAndUpdate(c._id, { displayCode: resolvedCode }).catch(() => {});
          }

          const matchImport = courseImports.find(
            (ci) => ci.courseCode.toUpperCase() === resolvedCode
          );
          const matchAssigned =
            teacherProfile?.assignedCourses?.find(
              (ac) =>
                ((ac.courseCode && ac.courseCode.toUpperCase() === resolvedCode) ||
                  (ac.courseName && (c.name || "").trim().toLowerCase() === ac.courseName.trim().toLowerCase())) &&
                (!ac.session || !c.session || ac.session.trim().toLowerCase() === c.session.trim().toLowerCase())
            ) ||
            teacherProfile?.assignedCourses?.find(
              (ac) =>
                (ac.courseCode && ac.courseCode.toUpperCase() === resolvedCode) ||
                (ac.courseName && (c.name || "").trim().toLowerCase() === ac.courseName.trim().toLowerCase())
            );

          let rawLevel = matchAssigned?.level || c.level || matchImport?.level || "";
          let rawTerm = matchAssigned?.term || c.term || matchImport?.term || "";

          if (matchAssigned?.levelTerm) {
            const parts = matchAssigned.levelTerm.split("-").map((s) => s.trim());
            if (parts[0]) rawLevel = parts[0];
            if (parts[1]) rawTerm = parts[1];
          }

          let formattedLevel = rawLevel
            ? rawLevel.toLowerCase().includes("level")
              ? rawLevel
              : `Level ${rawLevel}`
            : "";
          let formattedTerm = rawTerm
            ? rawTerm.toLowerCase().includes("term")
              ? rawTerm
              : `Term ${rawTerm}`
            : "";

          const targetSession = (c.session || matchAssigned?.session || "2023-24").trim();
          const sessRegex = targetSession ? new RegExp(`^(${targetSession.replace(/(\d{4})-(\d{2})$/, '$1-20$2')}|${targetSession.replace(/(\d{4})-20(\d{2})$/, '$1-$2')})$`, "i") : null;
          const normCode = resolvedCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const normTitle = (c.name || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

          const enrolledUserIdsSet = new Set();
          const enrolledStudentIdsSet = new Set();

          if (sessRegex) {
            // A. Approved Registrations
            const approvedRegs = await Registration.find({ status: "Approved", session: { $regex: sessRegex } }).lean();
            approvedRegs.forEach((r) => {
              const hasCourse = (r.selectedCourses || []).some((sc) => {
                const cCode = (sc.courseCode || sc.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                const cTitle = (sc.courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                return (cCode && cCode === normCode) || (cTitle && normTitle && cTitle === normTitle);
              });
              if (hasCourse) {
                if (r.user) enrolledUserIdsSet.add(r.user.toString());
                if (r.studentId) enrolledStudentIdsSet.add(String(r.studentId).trim());
              }
            });

            // B. Enrollments
            const codeReg = new RegExp(`^${resolvedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");
            const titleReg = new RegExp(`${(c.name || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i");
            const enrollments = await Enrollment.find({
              session: { $regex: sessRegex },
              $or: [{ courseCode: { $regex: codeReg } }, { courseTitle: { $regex: titleReg } }]
            }).lean();
            enrollments.forEach((e) => {
              if (e.student) enrolledUserIdsSet.add(e.student.toString());
              if (e.studentId) enrolledStudentIdsSet.add(String(e.studentId).trim());
            });

            // C. Approved Retake Requests
            const RetakeRequest = require("../models/RetakeRequest");
            const approvedRetakes = await RetakeRequest.find({ status: "Approved", targetSession: { $regex: sessRegex } }).lean();
            approvedRetakes.forEach((retake) => {
              const cCode = (retake.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
              const cTitle = (retake.courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
              if ((cCode && cCode === normCode) || (cTitle && normTitle && cTitle === normTitle)) {
                if (retake.student) enrolledUserIdsSet.add(retake.student.toString());
                if (retake.studentId) enrolledStudentIdsSet.add(String(retake.studentId).trim());
              }
            });
          }

          if (enrolledStudentIdsSet.size > 0) {
            const uDocs = await User.find({ studentId: { $in: Array.from(enrolledStudentIdsSet) } }).select("_id").lean();
            uDocs.forEach(u => enrolledUserIdsSet.add(u._id.toString()));
          }

          const cleanUserObjIds = Array.from(enrolledUserIdsSet)
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

          if (c._id && !c.isVirtual && mongoose.Types.ObjectId.isValid(c._id)) {
            const CourseModel = require("../models/Course");
            await CourseModel.findByIdAndUpdate(c._id, { $set: { students: cleanUserObjIds } }).catch(() => {});
          }

          return {
            ...c,
            displayCode: resolvedCode,
            level: formattedLevel,
            term: formattedTerm,
            session: targetSession,
            students: cleanUserObjIds,
            courseType: c.courseType || matchImport?.courseType || "Theory",
            creditHours: c.creditHours || matchImport?.creditHours || 3,
          };
        })
      );

      return res.json({ courses });
    }
  } catch (error) {
    console.error("Error fetching my courses:", error);
    res.status(500).json({ error: error.message });
  }
};

// Teacher Dashboard Summary Metrics & Level-Term Semester View
exports.getTeacherDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.uid;
    const teacherEmail = req.user.email;

    const Teacher = require("../models/Teacher");
    const Adviser = require("../models/Adviser");
    const Student = require("../models/Student");
    const Registration = require("../models/Registration");
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");
    const Attendance = require("../models/Attendance");
    const CourseImport = require("../models/CourseImport");
    const Enrollment = require("../models/Enrollment");
    const RetakeRequest = require("../models/RetakeRequest");
    const { resolveCourseCode } = require("../utils/courseUtils");

    const TeacherProfile = await Teacher.findOne({ email: teacherEmail }).lean();
    if (TeacherProfile) {
      const { syncTeacherCourseAssignments } = require("./umsAdminController");
      await syncTeacherCourseAssignments(TeacherProfile);
    }

    const User = require("../models/User");
    const teacherUserDoc = await User.findOne({ email: teacherEmail }).lean();
    const effectiveUserId = teacherUserDoc ? teacherUserDoc._id : userId;

    const courseImports = await CourseImport.find().lean();

    // 1. Teacher's Courses (strictly matched by Admin assigned courses in TeacherProfile)
    let courses = (effectiveUserId && mongoose.Types.ObjectId.isValid(effectiveUserId))
      ? await Course.find({ teacher: effectiveUserId }).lean()
      : [];

    if (TeacherProfile && Array.isArray(TeacherProfile.assignedCourses) && TeacherProfile.assignedCourses.length > 0) {
      const assignedCodes = new Set(
        TeacherProfile.assignedCourses.map((ac) => (ac.courseCode || "").trim().toUpperCase()).filter(Boolean)
      );
      const assignedNames = TeacherProfile.assignedCourses
        .map((ac) => (ac.courseName || "").trim().toLowerCase())
        .filter(Boolean);

      // Find any missing courses from LMS collection matching assigned codes/names
      const matchedConditions = [];
      if (assignedCodes.size > 0) matchedConditions.push({ displayCode: { $in: Array.from(assignedCodes) } });
      assignedNames.forEach((n) => {
        matchedConditions.push({ name: { $regex: new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
      });

      if (matchedConditions.length > 0) {
        const matchingLmsCourses = await Course.find({ $or: matchedConditions }).lean();
        for (const mc of matchingLmsCourses) {
          if (!courses.some((c) => c._id.toString() === mc._id.toString())) {
            courses.push(mc);
          }
        }
      }

      courses = courses.filter((c) => {
        const code = (c.displayCode || "").trim().toUpperCase();
        const name = (c.name || "").trim().toLowerCase();
        const sess = (c.session || "").trim().toLowerCase();

        return TeacherProfile.assignedCourses.some((ac) => {
          const acCode = (ac.courseCode || "").trim().toUpperCase();
          const acName = (ac.courseName || "").trim().toLowerCase();
          const acSess = (ac.session || "").trim().toLowerCase();

          const codeMatch = (acCode && acCode === code) || (acName && acName === name);
          const sessMatch = !acSess || !sess || acSess === sess;
          return codeMatch && sessMatch;
        });
      });

      // Include all assigned courses from TeacherProfile even if no LMS Course document exists yet
      for (const ac of TeacherProfile.assignedCourses) {
        const acCode = (ac.courseCode || "").trim().toUpperCase();
        const acName = (ac.courseName || "").trim().toLowerCase();
        const acSess = (ac.session || "").trim().toLowerCase();

        if (!acCode && !acName) continue;

        const alreadyExists = courses.some((c) => {
          const code = (c.displayCode || "").trim().toUpperCase();
          const name = (c.name || "").trim().toLowerCase();
          const sess = (c.session || "").trim().toLowerCase();

          const codeMatch = (acCode && acCode === code) || (acName && acName === name);
          const sessMatch = !acSess || !sess || acSess === sess;
          return codeMatch && sessMatch;
        });

        if (!alreadyExists) {
          const matchImport = courseImports.find((ci) =>
            (acCode && (ci.courseCode || "").trim().toUpperCase() === acCode) ||
            (acName && (ci.courseTitle || "").trim().toLowerCase() === acName)
          );

          const resolvedCode = resolveCourseCode(ac.courseName, ac.courseCode || matchImport?.courseCode, courseImports);
          const virtualCourse = {
            _id: `assigned_${ac._id || Math.random().toString(36).substring(2, 9)}`,
            displayCode: resolvedCode,
            name: ac.courseName || matchImport?.courseTitle || "Course",
            session: ac.session || TeacherProfile.assignedSession || "2023-24",
            department: ac.department || TeacherProfile.department || "EDTE",
            levelTerm: ac.levelTerm || "",
            level: matchImport?.level || ac.level || "",
            term: matchImport?.term || ac.term || "",
            students: [],
            isVirtual: true,
          };
          courses.push(virtualCourse);
        }
      }
    }

    // Deduplicate duplicate cards for the same session
    const uniqueMap = new Map();
    for (const c of courses) {
      const codeKey = (c.displayCode && c.displayCode.toUpperCase() !== "COURSE")
        ? c.displayCode
        : (c.name || c.displayCode || "");
      const normCode = codeKey.replace(/[-\s]/g, "").toUpperCase();
      const normSess = (c.session || "").replace(/[-\s]/g, "").toLowerCase();
      const key = `${normCode}_${normSess}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, c);
      } else {
        const primary = uniqueMap.get(key);
        const existingStudentIds = new Set((primary.students || []).map(s => (s._id || s).toString()));
        (c.students || []).forEach(s => {
          const sid = (s._id || s).toString();
          if (!existingStudentIds.has(sid)) {
            primary.students = primary.students || [];
            primary.students.push(s);
            existingStudentIds.add(sid);
          }
        });
      }
    }
    courses = Array.from(uniqueMap.values());

    const courseIds = courses.map(c => c._id);

    // 2. Unique Enrolled Students across all assigned courses
    const allStudentIdsSet = new Set();
    courses.forEach(c => {
      (c.students || []).forEach(s => allStudentIdsSet.add(s.toString()));
    });
    const totalStudents = allStudentIdsSet.size;

    // 3. Adviser status & pending registrations
    const adviserRecords = await Adviser.find({ teacherEmail }).lean();
    let pendingRegCount = 0;
    if (adviserRecords.length > 0) {
      const batches = adviserRecords.map(a => a.assignedBatch);
      const sessions = adviserRecords.map(a => a.session);
      const advStudents = await Student.find({ batch: { $in: batches }, session: { $in: sessions } }).lean();
      const advStudentIds = advStudents.map(s => s.studentId);
      pendingRegCount = await Registration.countDocuments({
        studentId: { $in: advStudentIds },
        status: "Pending Adviser Approval",
      });
    }

    // 4. Pending assignments to grade
    const teacherAssignments = await Assignment.find({ course: { $in: courseIds } }).lean();
    const assignmentIds = teacherAssignments.map(a => a._id);
    const pendingSubmissionsCount = await Submission.countDocuments({
      assignmentId: { $in: assignmentIds },
      marks: null,
    });

    // 5. Attendance count check
    const recentAttendances = await Attendance.countDocuments({ courseId: { $in: courseIds } });

    // 6. Separate Level & Term for each course & collect distinct lists
    const activeLevelsSet = new Set();
    const activeTermsSet = new Set();

    const formattedCourses = await Promise.all(courses.map(async (c) => {
      const resolvedCode = resolveCourseCode(c.name, c.displayCode, courseImports);
      let matchImport = courseImports.find(ci => ci.courseCode.toUpperCase() === resolvedCode);
      let matchAssigned = TeacherProfile?.assignedCourses?.find(ac =>
        ((ac.courseCode && ac.courseCode.toUpperCase() === resolvedCode) ||
        (ac.courseName && (c.name || "").trim().toLowerCase() === ac.courseName.trim().toLowerCase())) &&
        (!ac.session || !c.session || ac.session.trim().toLowerCase() === c.session.trim().toLowerCase())
      ) || TeacherProfile?.assignedCourses?.find(ac =>
        (ac.courseCode && ac.courseCode.toUpperCase() === resolvedCode) ||
        (ac.courseName && (c.name || "").trim().toLowerCase() === ac.courseName.trim().toLowerCase())
      );

      let rawLevel = c.level || matchImport?.level || matchAssigned?.level || "";
      let rawTerm = c.term || matchImport?.term || matchAssigned?.term || "";

      if (matchAssigned?.levelTerm && (!rawLevel || !rawTerm)) {
        const parts = matchAssigned.levelTerm.split("-").map(s => s.trim());
        if (parts[0]) rawLevel = rawLevel || parts[0];
        if (parts[1]) rawTerm = rawTerm || parts[1];
      }

      // Format level (e.g. "Level 1" or "Level 2") and term (e.g. "Term 1" or "Term 2")
      let level = rawLevel ? (rawLevel.toLowerCase().includes("level") ? rawLevel : `Level ${rawLevel}`) : "";
      let term = rawTerm ? (rawTerm.toLowerCase().includes("term") ? rawTerm : `Term ${rawTerm}`) : "";

      if (level) activeLevelsSet.add(level);
      if (term) activeTermsSet.add(term);

      const targetSession = c.session || matchAssigned?.session || "2023-24";
      const cleanSession = targetSession.trim();
      const sessRegex = cleanSession ? new RegExp(`^(${cleanSession.replace(/(\d{4})-(\d{2})$/, '$1-20$2')}|${cleanSession.replace(/(\d{4})-20(\d{2})$/, '$1-$2')})$`, "i") : null;
      const normCode = resolvedCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const normTitle = (c.name || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

      const enrolledUserIdsSet = new Set();
      const enrolledStudentIdsSet = new Set();

      if (sessRegex) {
        // A. Approved Registrations
        const approvedRegs = await Registration.find({ status: "Approved", session: { $regex: sessRegex } }).lean();
        approvedRegs.forEach((r) => {
          const hasCourse = (r.selectedCourses || []).some((sc) => {
            const cCode = (sc.courseCode || sc.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const cTitle = (sc.courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            return (cCode && cCode === normCode) || (cTitle && normTitle && cTitle === normTitle);
          });
          if (hasCourse) {
            if (r.user) enrolledUserIdsSet.add(r.user.toString());
            if (r.studentId) enrolledStudentIdsSet.add(String(r.studentId).trim());
          }
        });

        // B. Enrollments
        const codeReg = new RegExp(`^${resolvedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");
        const titleReg = new RegExp(`${(c.name || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i");
        const enrollments = await Enrollment.find({
          session: { $regex: sessRegex },
          $or: [{ courseCode: { $regex: codeReg } }, { courseTitle: { $regex: titleReg } }]
        }).lean();
        enrollments.forEach((e) => {
          if (e.student) enrolledUserIdsSet.add(e.student.toString());
          if (e.studentId) enrolledStudentIdsSet.add(String(e.studentId).trim());
        });

        // C. Approved Retake Requests
        const RetakeRequest = require("../models/RetakeRequest");
        const approvedRetakes = await RetakeRequest.find({ status: "Approved", targetSession: { $regex: sessRegex } }).lean();
        approvedRetakes.forEach((retake) => {
          const cCode = (retake.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const cTitle = (retake.courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if ((cCode && cCode === normCode) || (cTitle && normTitle && cTitle === normTitle)) {
            if (retake.student) enrolledUserIdsSet.add(retake.student.toString());
            if (retake.studentId) enrolledStudentIdsSet.add(String(retake.studentId).trim());
          }
        });
      }

      // Resolve studentIds to User IDs
      if (enrolledStudentIdsSet.size > 0) {
        const uDocs = await User.find({ studentId: { $in: Array.from(enrolledStudentIdsSet) } }).select("_id").lean();
        uDocs.forEach(u => enrolledUserIdsSet.add(u._id.toString()));
      }

      const cleanUserObjIds = Array.from(enrolledUserIdsSet)
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (c._id && !c.isVirtual && mongoose.Types.ObjectId.isValid(c._id)) {
        await Course.findByIdAndUpdate(c._id, { $set: { students: cleanUserObjIds } }).catch(() => {});
      }

      return {
        ...c,
        displayCode: resolvedCode,
        level,
        term,
        session: targetSession,
        students: cleanUserObjIds,
        totalEnrolled: cleanUserObjIds.length,
      };
    }));

    res.json({
      summary: {
        totalAssignedCourses: formattedCourses.length,
        totalStudents,
        pendingRegistrationRequests: pendingRegCount,
        upcomingClasses: formattedCourses.length,
        pendingAssignments: pendingSubmissionsCount,
        pendingAttendance: Math.max(0, formattedCourses.length * 3 - recentAttendances),
        isAdviser: adviserRecords.length > 0,
      },
      activeLevels: Array.from(activeLevelsSet).sort(),
      activeTerms: Array.from(activeTermsSet).sort(),
      courses: formattedCourses,
    });
  } catch (error) {
    console.error("Teacher dashboard summary error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Enrolled Students Roster for Course
exports.getEnrolledStudentsForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const User = require("../models/User");
    const Student = require("../models/Student");
    const Registration = require("../models/Registration");
    const Enrollment = require("../models/Enrollment");
    const Teacher = require("../models/Teacher");
    const CourseImport = require("../models/CourseImport");
    const ResultUpload = require("../models/ResultUpload");
    const Result = require("../models/Result");

    let course = null;
    let courseCode = "";
    let courseTitle = "";
    let courseSession = "";
    let courseDept = "";
    let courseLevel = "";
    let courseTerm = "";

    // 1. Resolve Course Document or Virtual Assignment Metadata
    if (courseId && !courseId.startsWith("assigned_") && mongoose.Types.ObjectId.isValid(courseId)) {
      course = await Course.findById(courseId).lean();
    }

    if (course) {
      courseCode = (course.displayCode || course.courseCode || course.name || "").trim();
      courseTitle = (course.name || "").trim();
      courseSession = (course.session || "").trim();
      courseDept = (course.department || "").trim();
      courseLevel = (course.level || "").trim();
      courseTerm = (course.term || "").trim();
    } else {
      // Virtual course or unpersisted LMS course fallback
      const teacherProfile = await Teacher.findOne({ email: req.user.email }).lean();
      const assigned = teacherProfile?.assignedCourses?.find(
        (ac) => `assigned_${ac._id}` === courseId || ac.courseCode === courseId || ac.courseName === courseId
      );

      const allImports = await CourseImport.find().lean();
      const matchImport = allImports.find(
        (ci) => (assigned?.courseCode && ci.courseCode.toUpperCase() === assigned.courseCode.toUpperCase()) ||
                (assigned?.courseName && ci.courseTitle.toLowerCase() === assigned.courseName.toLowerCase())
      );

      courseCode = assigned?.courseCode || matchImport?.courseCode || "COURSE";
      courseTitle = assigned?.courseName || matchImport?.courseTitle || "Course";
      courseSession = assigned?.session || teacherProfile?.assignedSession || "2023-24";
      courseDept = assigned?.department || teacherProfile?.department || "EDTE";
      courseLevel = matchImport?.level || assigned?.level || "Level-1";
      courseTerm = matchImport?.term || assigned?.term || "Term-1";

      course = {
        _id: courseId,
        name: courseTitle,
        displayCode: courseCode,
        session: courseSession,
        department: courseDept,
        level: courseLevel,
        term: courseTerm,
        students: [],
        isVirtual: true,
      };
    }

    const normCode = courseCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const codeRegex = new RegExp(`^${courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");
    const cleanSession = courseSession.trim();
    const sessRegex = cleanSession ? new RegExp(`^(${cleanSession.replace(/(\d{4})-(\d{2})$/, '$1-20$2')}|${cleanSession.replace(/(\d{4})-20(\d{2})$/, '$1-$2')})$`, "i") : null;

    // 2. Gather student IDs / User IDs ONLY from confirmed Approved Registrations, Retakes, and Enrollments for THIS session
    const enrolledUserIdsSet = new Set();
    const enrolledStudentIdsSet = new Set();
    const enrolledEmailsSet = new Set();

    // Source A: Enrollment Collection strictly filtered by session
    const enrollQuery = {
      $or: [
        { courseCode: { $regex: codeRegex } },
        { courseTitle: { $regex: new RegExp(courseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") } }
      ]
    };
    if (sessRegex) {
      enrollQuery.session = { $regex: sessRegex };
    }

    const enrollments = await Enrollment.find(enrollQuery).lean();
    enrollments.forEach((e) => {
      if (e.student) enrolledUserIdsSet.add(e.student.toString());
      if (e.studentId) enrolledStudentIdsSet.add(String(e.studentId).trim());
    });

    // Source B: Approved Registration Collection strictly filtered by session
    const normTitle = (courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const regQuery = { status: "Approved" };
    if (sessRegex) {
      regQuery.session = { $regex: sessRegex };
    }
    const approvedSessionRegs = await Registration.find(regQuery).lean();

    const studentRegStatusMap = new Map(); // studentId -> status ("Approved")
    const studentRegSessionMap = new Map(); // studentId -> session ("2022-23", "2023-24", etc.)

    approvedSessionRegs.forEach((r) => {
      const hasCourse = (r.selectedCourses || []).some((c) => {
        const cCode = (c.courseCode || c.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const cTitle = (c.courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        return (cCode && cCode === normCode) || (cTitle && normTitle && cTitle === normTitle);
      });
      if (hasCourse) {
        if (r.user) enrolledUserIdsSet.add(r.user.toString());
        if (r.studentId) {
          const sid = String(r.studentId).trim();
          enrolledStudentIdsSet.add(sid);
          studentRegStatusMap.set(sid, "Approved");
          if (r.session) studentRegSessionMap.set(sid, r.session);
        }
      }
    });

    // Source C: Approved Retake Requests targeting this session
    const RetakeRequest = require("../models/RetakeRequest");
    const retakeQuery = { status: "Approved" };
    if (sessRegex) {
      retakeQuery.targetSession = { $regex: sessRegex };
    }
    const approvedRetakes = await RetakeRequest.find(retakeQuery).lean();

    approvedRetakes.forEach((retake) => {
      const cCode = (retake.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const cTitle = (retake.courseTitle || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if ((cCode && cCode === normCode) || (cTitle && normTitle && cTitle === normTitle)) {
        if (retake.student) enrolledUserIdsSet.add(retake.student.toString());
        if (retake.studentId) {
          const sid = String(retake.studentId).trim();
          enrolledStudentIdsSet.add(sid);
          studentRegStatusMap.set(sid, "Approved");
          if (retake.targetSession) studentRegSessionMap.set(sid, retake.targetSession);
        }
      }
    });

    // 3. Consolidate Student Profiles & User Accounts
    const studentProfiles = await Student.find({
      $or: [
        { studentId: { $in: Array.from(enrolledStudentIdsSet) } },
        { universityEmail: { $in: Array.from(enrolledEmailsSet) } }
      ]
    }).lean();

    studentProfiles.forEach((s) => {
      if (s.studentId) enrolledStudentIdsSet.add(String(s.studentId).trim());
      if (s.universityEmail) enrolledEmailsSet.add(s.universityEmail.toLowerCase().trim());
    });

    const userDocs = await User.find({
      $or: [
        { _id: { $in: Array.from(enrolledUserIdsSet).filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
        { email: { $in: Array.from(enrolledEmailsSet) } },
        { studentId: { $in: Array.from(enrolledStudentIdsSet) } }
      ]
    })
      .select("name email profilePicture department studentId role")
      .lean();

    // Map unique roster by studentId / email
    const studentMap = new Map();

    studentProfiles.forEach((profile) => {
      const emailClean = (profile.universityEmail || "").toLowerCase().trim();
      const uDoc = userDocs.find(
        (u) => (u.studentId && String(u.studentId).trim() === String(profile.studentId).trim()) ||
               (u.email && u.email.toLowerCase().trim() === emailClean)
      );

      const key = String(profile.studentId || emailClean).trim();
      const regStatus = studentRegStatusMap.get(key) || (profile.studentId ? studentRegStatusMap.get(String(profile.studentId).trim()) : null) || "Approved";
      const studentSess = studentRegSessionMap.get(key) || profile.session || cleanSession || "N/A";

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          _id: uDoc ? uDoc._id : profile._id,
          userId: uDoc ? uDoc._id : null,
          studentId: profile.studentId || uDoc?.studentId || "N/A",
          name: profile.name || uDoc?.name || "Student",
          email: profile.universityEmail || uDoc?.email || "N/A",
          profilePicture: uDoc?.profilePicture || "",
          department: profile.department || uDoc?.department || courseDept || "EDTE",
          batch: profile.batch || "N/A",
          session: studentSess,
          academicStatus: (profile.accountStatus && profile.accountStatus.toLowerCase() === "active") || uDoc || regStatus === "Approved" ? "Active" : "Active",
          registrationStatus: regStatus,
          currentLevel: profile.currentLevel || 1,
          currentTerm: profile.currentTerm || 1,
          level: profile.currentLevel ? `Level-${profile.currentLevel}` : (courseLevel || "Level-1"),
          term: profile.currentTerm ? `Term-${profile.currentTerm}` : (courseTerm || "Term-1"),
        });
      }
    });

    // Also add users who might not have a Student profile doc yet
    userDocs.forEach((uDoc) => {
      const emailClean = (uDoc.email || "").toLowerCase().trim();
      const sid = uDoc.studentId ? String(uDoc.studentId).trim() : emailClean;
      const regStatus = studentRegStatusMap.get(sid) || "Approved";
      const studentSess = studentRegSessionMap.get(sid) || cleanSession || "N/A";

      if (sid && !studentMap.has(sid)) {
        studentMap.set(sid, {
          _id: uDoc._id,
          userId: uDoc._id,
          studentId: uDoc.studentId || "N/A",
          name: uDoc.name,
          email: uDoc.email,
          profilePicture: uDoc.profilePicture || "",
          department: uDoc.department || courseDept || "EDTE",
          batch: "N/A",
          session: studentSess,
          academicStatus: "Active",
          registrationStatus: regStatus,
          currentLevel: 1,
          currentTerm: 1,
          level: courseLevel || "Level-1",
          term: courseTerm || "Term-1",
        });
      }
    });

    const roster = Array.from(studentMap.values()).sort((a, b) =>
      String(a.studentId).localeCompare(String(b.studentId), undefined, { numeric: true })
    );

    // 4. Auto-heal LMS Course document students array if real course doc exists
    if (course && course._id && !course.isVirtual && Array.isArray(roster)) {
      const userObjIds = roster.map((s) => s.userId).filter(Boolean);
      Course.findByIdAndUpdate(course._id, { $set: { students: userObjIds } }).catch(() => {});
    }

    res.json({ course, students: roster });
  } catch (error) {
    console.error("Error in getEnrolledStudentsForCourse:", error);
    res.status(500).json({ error: error.message });
  }
};


// Join course by random join code (Student)
exports.joinCourse = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Invalid join code. Must be a string." });
    }

    const course = await Course.findOne({ joinCode: code });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Invalid join code. Course not found." });
    }

    if (!course.isActive) {
      return res.status(400).json({ error: "This course is no longer active" });
    }

    if (course.students.includes(req.user.uid)) {
      return res
        .status(400)
        .json({ error: "You are already enrolled in this course" });
    }

    const student = await User.findById(req.user.uid);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check student email domain
    const isUftbDomain = student.email.endsWith("@std.uftb.ac.bd");

    if (isUftbDomain) {
      course.students.push(req.user.uid);
      await course.save();

      return res.json({
        status: "joined",
        message: `Successfully joined ${course.name} (${course.displayCode})!`,
        course,
      });
    } else {
      const JoinRequest = require("../models/JoinRequest");
      const Notification = require("../models/Notification");
      const { getIO } = require("../socket");
      const { queueEmail } = require("../services/emailService");

      const existingRequest = await JoinRequest.findOne({
        course: course._id,
        student: student._id,
        status: "pending"
      });

      if (existingRequest) {
        return res.status(400).json({ error: "Your join request for this course is already pending approval." });
      }

      // Create pending join request
      const joinRequest = await JoinRequest.create({
        course: course._id,
        student: student._id,
        status: "pending"
      });

      // Notify teacher
      const teacher = await User.findById(course.teacher);
      if (teacher) {
        // 1. Send system notification in database
        const notifLink = "/settings";
        await Notification.create({
          userId: teacher._id,
          title: "Course Join Request",
          message: `${student.name} (${student.email}) requested to join ${course.name} (${course.displayCode}).`,
          type: "join_request",
          link: notifLink,
        });

        // 2. Real-time socket notification
        try {
          const io = getIO();
          if (io) {
            io.to(`user_${teacher._id}`).emit("newNotification", {
              title: "Course Join Request",
              message: `${student.name} (${student.email}) requested to join ${course.name}`,
              type: "join_request",
            });
          }
        } catch (err) {
          console.error("Socket error on notify join request:", err.message);
        }

        // 3. Email notification
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0;">UniCore Course Request</h2>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
              <h3 style="color: #2C4B66;">Hello ${teacher.name},</h3>
              <p>A student whose email domain does not match <strong>@std.uftb.ac.bd</strong> has requested to join your course:</p>
              <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Student Name:</strong> ${student.name}</p>
                <p style="margin: 5px 0;"><strong>Student Email:</strong> ${student.email}</p>
                <p style="margin: 5px 0;"><strong>Course:</strong> ${course.name} (${course.displayCode})</p>
              </div>
              <p>Please login and visit your settings page to approve or reject this request.</p>
              <a href="${(process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/settings" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Settings</a>
            </div>
          </div>
        `;
        queueEmail(teacher.email, "Course Join Request Pending Approval", emailHtml);
      }

      return res.status(202).json({
        status: "pending",
        message: "Join request submitted. Since your email is not in the @std.uftb.ac.bd domain, it requires manual approval from the course instructor.",
      });
    }
  } catch (error) {
    console.error("Join course error:", error);
    res.status(500).json({ error: error.message });
  }
};


// Get single course
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("teacher", "name email profilePicture department")
      .populate("students", "name email studentId profilePicture department");

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    let modified = false;
    if (course.labFormula && course.labFormula.startsWith("=ROUND(")) {
      course.labFormula = course.labFormula.replace("=ROUND(", "=ROUNDUP(");
      modified = true;
    }
    if (course.theoryFormula && course.theoryFormula.startsWith("=ROUND(")) {
      course.theoryFormula = course.theoryFormula.replace("=ROUND(", "=ROUNDUP(");
      modified = true;
    }
    if (modified) {
      await course.save().catch(() => {});
    }

    res.json({ course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Leave course (Student)
exports.leaveCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    course.students = course.students.filter(
      (s) => s.toString() !== req.user.uid,
    );
    await course.save();

    res.json({ message: "Left course successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete course (Teacher only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (
      course.teacher.toString() !== req.user.uid &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await course.deleteOne();
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending join requests (Teacher only)
exports.getJoinRequests = async (req, res) => {
  try {
    const JoinRequest = require("../models/JoinRequest");
    
    // Find courses taught by this teacher
    const courses = await Course.find({ teacher: req.user.uid });
    const courseIds = courses.map((c) => c._id);

    // Find pending requests for these courses
    const requests = await JoinRequest.find({
      course: { $in: courseIds },
      status: "pending"
    })
      .populate("course", "name displayCode")
      .populate("student", "name email studentId department")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error("Get join requests error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Handle join request (Approve/Reject) (Teacher only)
exports.handleJoinRequest = async (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"
    const { requestId } = req.params;
    
    const JoinRequest = require("../models/JoinRequest");
    const Notification = require("../models/Notification");
    const { getIO } = require("../socket");

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be approve or reject." });
    }

    const request = await JoinRequest.findById(requestId).populate("course");
    if (!request) {
      return res.status(404).json({ error: "Join request not found." });
    }

    // Verify ownership
    if (request.course.teacher.toString() !== req.user.uid) {
      return res.status(403).json({ error: "Not authorized to manage this request." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: `This request has already been ${request.status}.` });
    }

    if (action === "approve") {
      request.status = "approved";
      await request.save();

      // Enroll student in course
      const course = await Course.findById(request.course._id);
      if (course && !course.students.includes(request.student)) {
        course.students.push(request.student);
        await course.save();
      }

      // Notify student
      await Notification.create({
        userId: request.student,
        title: "Join Request Approved",
        message: `Your request to join ${request.course.name} has been approved.`,
        type: "join_approved",
        link: `/course/${request.course._id}`,
      });

      try {
        const io = getIO();
        if (io) {
          io.to(`user_${request.student}`).emit("newNotification", {
            title: "Join Request Approved",
            message: `Your request to join ${request.course.name} has been approved.`,
            type: "join_approved",
          });
        }
      } catch (err) {
        console.error("Socket error on approve notification:", err.message);
      }
    } else {
      request.status = "rejected";
      await request.save();

      // Notify student
      await Notification.create({
        userId: request.student,
        title: "Join Request Rejected",
        message: `Your request to join ${request.course.name} was not approved.`,
        type: "join_rejected",
        link: null,
      });

      try {
        const io = getIO();
        if (io) {
          io.to(`user_${request.student}`).emit("newNotification", {
            title: "Join Request Rejected",
            message: `Your request to join ${request.course.name} was not approved.`,
            type: "join_rejected",
          });
        }
      } catch (err) {
        console.error("Socket error on reject notification:", err.message);
      }
    }

    res.json({ message: `Request successfully ${action}d.` });
  } catch (error) {
    console.error("Handle join request error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper to find Assessment document for a student in a course flexibly
const findAssessmentRecord = async (studentDoc, courseDoc) => {
  if (!studentDoc || !courseDoc) return null;

  try {
    const Assessment = require("../models/Assessment");
    const idVal = studentDoc.studentIdNumber || studentDoc.studentId || "";
    const studentIdStr = idVal ? String(idVal).trim() : "";
    const displayCode = (courseDoc.displayCode || courseDoc.code || "").trim();
    const rawCode = displayCode.replace(/[-\s]/g, "");

    // Build course code variants for matching e.g. "CSE 201", "CSE201", "CSE-201"
    const codeVariants = [
      displayCode,
      courseDoc.code,
      rawCode
    ].filter(Boolean);

    const codeRegexList = codeVariants.map(c => new RegExp("^" + c.replace(/[-\s]/g, "[-_\\s]?") + "$", "i"));

    const idConditions = [];
    if (studentDoc._id) {
      idConditions.push({ studentId: studentDoc._id });
    }
    if (studentIdStr) {
      idConditions.push({ studentIdNumber: studentIdStr });
      idConditions.push({ studentIdNumber: new RegExp("^" + studentIdStr.replace(/[-\s]/g, "") + "$", "i") });
    }

    if (idConditions.length === 0) return null;

    return await Assessment.findOne({
      $or: idConditions,
      courseCode: { $in: codeRegexList }
    });
  } catch (err) {
    console.error("findAssessmentRecord error:", err);
    return null;
  }
};

// Get All Students Analytics Roster for a Course (Teacher view)
exports.getCourseStudentsAnalytics = async (req, res) => {
  try {
    const courseId = req.params.id;

    const Course = require("../models/Course");
    const Attendance = require("../models/Attendance");
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");
    const Exam = require("../models/Exam");
    const ExamSubmission = require("../models/ExamSubmission");
    const Assessment = require("../models/Assessment");

    // Fetch Course with students populated
    const course = await Course.findById(courseId).populate("students", "name email studentId studentIdNumber department profilePicture");
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Ensure permissions (teacher only)
    if (course.teacher.toString() !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    const assignments = await Assignment.find({ courseId }, "_id totalMarks");
    const exams = await Exam.find({ courseId }, "_id totalMarks");

    const studentsAnalytics = [];

    for (const student of course.students) {
      // 1. Attendance
      const attendance = await Attendance.find({ courseId });
      let presentCount = 0;
      let totalAtt = 0;
      attendance.forEach((att) => {
        const record = att.records.find((r) => r.studentId.toString() === student._id.toString());
        if (record) {
          totalAtt++;
          if (record.status === "present") presentCount++;
        }
      });
      const attendancePercent = totalAtt > 0 ? (presentCount / totalAtt) * 100 : 0;

      // 2. Assignments
      const submissions = await Submission.find({
        studentId: student._id,
        assignmentId: { $in: assignments.map((a) => a._id) }
      });
      let assignScoreSum = 0;
      let totalAssignPossible = 0;
      assignments.forEach((assign) => {
        totalAssignPossible += assign.totalMarks || 100;
        const sub = submissions.find((s) => s.assignmentId.toString() === assign._id.toString());
        if (sub && sub.marks !== null) {
          assignScoreSum += sub.marks;
        }
      });
      const assignmentPercent = totalAssignPossible > 0 ? (assignScoreSum / totalAssignPossible) * 100 : 0;

      // 3. Exams
      const examSubmissions = await ExamSubmission.find({
        studentId: student._id,
        examId: { $in: exams.map((e) => e._id) }
      });
      let examScoreSum = 0;
      let totalExamPossible = 0;
      exams.forEach((ex) => {
        totalExamPossible += ex.totalMarks || 100;
        const sub = examSubmissions.find((s) => s.examId.toString() === ex._id.toString());
        const canSeeResults = ex.resultsPublished || ex.publishMode === "auto";
        if (sub && sub.graded && canSeeResults) {
          examScoreSum += sub.totalMarksObtained;
        }
      });
      const examPercent = totalExamPossible > 0 ? (examScoreSum / totalExamPossible) * 100 : 0;

      // 4. Assessment (Search flexibly by student ID & course code)
      const assessment = await findAssessmentRecord(student, course);
      
      // Calculate overall activity score
      let scoreSum = 0;
      let weightSum = 0;

      if (totalAtt > 0) {
        scoreSum += attendancePercent * 0.2;
        weightSum += 0.2;
      }
      if (assignments.length > 0) {
        scoreSum += assignmentPercent * 0.3;
        weightSum += 0.3;
      }
      if (exams.length > 0) {
        scoreSum += examPercent * 0.3;
        weightSum += 0.3;
      }
      if (assessment) {
        const quizPercentage = assessment.quiz ? (assessment.quiz <= 10 ? (assessment.quiz / 10) * 100 : assessment.quiz) : 0;
        const presentationPercentage = assessment.presentation ? (assessment.presentation <= 10 ? (assessment.presentation / 10) * 100 : assessment.presentation) : 0;
        const assessmentAvg = (quizPercentage + presentationPercentage) / 2;
        scoreSum += assessmentAvg * 0.2;
        weightSum += 0.2;
      }

      const activityScore = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;

      studentsAnalytics.push({
        id: student._id,
        name: student.name,
        email: student.email,
        studentIdNumber: student.studentIdNumber || student.studentId || "N/A",
        department: student.department || "N/A",
        profilePicture: student.profilePicture || null,
        stats: {
          attendancePercent: Math.round(attendancePercent),
          assignmentPercent: Math.round(assignmentPercent),
          examPercent: Math.round(examPercent),
          activityScore,
          assessmentTotal: assessment ? assessment.totalMarks : 0
        }
      });
    }

    studentsAnalytics.sort((a, b) => {
      const idA = String(a.studentIdNumber || "").trim();
      const idB = String(b.studentIdNumber || "").trim();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });

    res.json({ students: studentsAnalytics });
  } catch (error) {
    console.error("Get course students analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Single Student Detail Analytics (For Teacher & the Student themselves)
exports.getStudentAnalytics = async (req, res) => {
  try {
    const courseId = req.params.id;
    const studentId = req.params.studentId;

    const Course = require("../models/Course");
    const Attendance = require("../models/Attendance");
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");
    const Exam = require("../models/Exam");
    const ExamSubmission = require("../models/ExamSubmission");
    const Assessment = require("../models/Assessment");

    // Fetch Course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check permission: Teacher of course or the student themselves
    const isTeacher = course.teacher.toString() === req.user.uid;
    const isSelf = studentId === req.user.uid;

    if (!isTeacher && !isSelf) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch Student Details
    const student = await User.findById(studentId, "name email studentId studentIdNumber department profilePicture");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Use MongoDB _id for all sub-collection queries (not Firebase UID)
    const studentMongoId = student._id;

    // 1. Fetch Attendance Records
    const attendanceRecords = await Attendance.find({ courseId }).sort({ date: 1 });
    let presentCount = 0;
    let absentCount = 0;
    const attendanceHistory = [];

    attendanceRecords.forEach((att) => {
      const record = att.records.find((r) => r.studentId.toString() === studentMongoId.toString());
      if (record) {
        if (record.status === "present") {
          presentCount++;
        } else {
          absentCount++;
        }
        attendanceHistory.push({
          date: att.date,
          status: record.status,
          classType: att.classType || "theory"
        });
      }
    });

    const totalAttendanceCount = presentCount + absentCount;
    const attendancePercentage = totalAttendanceCount > 0 ? (presentCount / totalAttendanceCount) * 100 : 0;

    // 2. Fetch Assignment Submissions - use student._id (ObjectId)
    const assignments = await Assignment.find({ courseId }).sort({ createdAt: 1 });
    // Do NOT populate assignmentId - compare raw ObjectIds directly
    const assignmentSubmissions = await Submission.find({
      studentId: studentMongoId,
      assignmentId: { $in: assignments.map((a) => a._id) }
    });

    const assignmentData = assignments.map((assign) => {
      // Compare ObjectIds as strings directly (no populate, so assignmentId is still ObjectId)
      const sub = assignmentSubmissions.find(
        (s) => s.assignmentId.toString() === assign._id.toString()
      );
      const maxMarks = assign.totalMarks || 100;
      const marksObtained = sub ? (sub.marks !== undefined ? sub.marks : null) : null;
      return {
        id: assign._id,
        title: assign.title,
        createdAt: assign.createdAt,
        deadline: assign.deadline,
        totalMarks: maxMarks,
        marksObtained,
        submitted: !!sub,
        submittedAt: sub ? sub.submittedAt : null,
        percentage: marksObtained !== null ? (marksObtained / maxMarks) * 100 : null,
        feedback: sub ? (sub.feedback || "") : ""
      };
    });

    let totalAssignPossible = 0;
    let totalAssignEarned = 0;
    assignmentData.forEach((a) => {
      totalAssignPossible += a.totalMarks || 100;
      if (a.marksObtained !== null) {
        totalAssignEarned += a.marksObtained;
      }
    });
    const assignmentAverage = totalAssignPossible > 0 ? (totalAssignEarned / totalAssignPossible) * 100 : 0;

    // 3. Fetch Exam Submissions - use student._id (ObjectId)
    const exams = await Exam.find({ courseId }).sort({ scheduledAt: 1 });
    // Do NOT populate examId - compare raw ObjectIds directly
    const examSubmissions = await ExamSubmission.find({
      studentId: studentMongoId,
      examId: { $in: exams.map((e) => e._id) }
    });

    const examData = exams.map((ex) => {
      // Compare ObjectIds as strings directly (no populate, so examId is still ObjectId)
      const sub = examSubmissions.find(
        (s) => s.examId.toString() === ex._id.toString()
      );
      const maxMarks = ex.totalMarks || 100;

      const canSeeResults = ex.resultsPublished || ex.publishMode === "auto";
      const marksObtained = sub && sub.graded && canSeeResults ? sub.totalMarksObtained : null;
      const percentage = sub && sub.graded && canSeeResults ? sub.percentage : null;

      return {
        title: ex.title,
        scheduledAt: ex.scheduledAt,
        totalMarks: maxMarks,
        marksObtained,
        submitted: !!sub,
        graded: sub ? sub.graded : false,
        submittedAt: sub ? sub.submittedAt : null,
        percentage,
        feedback: sub && canSeeResults ? (sub.feedback || "") : "",
        resultsPublished: ex.resultsPublished
      };
    });

    let totalExamPossible = 0;
    let totalExamEarned = 0;
    examData.forEach((e) => {
      totalExamPossible += e.totalMarks || 100;
      if (e.marksObtained !== null) {
        totalExamEarned += e.marksObtained;
      }
    });
    const examAverage = totalExamPossible > 0 ? (totalExamEarned / totalExamPossible) * 100 : 0;

    // 4. Fetch Manual Assessments (Robust search by student ID & course code)
    const assessment = await findAssessmentRecord(student, course);

    // 5. Calculate Overall Performance / Activity Score
    let scoreSum = 0;
    let weightSum = 0;

    // Attendance
    if (totalAttendanceCount > 0) {
      scoreSum += attendancePercentage * 0.2;
      weightSum += 0.2;
    }
    // Assignments
    if (assignments.length > 0) {
      scoreSum += assignmentAverage * 0.3;
      weightSum += 0.3;
    }
    // Exams
    if (exams.length > 0) {
      scoreSum += examAverage * 0.3;
      weightSum += 0.3;
    }
    // Assessment Quiz & Presentation (out of 20 total)
    if (assessment) {
      const quizPercentage = assessment.quiz ? (assessment.quiz / 10) * 100 : 0;
      const presentationPercentage = assessment.presentation ? (assessment.presentation / 10) * 100 : 0;
      const assessmentAvg = (quizPercentage + presentationPercentage) / 2;
      scoreSum += assessmentAvg * 0.2;
      weightSum += 0.2;
    }

    const activityScore = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;

    // Determine performance grade label
    let gradeLabel = "N/A";
    let gradeColor = "#94a3b8";
    if (activityScore >= 80) {
      gradeLabel = "Outstanding (A+)";
      gradeColor = "#10b981";
    } else if (activityScore >= 70) {
      gradeLabel = "Very Good (A)";
      gradeColor = "#3b82f6";
    } else if (activityScore >= 60) {
      gradeLabel = "Good (B)";
      gradeColor = "#f59e0b";
    } else if (activityScore >= 50) {
      gradeLabel = "Average (C)";
      gradeColor = "#f97316";
    } else if (activityScore > 0) {
      gradeLabel = "Needs Improvement (F)";
      gradeColor = "#ef4444";
    }

    // Dynamically calculate Class Average for the course across 5 parameters
    let classAttAvg = 78;
    let classAssignAvg = 72;
    let classExamAvg = 70;
    let classPresAvg = 68;
    let classAssAvg = 75;

    try {
      // 1. Attendance Class Average
      const allAttendance = await Attendance.find({ courseId });
      let totalPresent = 0;
      let totalRecords = 0;
      allAttendance.forEach((att) => {
        (att.records || []).forEach((rec) => {
          totalRecords++;
          if (rec.status === "present") totalPresent++;
        });
      });
      if (totalRecords > 0) {
        classAttAvg = Math.round((totalPresent / totalRecords) * 100);
      }

      // 2. Assignment Class Average
      const allAssignments = await Assignment.find({ courseId });
      const assignIds = allAssignments.map((a) => a._id);
      const allSubmissions = await Submission.find({ assignmentId: { $in: assignIds } });
      let assignSum = 0;
      let assignCount = 0;
      allSubmissions.forEach((sub) => {
        const assign = allAssignments.find((a) => a._id.toString() === sub.assignmentId.toString());
        if (assign && sub.marks !== null) {
          assignSum += (sub.marks / (assign.totalMarks || 100)) * 100;
          assignCount++;
        }
      });
      if (assignCount > 0) {
        classAssignAvg = Math.round(assignSum / assignCount);
      }

      // 3. Exams Class Average
      const allExams = await Exam.find({ courseId });
      const examIds = allExams.map((e) => e._id);
      const allExamSubs = await ExamSubmission.find({ examId: { $in: examIds }, graded: true });
      let examSum = 0;
      let examCount = 0;
      allExamSubs.forEach((sub) => {
        const exam = allExams.find((e) => e._id.toString() === sub.examId.toString());
        if (exam && sub.totalMarksObtained !== null) {
          examSum += (sub.totalMarksObtained / (exam.totalMarks || 100)) * 100;
          examCount++;
        }
      });
      if (examCount > 0) {
        classExamAvg = Math.round(examSum / examCount);
      }

      // 4 & 5. Assessments Class Average (All 5 parameters derived from assessment if available)
      const toPercentage = (val) => {
        if (val === undefined || val === null || isNaN(val)) return 0;
        const num = Number(val);
        if (num <= 0) return 0;
        if (num <= 10) return Math.min(100, Math.round((num / 10) * 100));
        if (num <= 15) return Math.min(100, Math.round((num / 15) * 100));
        if (num <= 30) return Math.min(100, Math.round((num / 30) * 100));
        if (num <= 40) return Math.min(100, Math.round((num / 40) * 100));
        return Math.min(100, Math.round(num));
      };

      const displayCode = (course.displayCode || course.code || "").trim();
      const rawCode = displayCode.replace(/[-\s]/g, "");
      const allAssessments = await Assessment.find({
        courseCode: { $regex: new RegExp("^" + rawCode.replace(/([a-zA-Z]+)(\d+)/, "$1[-_\\s]?$2") + "$", "i") }
      });
      if (allAssessments.length > 0) {
        let attSum = 0;
        let quizSum = 0;
        let assignSum = 0;
        let presSum = 0;
        let totalSum = 0;

        allAssessments.forEach((ass) => {
          attSum += ass.attendance || 0;
          quizSum += ass.quiz || 0;
          assignSum += ass.assignment || 0;
          presSum += ass.presentation || 0;
          totalSum += ass.totalMarks || 0;
        });

        const count = allAssessments.length;
        classAttAvg = toPercentage(attSum / count);
        classAssignAvg = toPercentage(assignSum / count);
        classExamAvg = toPercentage(quizSum / count);
        classPresAvg = toPercentage(presSum / count);
        classAssAvg = toPercentage(totalSum / count);
      }
    } catch (e) {
      console.error("Error calculating dynamic class average:", e);
    }

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        studentIdNumber: student.studentIdNumber || student.studentId || "N/A",
        department: student.department || "N/A",
        profilePicture: student.profilePicture || null
      },
      summary: {
        attendancePercent: Math.round(attendancePercentage),
        totalAttendanceCount,
        presentCount,
        absentCount,
        assignmentAverage: Math.round(assignmentAverage),
        completedAssignments: assignmentSubmissions.length,
        totalAssignments: assignments.length,
        examAverage: Math.round(examAverage),
        completedExams: examSubmissions.length,
        totalExams: exams.length,
        activityScore,
        gradeLabel,
        gradeColor,
        classAverage: {
          attendance: classAttAvg,
          assignment: classAssignAvg,
          quiz: classExamAvg,
          presentation: classPresAvg,
          assessment: classAssAvg
        },
        assessment: assessment ? {
          attendance: assessment.attendance,
          quiz: assessment.quiz,
          assignment: assessment.assignment,
          presentation: assessment.presentation,
          totalMarks: assessment.totalMarks
        } : null
      },
      history: {
        attendance: attendanceHistory,
        assignments: assignmentData,
        exams: examData
      }
    });

  } catch (error) {
    console.error("Get student analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};
