const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function testPendingAutoCards() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Teacher = mongoose.model("Teacher", new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const CourseImport = mongoose.model("CourseImport", new mongoose.Schema({}, { strict: false }));
  const Course = mongoose.model("Course", new mongoose.Schema({ teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }, { strict: false }));
  const ResultUpload = mongoose.model("ResultUpload", new mongoose.Schema({}, { strict: false }));
  const Notice = mongoose.model("Notice", new mongoose.Schema({}, { strict: false }));

  const activeResultType = "Final";

  // 1. Existing Upload Keys
  const existingUploadKeys = new Set();
  const allUploadsForKeys = await ResultUpload.find({
    resultType: activeResultType,
    status: { $ne: "Deleted" },
    isDeleted: { $ne: true }
  }).lean();

  const cleanCodeStr = (c) => String(c || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const normSessStr = (s) => {
    if (!s) return "2022-23";
    const str = String(s).trim();
    const match = str.match(/\d{4}[-\s]?\d{2,4}/);
    if (match) {
      const raw = match[0].replace(/\s+/g, "-");
      const parts = raw.split("-");
      if (parts.length === 2 && parts[1].length === 4) {
        return `${parts[0]}-${parts[1].substring(2)}`;
      }
      return raw;
    }
    return str.toLowerCase().replace(/\s+/g, "-");
  };
  const extractDigit = (s) => { const m = String(s || "").match(/(\d+)/); return m ? m[1] : ""; };

  allUploadsForKeys.forEach((u) => {
    const code = cleanCodeStr(u.courseCode);
    const sess = normSessStr(u.session);
    const ldig = extractDigit(u.level) || "1";
    const tdig = extractDigit(u.term) || "1";
    if (code) {
      existingUploadKeys.add(`${code}_${sess}_${ldig}_${tdig}`);
      existingUploadKeys.add(`${code}_${ldig}_${tdig}`);
    }
  });

  const activeNotices = await Notice.find({
    $or: [{ deadlineDate: { $ne: null } }, { category: "Academic" }]
  }).sort({ createdAt: -1 }).lean();

  const findCutoffDeadline = (sess, ldig, tdig) => {
    const matched = activeNotices.find((n) => {
      if (!n.deadlineDate) return false;
      const rMatch = !n.resultDeadlineType || n.resultDeadlineType === activeResultType;
      const sMatch = !n.session || !sess || String(n.session).toLowerCase().includes(String(sess).toLowerCase());
      const nLdig = extractDigit(n.level);
      const nTdig = extractDigit(n.term);
      const lMatch = !nLdig || nLdig === ldig;
      const tMatch = !nTdig || nTdig === tdig;
      return rMatch && sMatch && lMatch && tMatch;
    });
    return matched ? matched.deadlineDate : null;
  };

  const allTeachers = await Teacher.find({}).lean();
  const allTeacherUsers = await User.find({ role: "teacher" }).lean();
  const allLmsCourses = await Course.find({}).populate("teacher", "name email department").lean();
  const allCourseImports = await CourseImport.find({}).lean();

  const findTeacherForCourse = (courseCode, courseTitle, sess) => {
    const cleanCode = cleanCodeStr(courseCode);
    const cleanTitle = String(courseTitle || "").trim().toLowerCase();

    for (const t of allTeachers) {
      const match = (t.assignedCourses || []).some((ac) => {
        const acCode = cleanCodeStr(ac.courseCode || ac.displayCode);
        const acName = String(ac.courseName || ac.courseTitle || "").trim().toLowerCase();
        return (acCode && acCode === cleanCode) || (acName && (acName === cleanTitle || cleanTitle.includes(acName) || acName.includes(cleanTitle)));
      });
      if (match) return { name: t.name, email: t.email };
    }

    for (const u of allTeacherUsers) {
      const match = (u.assignedCourses || []).some((ac) => {
        const acCode = cleanCodeStr(ac.courseCode || ac.displayCode);
        const acName = String(ac.courseName || ac.courseTitle || ac.name || "").trim().toLowerCase();
        return (acCode && acCode === cleanCode) || (acName && (acName === cleanTitle || cleanTitle.includes(acName) || acName.includes(cleanTitle)));
      });
      if (match) return { name: u.name, email: u.email };
    }

    const lmsMatch = allLmsCourses.find((c) => {
      const cCode = cleanCodeStr(c.displayCode || c.courseCode);
      return cCode && cCode === cleanCode;
    });
    if (lmsMatch && lmsMatch.teacher) {
      return { name: lmsMatch.teacher.name, email: lmsMatch.teacher.email };
    }

    return { name: "Assigned Teacher", email: "" };
  };

  const pendingAutoCards = [];
  const seenAutoKeys = new Set();

  // 1. Process Teacher assigned courses first
  allTeachers.forEach((t) => {
    if (!Array.isArray(t.assignedCourses)) return;
    t.assignedCourses.forEach((ac) => {
      const cleanCode = cleanCodeStr(ac.courseCode || ac.displayCode);
      const cleanName = String(ac.courseName || ac.courseTitle || "").trim().toLowerCase();
      const ci = allCourseImports.find(c => {
        const ciCode = cleanCodeStr(c.courseCode);
        const ciTitle = String(c.courseTitle || "").trim().toLowerCase();
        return (cleanCode && ciCode === cleanCode) || (cleanName && (ciTitle === cleanName || ciTitle.includes(cleanName) || cleanName.includes(ciTitle)));
      });

      const codeVal = ac.courseCode || ac.displayCode || ci?.courseCode || "COURSE";
      const titleVal = ac.courseName || ac.courseTitle || ci?.courseTitle || codeVal;
      const sessVal = ac.session || "2022-23";

      const ltParts = (ac.levelTerm || "").split(/\s*-\s*/);
      const rawLevel = ac.level || ltParts[0] || ci?.level || "Level 1";
      const rawTerm = ac.term || ltParts[1] || ci?.term || "Term 1";

      const ldig = extractDigit(rawLevel) || "1";
      const tdig = extractDigit(rawTerm) || "1";

      const normSess = normSessStr(sessVal);
      const key = `${cleanCodeStr(codeVal)}_${normSess}_${ldig}_${tdig}`;

      if (existingUploadKeys.has(key) || seenAutoKeys.has(key)) return;

      seenAutoKeys.add(key);
      const deadline = findCutoffDeadline(sessVal, ldig, tdig);

      pendingAutoCards.push({
        _id: `pending_${cleanCodeStr(codeVal)}_${normSess}_${ldig}_${tdig}_${activeResultType}`,
        isPendingAutoCard: true,
        resultType: activeResultType,
        department: t.department || ci?.department || "EDTE",
        courseCode: codeVal,
        courseTitle: titleVal,
        session: sessVal,
        level: `Level-${ldig}`,
        term: `Term-${tdig}`,
        totalRecords: 0,
        status: "Pending",
        teacherName: t.name || "Assigned Teacher",
        teacherEmail: t.email || "",
        cutoffDeadline: deadline,
        results: [],
        logs: [],
      });
    });
  });

  // 2. Process CourseImport list for active sessions (e.g. 2022-23)
  const activeSessions = Array.from(new Set(activeNotices.map(n => n.session).filter(Boolean)));
  if (!activeSessions.includes("2022-23")) activeSessions.push("2022-23");

  activeSessions.forEach((sessVal) => {
    const normSess = normSessStr(sessVal);

    allCourseImports.forEach((ci) => {
      const codeVal = ci.courseCode;
      const titleVal = ci.courseTitle;
      const ldig = extractDigit(ci.level) || "1";
      const tdig = extractDigit(ci.term) || "1";

      const key = `${cleanCodeStr(codeVal)}_${normSess}_${ldig}_${tdig}`;
      if (existingUploadKeys.has(key) || seenAutoKeys.has(key)) return;

      seenAutoKeys.add(key);

      const teacherInfo = findTeacherForCourse(codeVal, titleVal, sessVal);
      const deadline = findCutoffDeadline(sessVal, ldig, tdig);

      pendingAutoCards.push({
        _id: `pending_${cleanCodeStr(codeVal)}_${normSess}_${ldig}_${tdig}_${activeResultType}`,
        isPendingAutoCard: true,
        resultType: activeResultType,
        department: ci.department || "EDTE",
        courseCode: codeVal,
        courseTitle: titleVal,
        session: sessVal,
        level: `Level-${ldig}`,
        term: `Term-${tdig}`,
        totalRecords: 0,
        status: "Pending",
        teacherName: teacherInfo.name || "Assigned Teacher",
        teacherEmail: teacherInfo.email || "",
        cutoffDeadline: deadline,
        results: [],
        logs: [],
      });
    });
  });

  console.log(`\nTotal Pending Auto Cards: ${pendingAutoCards.length}`);
  const cse115Card = pendingAutoCards.find(c => c.courseCode === "CSE 115" && c.session === "2022-23");
  console.log("\nCSE 115 Card for 2022-23:", cse115Card);

  await mongoose.disconnect();
}

testPendingAutoCards();
