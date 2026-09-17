const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Use Google/Cloudflare DNS for SRV resolution

const mongoose = require("./node_modules/mongoose");
require("./node_modules/dotenv").config({ path: "./.env" });

async function inspectAtlasDB() {
  try {
    console.log("Connecting to Atlas...");
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("Connected to MongoDB Atlas!");

    const Result = mongoose.model("Result", new mongoose.Schema({}, { strict: false }));
    const CGPARecord = mongoose.model("CGPARecord", new mongoose.Schema({}, { strict: false }));

    const cgpaRecs = await CGPARecord.find({}).lean();
    console.log("--- All CGPARecords (" + cgpaRecs.length + ") ---");
    cgpaRecs.forEach(c => {
      console.log(`StudentId: "${c.studentId}", Name: "${c.studentName}", GPA: ${c.semesterGPA}, CGPA: ${c.cumulativeCGPA}, Level: "${c.level}", Term: "${c.term}"`);
    });

    const r30 = await Result.find({ studentId: "2202030" }).lean();
    console.log("--- Results for 2202030 (" + r30.length + " rows) ---");
    r30.forEach(r => {
      console.log({
        code: r.courseCode,
        title: r.courseTitle,
        type: r.courseType,
        credits: r.creditHours,
        midA: r.midPartA,
        midB: r.midPartB,
        finalA: r.finalPartA,
        finalB: r.finalPartB,
        att: r.attendance,
        cont: r.continuousAssessment,
        total: r.totalMarks,
        gradePoint: r.gradePoint,
        letterGrade: r.letterGrade,
        semesterGPA: r.semesterGPA,
        resultType: r.resultType
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error connecting to Atlas:", err);
  }
}

inspectAtlasDB();
