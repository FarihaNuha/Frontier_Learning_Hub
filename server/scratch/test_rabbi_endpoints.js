const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Notice = require("../models/Notice");
const ResultUpload = require("../models/ResultUpload");
const Result = require("../models/Result");

async function testRabbi() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  const rabbi = await User.findOne({ email: "farihatasnim0903@gmail.com" });
  console.log("Rabbi User:", rabbi?.name, rabbi?.email, rabbi?._id);

  if (!rabbi) {
    console.log("Rabbi user not found!");
    await mongoose.disconnect();
    return;
  }

  // Test getTeacherResults logic
  try {
    const teacherId = rabbi._id;
    const teacherEmail = rabbi.email.toLowerCase().trim();

    const query = {
      $or: [
        { teacher: teacherId },
        { teacherEmail: teacherEmail }
      ],
      resultType: "Midterm"
    };

    console.log("Running ResultUpload query:", query);
    const uploads = await ResultUpload.find(query).sort({ uploadedAt: -1 }).lean();
    console.log("Uploads found:", uploads.length);

    const uploadsWithResults = await Promise.all(
      uploads.map(async (up) => {
        const results = await Result.find({ uploadId: up._id }).sort({ studentId: 1 }).lean();
        return { ...up, results };
      })
    );
    console.log("Uploads with results length:", uploadsWithResults.length);
  } catch (err) {
    console.error("ERROR in getTeacherResults logic:", err);
  }

  // Test getResultDeadlines logic
  try {
    const midtermDeadline = await Notice.findOne({
      resultDeadlineType: "Midterm",
      targetAudience: { $in: ["Teachers", "All"] },
    }).sort({ createdAt: -1 }).lean();

    const finalDeadline = await Notice.findOne({
      resultDeadlineType: "Final",
      targetAudience: { $in: ["Teachers", "All"] },
    }).sort({ createdAt: -1 }).lean();

    const allDeadlines = await Notice.find({
      deadlineDate: { $ne: null },
      targetAudience: { $in: ["Teachers", "All"] },
    }).sort({ createdAt: -1 }).lean();

    console.log("Deadlines logic OK. count:", allDeadlines.length);
  } catch (err) {
    console.error("ERROR in getResultDeadlines logic:", err);
  }

  await mongoose.disconnect();
}

testRabbi().catch(console.error);
