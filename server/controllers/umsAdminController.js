const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const CourseImport = require("../models/CourseImport");
const Adviser = require("../models/Adviser");
const RegistrationCalendar = require("../models/RegistrationCalendar");
const Payment = require("../models/Payment");
const Registration = require("../models/Registration");

exports.getStats = async (req, res) => {
  try {
    const User = require("../models/User");

    const students = await Student.find().lean();
    const teachers = await Teacher.find().lean();
    const advisers = await Adviser.find().lean();
    const courses = await CourseImport.find().lean();

    // Fetch signed up user emails from User collection (where user has completed signup)
    const registeredUsers = await User.find({ isRegistered: true }, "email role").lean();
    const registeredEmailSet = new Set(
      registeredUsers.map((u) => (u.email || "").toLowerCase().trim()).filter(Boolean)
    );

    // Active / Inactive breakdown based on signup & department analytics
    let activeStudents = 0;
    let inactiveStudents = 0;
    const deptStudentCounts = {};
    const sessionStudentCounts = {};

    students.forEach((s) => {
      const email = (s.universityEmail || "").toLowerCase().trim();
      if (registeredEmailSet.has(email)) {
        activeStudents++;
      } else {
        inactiveStudents++;
      }

      const dept = (s.department || "Unassigned").trim();
      deptStudentCounts[dept] = (deptStudentCounts[dept] || 0) + 1;

      const sess = (s.session || "N/A").trim();
      sessionStudentCounts[sess] = (sessionStudentCounts[sess] || 0) + 1;
    });

    let activeTeachers = 0;
    let inactiveTeachers = 0;
    const deptTeacherCounts = {};

    teachers.forEach((t) => {
      const email = (t.email || "").toLowerCase().trim();
      if (registeredEmailSet.has(email)) {
        activeTeachers++;
      } else {
        inactiveTeachers++;
      }

      const dept = (t.department || "Unassigned").trim();
      deptTeacherCounts[dept] = (deptTeacherCounts[dept] || 0) + 1;
    });

    let activeAdvisers = 0;
    let inactiveAdvisers = 0;
    advisers.forEach((a) => {
      const email = (a.teacherEmail || "").toLowerCase().trim();
      if (registeredEmailSet.has(email)) {
        activeAdvisers++;
      } else {
        inactiveAdvisers++;
      }
    });

    const Course = require("../models/Course");
    const lmsCourses = await Course.find().lean();
    const totalCoursesCount = Math.max(courses.length, lmsCourses.length);

    res.json({
      students: {
        total: students.length,
        active: activeStudents,
        inactive: inactiveStudents,
      },
      teachers: {
        total: teachers.length,
        active: activeTeachers,
        inactive: inactiveTeachers,
      },
      advisers: {
        total: advisers.length,
        active: activeAdvisers,
        inactive: inactiveAdvisers,
      },
      courses: totalCoursesCount,
      deptStudentCounts,
      deptTeacherCounts,
      sessionStudentCounts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of students." });
    }

    const savedStudents = [];

    for (const record of students) {
      const {
        studentId,
        name,
        universityEmail,
        department,
        program,
        batch,
        session,
        admissionSemester,
        currentLevel,
        currentTerm,
        accountStatus,
      } = record;

      if (!studentId || !name || !universityEmail) {
        continue; // skip invalid row
      }

      const sId = String(studentId).trim();
      const sEmail = String(universityEmail).trim().toLowerCase();

      let existingStudent = null;
      if (sEmail) {
        existingStudent = await Student.findOne({ universityEmail: sEmail });
      }
      if (!existingStudent && sId) {
        existingStudent = await Student.findOne({ studentId: sId });
      }

      const finalSession = String(session !== undefined && session !== null && session !== "" ? session : "2023-24").trim();
      const defaultSemester = `${finalSession.split("-")[0] || "2023"} 2022`;
      const finalAdmissionSemester = admissionSemester && String(admissionSemester).trim() ? String(admissionSemester).trim() : defaultSemester;

      const studentUpdateData = {
        studentId: sId,
        name: String(name).trim(),
        universityEmail: sEmail,
        department: String(department !== undefined && department !== null ? department : "EDTE").trim(),
        program: String(program !== undefined && program !== null ? program : "BSc. Eng in EDTE").trim(),
        batch: String(batch !== undefined && batch !== null ? batch : "6th").trim(),
        session: finalSession,
        admissionSemester: finalAdmissionSemester,
        currentLevel: currentLevel !== undefined && currentLevel !== null ? Number(currentLevel) : 1,
        currentTerm: currentTerm !== undefined && currentTerm !== null ? Number(currentTerm) : 1,
        accountStatus: String(accountStatus !== undefined && accountStatus !== null ? accountStatus : "inactive").trim(),
      };

      let savedDoc;
      if (existingStudent) {
        savedDoc = await Student.findByIdAndUpdate(existingStudent._id, { $set: studentUpdateData }, { returnDocument: "after" });
      } else {
        savedDoc = await Student.create(studentUpdateData);
      }
      if (savedDoc) savedStudents.push(savedDoc);
    }

    res.json({ message: "Students imported successfully.", students: savedStudents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of teachers." });
    }

    // Group rows by Teacher ID / Email to support multi-line course assignments in Excel
    const groupedTeachers = {};

    let currentTeacherId = "";
    let currentName = "";
    let currentEmail = "";
    let currentDept = "";

    for (const record of teachers) {
      const rawTeacherId = record.teacherId !== undefined && record.teacherId !== null ? String(record.teacherId).trim() : "";
      const rawName = record.name !== undefined && record.name !== null ? String(record.name).trim() : "";
      const rawEmail = record.email !== undefined && record.email !== null ? String(record.email).trim().toLowerCase() : "";
      const rawDept = record.department !== undefined && record.department !== null ? String(record.department).trim() : "";

      if (rawEmail) {
        if (rawEmail !== currentEmail) {
          currentEmail = rawEmail;
          currentTeacherId = rawTeacherId;
          currentName = rawName;
          currentDept = rawDept;
        } else {
          if (rawTeacherId) currentTeacherId = rawTeacherId;
          if (rawName) currentName = rawName;
          if (rawDept) currentDept = rawDept;
        }
      } else if (rawTeacherId) {
        if (rawTeacherId !== currentTeacherId) {
          currentTeacherId = rawTeacherId;
          currentEmail = rawEmail;
          currentName = rawName;
          currentDept = rawDept;
        } else {
          if (rawName) currentName = rawName;
          if (rawDept) currentDept = rawDept;
        }
      } else if (rawName) {
        if (rawName !== currentName) {
          currentName = rawName;
          currentEmail = rawEmail;
          currentTeacherId = rawTeacherId;
          currentDept = rawDept;
        }
      }

      const key = currentEmail || currentTeacherId;
      if (!key) continue;

      if (!groupedTeachers[key]) {
        const rawAdvSess = record.adviserSession !== undefined && record.adviserSession !== null ? String(record.adviserSession).trim() : "";
        groupedTeachers[key] = {
          teacherId: currentTeacherId || currentEmail,
          name: currentName,
          email: currentEmail,
          department: currentDept,
          assignedLevelTerm: String(record.assignedLevelTerm || "").trim(),
          assignedSession: String(record.assignedSession || "").trim(),
          assignedCourses: [],
          adviserSession: rawAdvSess,
        };
      } else {
        if (record.adviserSession) {
          groupedTeachers[key].adviserSession = String(record.adviserSession).trim();
        }
        if (currentTeacherId && groupedTeachers[key].teacherId !== currentTeacherId) {
          groupedTeachers[key].teacherId = currentTeacherId;
        }
        if (currentName && !groupedTeachers[key].name) {
          groupedTeachers[key].name = currentName;
        }
        if (currentDept && !groupedTeachers[key].department) {
          groupedTeachers[key].department = currentDept;
        }
      }

      // Add course assignment detail if course name is present
      const courseName = String(record.assignedCourses || "").trim();
      if (courseName) {
        const levelTerm = String(record.assignedLevelTerm || groupedTeachers[key].assignedLevelTerm || "").trim();
        const session = String(record.assignedSession || groupedTeachers[key].assignedSession || "").trim();

        // Avoid exact duplicate course entries
        const exists = groupedTeachers[key].assignedCourses.some(
          (c) => c.courseName === courseName && c.levelTerm === levelTerm && c.session === session
        );
        if (!exists) {
          groupedTeachers[key].assignedCourses.push({
            courseName,
            levelTerm,
            session,
          });
        }
      }
    }

    // Ensure all existing teacher & admin users do not have erroneous studentId set
    const User = require("../models/User");
    await User.updateMany(
      { role: { $in: ["teacher", "admin"] }, studentId: { $exists: true } },
      { $unset: { studentId: 1 } }
    );

    for (const key of Object.keys(groupedTeachers)) {
      const t = groupedTeachers[key];
      const targetEmail = t.email ? t.email.toLowerCase().trim() : "";
      const targetTeacherId = t.teacherId || key;

      let existingTeacher = null;
      if (targetEmail) {
        existingTeacher = await Teacher.findOne({ email: targetEmail });
      }
      if (!existingTeacher && targetTeacherId) {
        existingTeacher = await Teacher.findOne({ teacherId: targetTeacherId });
      }

      // If targetTeacherId is provided and conflicts with a DIFFERENT teacher document in DB,
      // resolve conflict so unique index teacherId_1 does NOT crash findAndModify or create
      if (targetTeacherId) {
        const conflictDoc = await Teacher.findOne({ teacherId: targetTeacherId });
        if (conflictDoc && (!existingTeacher || conflictDoc._id.toString() !== existingTeacher._id.toString())) {
          const conflictEmailInBatch = Object.values(groupedTeachers).find(
            (gt) => gt.email && gt.email.toLowerCase().trim() === conflictDoc.email.toLowerCase()
          );
          if (conflictEmailInBatch && conflictEmailInBatch.teacherId && conflictEmailInBatch.teacherId !== targetTeacherId) {
            await Teacher.findByIdAndUpdate(conflictDoc._id, { teacherId: conflictEmailInBatch.teacherId });
          } else {
            const tempId = `${conflictDoc.teacherId}_old_${Date.now().toString().slice(-4)}`;
            await Teacher.findByIdAndUpdate(conflictDoc._id, { teacherId: tempId });
          }
        }
      }

      const updateFields = {
        teacherId: targetTeacherId,
        name: t.name,
        email: targetEmail,
        department: t.department,
        program: t.program || "BSc. Eng in EDTE",
        assignedLevelTerm: t.assignedLevelTerm,
        assignedSession: t.assignedSession,
        assignedCourses: t.assignedCourses,
        adviserSession: t.adviserSession,
      };

      let savedTeacher = null;
      if (existingTeacher) {
        savedTeacher = await Teacher.findByIdAndUpdate(
          existingTeacher._id,
          { $set: updateFields },
          { returnDocument: "after" }
        );
      } else {
        savedTeacher = await Teacher.create(updateFields);
      }

      // Also sync/update corresponding User document for login authentication
      if (targetEmail) {
        let userDoc = await User.findOne({ email: targetEmail });
        if (userDoc) {
          if (t.name) userDoc.name = t.name;
          if (t.department) userDoc.department = t.department;
          if (userDoc.role === "student") {
            userDoc.studentId = targetTeacherId;
          } else {
            userDoc.studentId = undefined;
          }
          await userDoc.save();
        }
      }

      // Sync teacher assignment to real LMS Course documents in MongoDB
      if (savedTeacher) {
        await syncTeacherCourseAssignments(savedTeacher);
      }
    }

    res.json({ message: "Teachers imported and courses synced successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const syncTeacherCourseAssignments = async (teacherDoc) => {
  try {
    if (!teacherDoc || !teacherDoc.email) return;

    const User = require("../models/User");
    const Course = require("../models/Course");
    const CourseImport = require("../models/CourseImport");
    const bcrypt = require("bcryptjs");

    const email = teacherDoc.email.trim().toLowerCase();
    let userDoc = await User.findOne({ email });

    if (!userDoc) {
      const hashedPassword = await bcrypt.hash("111111", 10);
      userDoc = await User.create({
        name: teacherDoc.name,
        email,
        password: hashedPassword,
        role: "teacher",
        department: teacherDoc.department || "",
        studentId: teacherDoc.teacherId || "",
      });
    } else {
      if (userDoc.name !== teacherDoc.name) {
        userDoc.name = teacherDoc.name;
        await userDoc.save();
      }
    }

    if (!userDoc) return;

    const assigned = teacherDoc.assignedCourses || [];
    for (const item of assigned) {
      const code = (item.courseCode || "").trim().toUpperCase();
      const name = (item.courseName || "").trim();
      const targetSession = item.session || teacherDoc.assignedSession || "";

      if (!code && !name) continue;

      const baseConditions = [];
      if (code) baseConditions.push({ displayCode: code });
      if (name) baseConditions.push({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });

      // SESSION-ISOLATED MATCHING:
      // Try to find course card matching displayCode/name AND targetSession
      let existingCourse = targetSession
        ? await Course.findOne({ $or: baseConditions, session: targetSession })
        : await Course.findOne({ $or: baseConditions });

      if (existingCourse) {
        // Link teacher to existing LMS course for this specific session
        existingCourse.teacher = userDoc._id;
        if (targetSession && !existingCourse.session) existingCourse.session = targetSession;
        await existingCourse.save();
      } else {
        // Auto-create LMS Course document for this session if missing in Course collection
        const importMatch = await CourseImport.findOne({
          $or: [
            ...(code ? [{ courseCode: code }] : []),
            ...(name ? [{ courseTitle: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }] : [])
          ]
        }).lean();

        const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
        await Course.create({
          name: name || importMatch?.courseTitle || code || "New Course",
          displayCode: (code || importMatch?.courseCode || "COURSE").toUpperCase(),
          session: targetSession,
          department: teacherDoc.department || importMatch?.department || "EDTE",
          teacher: userDoc._id,
          joinCode: joinCode,
          students: [],
        });
      }
    }
  } catch (err) {
    console.error("Error in syncTeacherCourseAssignments:", err);
  }
};
exports.syncTeacherCourseAssignments = syncTeacherCourseAssignments;

exports.importCourses = async (req, res) => {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of courses." });
    }

    for (const record of courses) {
      const {
        courseCode,
        courseTitle,
        courseType,
        creditHours,
        department,
        program,
        level,
        term,
      } = record;

      if (!courseCode || !courseTitle) {
        continue;
      }

      let cleanType = String(courseType !== undefined && courseType !== null ? courseType : "").trim();
      if (cleanType.toLowerCase().includes("lab") || cleanType.toLowerCase().includes("session")) {
        cleanType = "Sessional";
      } else {
        cleanType = "Theory";
      }

      await CourseImport.findOneAndUpdate(
        { courseCode: String(courseCode).trim().toUpperCase() },
        {
          courseTitle: String(courseTitle).trim(),
          courseType: cleanType,
          creditHours: Number(creditHours) || 0,
          department: String(department !== undefined && department !== null ? department : "").trim(),
          program: String(program !== undefined && program !== null ? program : "").trim(),
          level: String(level !== undefined && level !== null ? level : "").trim(),
          term: String(term !== undefined && term !== null ? term : "").trim(),
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Courses imported successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importAdvisers = async (req, res) => {
  try {
    const { advisers } = req.body;
    if (!Array.isArray(advisers)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of advisers." });
    }

    const Teacher = require("../models/Teacher");
    const teachersList = await Teacher.find().lean();
    const teacherMap = {};
    teachersList.forEach((t) => {
      if (t.email) teacherMap[t.email.toLowerCase().trim()] = t;
      if (t.teacherId) teacherMap[String(t.teacherId).trim()] = t;
      if (t.name) teacherMap[t.name.toLowerCase().trim()] = t;
    });

    for (const record of advisers) {
      let {
        teacherId,
        teacherName,
        teacherEmail,
        department,
        program,
        session,
        assignedBatch,
      } = record;

      teacherEmail = (teacherEmail || "").trim().toLowerCase();
      teacherId = (teacherId || "").trim();
      teacherName = (teacherName || "").trim();

      // Fallback matching from Teacher collection if email or ID or Name is missing
      const match = teacherMap[teacherEmail] || teacherMap[teacherId] || teacherMap[teacherName.toLowerCase()];
      if (match) {
        if (!teacherEmail && match.email) teacherEmail = match.email.toLowerCase().trim();
        if (!teacherId && match.teacherId) teacherId = String(match.teacherId).trim();
        if (!teacherName && match.name) teacherName = match.name.trim();
        if (!department && match.department) department = match.department.trim();
      }

      if (!teacherEmail && !teacherId && !teacherName) {
        continue; // Skip invalid empty row
      }

      const emailToSave = teacherEmail || `adviser_${teacherId || Date.now()}@uftb.edu.bd`;
      const sessionToSave = String(session || "2023-24").trim();
      const batchToSave = String(assignedBatch || "N/A").trim();

      await Adviser.findOneAndUpdate(
        {
          teacherEmail: emailToSave,
          session: sessionToSave,
          assignedBatch: batchToSave,
        },
        {
          teacherId: teacherId,
          teacherName: teacherName,
          teacherEmail: emailToSave,
          department: String(department || "EDTE").trim(),
          program: String(program || "B.Sc. in Educational Technology and Engineering").trim(),
          session: sessionToSave,
          assignedBatch: batchToSave,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Advisers imported successfully." });
  } catch (error) {
    console.error("Error importing advisers:", error);
    res.status(500).json({ error: error.message || "Failed to import advisers." });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const User = require("../models/User");
    const registeredUsers = await User.find({ isRegistered: true }, "email").lean();
    const registeredEmails = new Set(
      registeredUsers.map((u) => (u.email || "").toLowerCase().trim()).filter(Boolean)
    );

    const students = await Student.find().lean();
    const enriched = students.map((s) => {
      const isSignedUp = registeredEmails.has((s.universityEmail || "").toLowerCase().trim());
      const isActive = isSignedUp || (s.accountStatus || "").toLowerCase() === "active";
      return {
        ...s,
        accountStatus: isActive ? "active" : "inactive",
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const User = require("../models/User");
    const registeredUsers = await User.find({ isBlocked: { $ne: true } }, "email isRegistered").lean();
    const activeEmails = new Set(
      registeredUsers.map((u) => (u.email || "").toLowerCase().trim()).filter(Boolean)
    );

    const teachers = await Teacher.find().lean();
    teachers.sort((a, b) => {
      const idA = String(a.teacherId || "");
      const idB = String(b.teacherId || "");
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });

    const enriched = teachers.map((t) => {
      const email = (t.email || "").toLowerCase().trim();
      const hasUser = activeEmails.has(email);
      const isActive = hasUser || t.isActive !== false || (t.accountStatus || "").toLowerCase() === "active";
      return {
        ...t,
        accountStatus: isActive ? "active" : "inactive",
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const courses = await CourseImport.find();

    // Sort by Level (1 to 4), then Term (1 to 2), preserving course code numerical order
    courses.sort((a, b) => {
      const parseNum = (str) => {
        const numbers = String(str).match(/\d+/g);
        return numbers ? parseInt(numbers[0], 10) : 0;
      };

      const levelA = parseNum(a.level);
      const levelB = parseNum(b.level);
      if (levelA !== levelB) return levelA - levelB;

      const termA = parseNum(a.term);
      const termB = parseNum(b.term);
      if (termA !== termB) return termA - termB;

      return 0; // preserve insertion order for same level & term
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdvisers = async (req, res) => {
  try {
    const User = require("../models/User");
    const advisers = await Adviser.find().sort({ createdAt: -1 }).lean();
    const teachers = await Teacher.find().lean();
    const teacherMap = {};
    teachers.forEach((t) => {
      if (t.email) teacherMap[t.email.toLowerCase().trim()] = t;
    });

    const registeredUsers = await User.find({ isBlocked: { $ne: true } }, "email isRegistered").lean();
    const activeEmailSet = new Set(
      registeredUsers.map((u) => (u.email || "").toLowerCase().trim()).filter(Boolean)
    );

    const enriched = advisers.map((a) => {
      const email = (a.teacherEmail || "").toLowerCase().trim();
      const teacherInfo = teacherMap[email] || {};
      const hasUser = activeEmailSet.has(email);
      const isActive = hasUser || teacherInfo.isActive !== false || (teacherInfo.accountStatus || "").toLowerCase() === "active";
      return {
        ...a,
        teacherId: a.teacherId || teacherInfo.teacherId || "",
        teacherName: a.teacherName || teacherInfo.name || "",
        accountStatus: isActive ? "active" : "inactive",
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== MANUAL EDIT & DELETE HANDLERS ====================
exports.updateStudent = async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const updated = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) {
      await syncTeacherCourseAssignments(updated);
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: "Teacher record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const updated = await CourseImport.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await CourseImport.findByIdAndDelete(req.params.id);
    res.json({ message: "Course record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAdviser = async (req, res) => {
  try {
    const updated = await Adviser.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAdviser = async (req, res) => {
  try {
    await Adviser.findByIdAndDelete(req.params.id);
    res.json({ message: "Adviser assignment record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== REGISTRATION CALENDAR & PAYMENTS ====================
exports.getRegistrationCalendars = async (req, res) => {
  try {
    const calendars = await RegistrationCalendar.find().sort({ createdAt: -1 });
    res.json(calendars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upsertRegistrationCalendar = async (req, res) => {
  try {
    const { program, session, department, level, term, startDate, endDate, maxCredits, minCredits, lateFinePerDay, isOpen } = req.body;
    const progVal = program || "B.Sc. in Educational Technology and Engineering";

    // 1. Validation: Start Date must be before End Date
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: "Validation Error: Start Date must be strictly before End Date!" });
    }

    // 2. Department & Program Keyword Flexible Matching for Student Enrolment Check
    const Student = require("../models/Student");
    const deptClean = (department || "").toLowerCase();
    const isAllDepts = deptClean.includes("all");
    const isEdte = deptClean.includes("edte") || deptClean.includes("educational");
    const isIre = deptClean.includes("ire") || deptClean.includes("robotics");
    const isSwe = deptClean.includes("swe") || deptClean.includes("software");
    const isCyse = deptClean.includes("cyse") || deptClean.includes("cyber");
    const isDse = deptClean.includes("dse") || deptClean.includes("data");

    const deptRegex = isEdte ? /EDTE|Educational/i
                    : isIre ? /IRE|Robotics/i
                    : isSwe ? /SWE|Software/i
                    : isCyse ? /CySE|Cyber/i
                    : isDse ? /DSE|Data/i
                    : new RegExp(department || "EDTE", "i");

    const sessDigits = (session || "").match(/\d+/g);
    const sessRegex = sessDigits && sessDigits.length >= 2
      ? new RegExp(`${sessDigits[0]}.*${sessDigits[1]}`, "i")
      : new RegExp(session || "2023-24", "i");

    const studentQuery = {
      session: { $regex: sessRegex }
    };

    if (progVal) {
      const isMscRule = progVal.toLowerCase().includes("m.sc") || progVal.toLowerCase().includes("master");
      if (isMscRule) {
        studentQuery.$or = [
          { program: { $regex: /M\.?Sc|Master/i } },
          { degree: { $regex: /M\.?Sc|Master/i } }
        ];
      } else {
        studentQuery.$or = [
          { program: { $regex: /B\.?Sc|Bachelor/i } },
          { degree: { $regex: /B\.?Sc|Bachelor/i } },
          { program: { $exists: false } },
          { program: "" }
        ];
      }
    }

    const matchingStudents = await Student.find(studentQuery).lean();

    if (matchingStudents.length === 0) {
      // No students found for this Program + Session combination → block
      return res.status(400).json({
        error: `Validation Error: No students found in Session ${session} for Program "${progVal}". Cannot create a registration rule for a non-existent student group!`
      });
    }

    const sampleStudent = matchingStudents[0];
    const actualLevel = `Level-${sampleStudent.currentLevel}`;
    const actualTerm = `Term-${sampleStudent.currentTerm}`;

    const normLevel = (level || "").replace(/\s+/g, "").toLowerCase();
    const normTerm = (term || "").replace(/\s+/g, "").toLowerCase();
    const normActualLevel = actualLevel.replace(/\s+/g, "").toLowerCase();
    const normActualTerm = actualTerm.replace(/\s+/g, "").toLowerCase();

    if (normLevel !== normActualLevel || normTerm !== normActualTerm) {
      return res.status(400).json({
        error: `Validation Error: Students in Session ${session} (${department}) are currently at ${actualLevel} ${actualTerm}. You cannot open registration for ${level} ${term}!`
      });
    }

    const calendar = await RegistrationCalendar.findOneAndUpdate(
      { program: progVal, session, department, level, term },
      { program: progVal, startDate, endDate, maxCredits, minCredits, lateFinePerDay, isOpen },
      { upsert: true, new: true }
    );
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateRegistrationCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await RegistrationCalendar.findByIdAndUpdate(id, req.body, { new: true });
    if (!calendar) return res.status(404).json({ error: "Calendar rule not found." });
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteRegistrationCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    await RegistrationCalendar.findByIdAndDelete(id);
    res.json({ message: "Registration calendar rule deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("user", "name email").sort({ updatedAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paidAmount, paymentStatus, fineAmount } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    if (paidAmount !== undefined) payment.paidAmount = Number(paidAmount);
    if (fineAmount !== undefined) payment.fineAmount = Number(fineAmount);

    payment.dueAmount = Math.max(0, payment.totalAmount + payment.fineAmount - payment.paidAmount);

    if (paymentStatus) {
      payment.paymentStatus = paymentStatus;
    } else if (payment.dueAmount === 0) {
      payment.paymentStatus = "Paid";
    } else if (payment.paidAmount > 0) {
      payment.paymentStatus = "Partial";
    } else {
      payment.paymentStatus = "Pending";
    }

    payment.updatedAt = new Date();
    await payment.save();

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllRegistrationsAdmin = async (req, res) => {
  try {
    const registrations = await Registration.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Feature: Assign/Reassign Teacher to Course
exports.assignTeacherToCourse = async (req, res) => {
  try {
    const { teacherId, courseCode, level, term, session } = req.body;
    const Teacher = require("../models/Teacher");
    const Course = require("../models/Course");
    const User = require("../models/User");

    const teacherDoc = await Teacher.findById(teacherId);
    if (!teacherDoc) {
      return res.status(404).json({ error: "Teacher record not found." });
    }

    const teacherUser = await User.findOne({ email: teacherDoc.email, role: "teacher" });

    // Add to assignedCourses array in Teacher model
    teacherDoc.assignedCourses.push({
      courseCode: (courseCode || "").toUpperCase(),
      levelTerm: level && term ? `${level} - ${term}` : "",
      level: level || "",
      term: term || "",
      session: session || "",
      department: teacherDoc.department,
    });
    await teacherDoc.save();

    // SESSION-ISOLATED: Reassign or create LMS Course for this specific session
    if (teacherUser && courseCode) {
      const codeStr = (courseCode || "").toUpperCase().trim();
      const sessStr = (session || "").trim();

      let existingCourse = sessStr
        ? await Course.findOne({ displayCode: codeStr, session: sessStr })
        : await Course.findOne({ displayCode: codeStr });

      if (existingCourse) {
        existingCourse.teacher = teacherUser._id;
        if (sessStr) existingCourse.session = sessStr;
        await existingCourse.save();
      } else {
        const importMatch = await CourseImport.findOne({ courseCode: codeStr }).lean();
        const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
        await Course.create({
          name: importMatch?.courseTitle || codeStr,
          displayCode: codeStr,
          session: sessStr,
          department: teacherDoc.department || importMatch?.department || "EDTE",
          teacher: teacherUser._id,
          joinCode: joinCode,
          students: [],
        });
      }
    }

    res.json({ message: "Teacher assigned to course successfully.", teacher: teacherDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Feature: Deactivate/Activate Teacher
exports.toggleTeacherActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const Teacher = require("../models/Teacher");
    const User = require("../models/User");

    const teacherDoc = await Teacher.findById(id);
    if (!teacherDoc) {
      return res.status(404).json({ error: "Teacher record not found." });
    }

    teacherDoc.isActive = !teacherDoc.isActive;
    await teacherDoc.save();

    const userDoc = await User.findOne({ email: teacherDoc.email });
    if (userDoc) {
      userDoc.isBlocked = !teacherDoc.isActive;
      await userDoc.save();
    }

    res.json({ message: `Teacher ${teacherDoc.isActive ? "activated" : "deactivated"} successfully.`, teacher: teacherDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Feature: View Teacher Workload
exports.getTeacherWorkload = async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const Course = require("../models/Course");
    const User = require("../models/User");

    const teachers = await Teacher.find().lean();
    const workload = await Promise.all(
      teachers.map(async (t) => {
        const userDoc = await User.findOne({ email: t.email });
        const courseCount = userDoc ? await Course.countDocuments({ teacher: userDoc._id }) : (t.assignedCourses?.length || 0);
        return {
          _id: t._id,
          teacherId: t.teacherId,
          name: t.name,
          email: t.email,
          department: t.department,
          isActive: t.isActive !== false,
          totalAssignedCourses: courseCount,
          assignedCourses: t.assignedCourses || [],
        };
      })
    );

    workload.sort((a, b) => {
      const idA = String(a.teacherId || "");
      const idB = String(b.teacherId || "");
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });

    res.json(workload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




