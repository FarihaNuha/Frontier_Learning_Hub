const mongoose = require("./node_modules/mongoose");
require("./node_modules/dotenv").config({ path: "./.env" });

async function inspectStudent30() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  console.log("Connected to DB");

  const Result = mongoose.model("Result", new mongoose.Schema({}, { strict: false }));
  const CGPARecord = mongoose.model("CGPARecord", new mongoose.Schema({}, { strict: false }));

  const results = await Result.find({ studentId: "2202030" }).lean();
  console.log("--- Results for 2202030 (" + results.length + " rows) ---");
  results.forEach(r => {
    console.log({
      _id: r._id,
      courseCode: r.courseCode,
      courseTitle: r.courseTitle,
      resultType: r.resultType,
      session: r.session,
      level: r.level,
      term: r.term,
      creditHours: r.creditHours,
      totalMarks: r.totalMarks,
      midPartA: r.midPartA,
      midPartB: r.midPartB,
      finalPartA: r.finalPartA,
      finalPartB: r.finalPartB,
      attendance: r.attendance,
      continuousAssessment: r.continuousAssessment,
      letterGrade: r.letterGrade,
      gradePoint: r.gradePoint,
      semesterGPA: r.semesterGPA,
      status: r.status
    });
  });

  const cgpaRecords = await CGPARecord.find({ studentId: "2202030" }).lean();
  console.log("--- CGPARecords for 2202030 ---");
  console.log(cgpaRecords);

  await mongoose.disconnect();
}

inspectStudent30().catch(console.error);
