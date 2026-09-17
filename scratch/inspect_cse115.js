const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function inspectCse115() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Teacher = mongoose.model("Teacher", new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const Course = mongoose.model("Course", new mongoose.Schema({}, { strict: false }));
  const CourseImport = mongoose.model("CourseImport", new mongoose.Schema({}, { strict: false }));

  console.log("\n--- CSE 115 in CourseImport ---");
  const ciList = await CourseImport.find({ courseCode: /CSE 115/i }).lean();
  console.log(ciList);

  console.log("\n--- CSE 115 in Course ---");
  const cList = await Course.find({ displayCode: /CSE 115/i }).lean();
  console.log(cList);

  console.log("\n--- Teachers assigned CSE 115 ---");
  const teachers = await Teacher.find({
    $or: [
      { "assignedCourses.courseCode": /CSE 115/i },
      { "assignedCourses.courseName": /Discrete Mathematics/i }
    ]
  }).lean();
  console.log("Teachers matching:", teachers.map(t => `${t.name} (${t.email})`));

  const users = await User.find({
    $or: [
      { "assignedCourses.courseCode": /CSE 115/i },
      { "assignedCourses.courseName": /Discrete Mathematics/i }
    ]
  }).lean();
  console.log("Users matching:", users.map(u => `${u.name} (${u.email})`));

  await mongoose.disconnect();
}

inspectCse115();
