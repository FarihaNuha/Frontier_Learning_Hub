const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const ResultUpload = require("./models/ResultUpload");
const User = require("./models/User");
const Course = require("./models/Course");
const CourseImport = require("./models/CourseImport");

async function test() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  console.log("Connected to DB");

  const uploads = await ResultUpload.find({ resultType: "Final" }).lean();
  console.log("Existing ResultUploads count:", uploads.length);

  const existingUploadKeys = new Set();
  uploads.forEach((u) => {
    const code = (u.courseCode || "").trim().toUpperCase();
    const sess = (u.session || "").trim();
    const ldig = (String(u.level || "").match(/\d+/) || [])[0] || "1";
    const tdig = (String(u.term || "").match(/\d+/) || [])[0] || "1";
    if (code) {
      existingUploadKeys.add(`${code}_${sess}_${ldig}_${tdig}`);
    }
  });

  console.log("existingUploadKeys:", Array.from(existingUploadKeys));

  const allTeachers = await User.find({ role: "teacher" }).lean();
  const allLmsCourses = await Course.find({}).populate("teacher", "name email department").lean();
  const allCourseImports = await CourseImport.find({}).lean();

  console.log("Teachers count:", allTeachers.length);
  console.log("LMS Courses count:", allLmsCourses.length);
  console.log("CourseImport count:", allCourseImports.length);

  const pendingAutoCards = [];

  allCourseImports.forEach((ci) => {
    const code = (ci.courseCode || "").trim().toUpperCase();
    if (!code) return;
    const sess = "2022-23";
    const ldig = (String(ci.level || "").match(/\d+/) || [])[0] || "3";
    const tdig = (String(ci.term || "").match(/\d+/) || [])[0] || "2";
    const key = `${code}_${sess}_${ldig}_${tdig}`;

    console.log(`Checking CourseImport: ${code}, key: ${key}, exists: ${existingUploadKeys.has(key)}`);

    if (!existingUploadKeys.has(key)) {
      existingUploadKeys.add(key);

      const matchedTeacher = allTeachers.find((t) =>
        t.department === ci.department ||
        (t.assignedCourses || []).some((ac) => (ac.courseCode || ac.courseName || "").toUpperCase().includes(code))
      ) || allTeachers[0];

      pendingAutoCards.push({
        courseCode: ci.courseCode,
        courseTitle: ci.courseTitle,
        department: ci.department || "EDTE",
        session: sess,
        level: ci.level ? (ci.level.startsWith("Level") ? ci.level : `Level-${ci.level}`) : `Level-${ldig}`,
        term: ci.term ? (ci.term.startsWith("Term") ? ci.term : `Term-${ci.term}`) : `Term-${tdig}`,
        status: "Pending",
        teacherEmail: matchedTeacher?.email || "farihatasnim0903@gmail.com",
        teacherName: matchedTeacher?.name || "Rabbi Khan",
      });
    }
  });

  console.log("Generated pendingAutoCards:", pendingAutoCards.length, pendingAutoCards);
  process.exit(0);
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
