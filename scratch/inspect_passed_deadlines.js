const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function inspectPassedDeadlines() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Notice = mongoose.model("Notice", new mongoose.Schema({}, { strict: false }));
  const ResultUpload = mongoose.model("ResultUpload", new mongoose.Schema({}, { strict: false }));

  console.log("\n--- All Notices with deadlineDate ---");
  const notices = await Notice.find({ deadlineDate: { $ne: null } }).lean();
  console.log(`Found ${notices.length} notices with deadlineDate:`);
  notices.forEach(n => {
    const isPassed = new Date() > new Date(n.deadlineDate);
    console.log(`  - Title: ${n.title} | Deadline: ${n.deadlineDate} | Passed? ${isPassed} | Session: ${n.session} | Level: ${n.level} | Term: ${n.term} | Type: ${n.resultDeadlineType}`);
  });

  console.log("\n--- All Active ResultUploads ---");
  const uploads = await ResultUpload.find({ isDeleted: { $ne: true } }).lean();
  console.log(`Found ${uploads.length} uploads:`);
  uploads.forEach(u => {
    console.log(`  - [${u.resultType}] ${u.courseCode} | Session: ${u.session} | ${u.level} ${u.term} | Status: ${u.status}`);
  });

  await mongoose.disconnect();
}

inspectPassedDeadlines();
