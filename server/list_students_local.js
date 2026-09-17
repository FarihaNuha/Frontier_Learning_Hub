const mongoose = require("./node_modules/mongoose");

async function listStudentsLocal() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");
    console.log("Connected to Local MongoDB!");
  
    const Result = mongoose.model("Result", new mongoose.Schema({}, { strict: false }));
    const CGPARecord = mongoose.model("CGPARecord", new mongoose.Schema({}, { strict: false }));

    const cgpaRecs = await CGPARecord.find({}).lean();
    console.log("--- All CGPARecords (" + cgpaRecs.length + ") ---");
    cgpaRecs.forEach(c => {
      console.log(`StudentId: "${c.studentId}", Name: "${c.studentName}", GPA: ${c.semesterGPA}, CGPA: ${c.cumulativeCGPA}, Level: "${c.level}", Term: "${c.term}"`);
    });

    const resStudentIds = await Result.distinct("studentId");
    console.log("Distinct Student IDs in Result collection:", resStudentIds);

    const r30 = await Result.find({ studentId: "2202030" }).lean();
    console.log("--- Results for 2202030 ---");
    r30.forEach(r => console.log(r.courseCode, r.totalMarks, r.gradePoint, r.letterGrade, r.resultType, r.session, r.level, r.term));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Local DB connection error:", err.message);
  }
}

listStudentsLocal();
