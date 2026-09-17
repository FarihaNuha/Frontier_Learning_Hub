const mongoose = require("./node_modules/mongoose");
require("./node_modules/dotenv").config({ path: "./.env" });

async function listStudents() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas!");
  
  const Result = mongoose.model("Result", new mongoose.Schema({}, { strict: false }));
  const CGPARecord = mongoose.model("CGPARecord", new mongoose.Schema({}, { strict: false }));

  const cgpaRecs = await CGPARecord.find({}).lean();
  console.log("--- All CGPARecords (" + cgpaRecs.length + ") ---");
  cgpaRecs.forEach(c => {
    console.log(`StudentId: "${c.studentId}", Name: "${c.studentName}", GPA: ${c.semesterGPA}, CGPA: ${c.cumulativeCGPA}, Level: "${c.level}", Term: "${c.term}"`);
  });

  const resStudentIds = await Result.distinct("studentId");
  console.log("Distinct Student IDs in Result collection:", resStudentIds);

  await mongoose.disconnect();
}

listStudents().catch(console.error);
