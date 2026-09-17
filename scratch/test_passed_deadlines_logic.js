const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function testPassedDeadlinesLogic() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Teacher = mongoose.model("Teacher", new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const CourseImport = mongoose.model("CourseImport", new mongoose.Schema({}, { strict: false }));
  const Course = mongoose.model("Course", new mongoose.Schema({ teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }, { strict: false }));
  const ResultUpload = mongoose.model("ResultUpload", new mongoose.Schema({}, { strict: false }));
  const Notice = mongoose.model("Notice", new mongoose.Schema({}, { strict: false }));

  const activeResultType = "Final";

  // 1. Fetch active notices with deadlines that HAVE PASSED
  let activeNotices = await Notice.find({
    deadlineDate: { $ne: null }
  }).sort({ createdAt: -1 }).lean();

  if (activeNotices.length === 0) {
    activeNotices = [
      {
        title: "Final Result Submission Cutoff — 2022-23 Level 1 Term-2",
        session: "2022-23",
        level: "Level-1",
        term: "Term-2",
        resultDeadlineType: "Final",
        deadlineDate: new Date("2026-09-16T16:30:00.000Z"), // Passed deadline!
      }
    ];
  }

  const passedNoticeMap = new Map(); // key -> notice
  const extractDigit = (s) => { const m = String(s || "").match(/(\d+)/); return m ? m[1] : ""; };
  const cleanCodeStr = (c) => String(c || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const normSessStr = (s) => {
    if (!s) return "";
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

  const now = new Date();

  activeNotices.forEach(n => {
    if (!n.deadlineDate) return;
    const isPassed = now > new Date(n.deadlineDate);
    const rMatch = !n.resultDeadlineType || n.resultDeadlineType === activeResultType;
    if (isPassed && rMatch) {
      const sess = normSessStr(n.session);
      const ldig = extractDigit(n.level) || "1";
      const tdig = extractDigit(n.term) || "1";
      passedNoticeMap.set(`${sess}_${ldig}_${tdig}`, n);
      passedNoticeMap.set(`${ldig}_${tdig}`, n);
    }
  });

  console.log("Passed Deadline Notices count:", passedNoticeMap.size);

  const existingUploadKeys = new Set();
  const allUploadsForKeys = await ResultUpload.find({
    resultType: activeResultType,
    status: { $ne: "Deleted" },
    isDeleted: { $ne: true }
  }).lean();

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

  const allTeachers = await Teacher.find({}).lean();
  const allTeacherUsers = await User.find({ role: "teacher" }).lean();
  const allLmsCourses = await Course.find({}).populate("teacher", "name email department").lean();
  const allCourseImports = await CourseImport.find({}).lean();

  const findTeacherForCourse = (courseCode, courseTitle) => {
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

  // ONLY generate pending auto cards for Level-Terms that have a PASSED deadline!
  passedNoticeMap.forEach((notice, targetKey) => {
    const sessVal = notice.session || "2022-23";
    const normSess = normSessStr(sessVal);
    const ldig = extractDigit(notice.level) || "1";
    const tdig = extractDigit(notice.term) || "1";

    // 1. Check teacher assigned courses matching this level-term
    allTeachers.forEach((t) => {
      if (!Array.isArray(t.assignedCourses)) return;
      t.assignedCourses.forEach((ac) => {
        const ltParts = (ac.levelTerm || "").split(/\s*-\s*/);
        const acLdig = extractDigit(ac.level || ltParts[0]);
        const acTdig = extractDigit(ac.term || ltParts[1]);

        if (acLdig !== ldig || acTdig !== tdig) return;

        const ci = allCourseImports.find(c => {
          const ciCode = cleanCodeStr(c.courseCode);
          const ciTitle = String(c.courseTitle || "").trim().toLowerCase();
          const acCode = cleanCodeStr(ac.courseCode || ac.displayCode);
          const acName = String(ac.courseName || ac.courseTitle || "").trim().toLowerCase();
          return (acCode && ciCode === acCode) || (acName && (ciTitle === acName || ciTitle.includes(acName) || acName.includes(ciTitle)));
        });

        const codeVal = ac.courseCode || ac.displayCode || ci?.courseCode || "COURSE";
        const titleVal = ac.courseName || ac.courseTitle || ci?.courseTitle || codeVal;
        const cleanCode = cleanCodeStr(codeVal);

        const key = `${cleanCode}_${normSess}_${ldig}_${tdig}`;
        const shortKey = `${cleanCode}_${ldig}_${tdig}`;

        if (existingUploadKeys.has(key) || existingUploadKeys.has(shortKey) || seenAutoKeys.has(key)) return;

        seenAutoKeys.add(key);

        pendingAutoCards.push({
          _id: `pending_${cleanCode}_${normSess}_${ldig}_${tdig}_${activeResultType}`,
          isPendingAutoCard: true,
          isAutoCard: true,
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
          cutoffDeadline: notice.deadlineDate,
          results: [],
          logs: [],
        });
      });
    });

    // 2. Check CourseImport entries for this level-term
    allCourseImports.forEach((ci) => {
      const ciLdig = extractDigit(ci.level);
      const ciTdig = extractDigit(ci.term);

      if (ciLdig !== ldig || ciTdig !== tdig) return;

      const codeVal = ci.courseCode;
      const titleVal = ci.courseTitle;
      const cleanCode = cleanCodeStr(codeVal);

      const key = `${cleanCode}_${normSess}_${ldig}_${tdig}`;
      const shortKey = `${cleanCode}_${ldig}_${tdig}`;

      if (existingUploadKeys.has(key) || existingUploadKeys.has(shortKey) || seenAutoKeys.has(key)) return;

      seenAutoKeys.add(key);
      const teacherInfo = findTeacherForCourse(codeVal, titleVal);

      pendingAutoCards.push({
        _id: `pending_${cleanCode}_${normSess}_${ldig}_${tdig}_${activeResultType}`,
        isPendingAutoCard: true,
        isAutoCard: true,
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
        cutoffDeadline: notice.deadlineDate,
        results: [],
        logs: [],
      });
    });
  });

  console.log(`\nFiltered Pending Auto Cards Count (Level 1 Term 2 Passed Deadline Only): ${pendingAutoCards.length}`);
  pendingAutoCards.forEach(card => {
    console.log(`  - [${card.courseCode}] ${card.courseTitle} | Teacher: ${card.teacherName} | Session: ${card.session} | Level: ${card.level}, Term: ${card.term} | Deadline: ${card.cutoffDeadline}`);
  });

  await mongoose.disconnect();
}

testPassedDeadlinesLogic();
