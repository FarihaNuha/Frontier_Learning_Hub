const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("./node_modules/mongoose");
require("./node_modules/dotenv").config({ path: "./.env" });

async function checkFailedCourses() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas!");

  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model("Student", new mongoose.Schema({}, { strict: false }));
  const Result = mongoose.model("Result", new mongoose.Schema({}, { strict: false }));
  const RetakeRequest = mongoose.model("RetakeRequest", new mongoose.Schema({}, { strict: false }));

  const mariaUser = await User.findOne({ email: "maria@gmail.com" }).lean();
  console.log("Maria User:", mariaUser);

  const mariaProfile = await Student.findOne({ universityEmail: "maria@gmail.com" }).lean();
  console.log("Maria Student Profile:", mariaProfile);

  const studentIdStr = mariaProfile?.studentId || mariaUser?.studentId || "2202030";
  console.log("studentIdStr:", studentIdStr);

  const publishedResults = await Result.find({
    status: "Published",
    $or: [
      ...(mariaUser ? [{ student: mariaUser._id }] : []),
      ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      { studentId: "2202030" }
    ],
  }).lean();

  console.log("Published Results count:", publishedResults.length);
  publishedResults.forEach(r => {
    console.log(`Course: ${r.courseCode}, GradePoint: ${r.gradePoint} (${typeof r.gradePoint}), Letter: "${r.letterGrade}", ResultType: "${r.resultType}", Status: "${r.status}", StudentId: "${r.studentId}", StudentObj: "${r.student}"`);
  });

  const failedMap = new Map();
  publishedResults.forEach((r) => {
    const code = String(r.courseCode || "").toUpperCase().trim();
    const gp = Number(r.gradePoint);
    const lg = String(r.letterGrade || "").toUpperCase().trim();
    if (lg === "F" || gp === 0) {
      failedMap.set(code, r);
    }
  });
  console.log("Failed Map before pass/retake check:", Array.from(failedMap.keys()));

  publishedResults.forEach((r) => {
    const code = String(r.courseCode || "").toUpperCase().trim();
    const gp = Number(r.gradePoint);
    const lg = String(r.letterGrade || "").toUpperCase().trim();
    if (lg !== "F" && gp > 0) {
      failedMap.delete(code);
    }
  });
  console.log("Failed Map after pass check:", Array.from(failedMap.keys()));

  await mongoose.disconnect();
}

checkFailedCourses().catch(console.error);
