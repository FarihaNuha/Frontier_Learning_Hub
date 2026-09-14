const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
    await mongoose.connect(mongoUri);
    console.log("Connected to database.");

    const Submission = require("../models/Submission");
    const subs = await Submission.find({});
    
    for (const s of subs) {
      console.log(`\nSubmission ID: ${s._id}, Student: ${s.studentId}`);
      for (const f of s.files) {
        console.log(`  fileURL: "${f.fileURL}", originalName: "${f.originalName}"`);
        
        // Let's resolve the path using assignmentController's resolveServerFilePath logic
        const rel = f.fileURL.replace(/^\/?uploads\//, "");
        const pathsToTry = [
          path.join(__dirname, "../../uploads", rel),
          path.join(process.cwd(), "uploads", rel),
          path.join(__dirname, "../uploads", rel),
          path.join(__dirname, "../", f.fileURL),
          path.join(__dirname, "../../", f.fileURL)
        ];
        
        for (const p of pathsToTry) {
          const exists = fs.existsSync(p);
          console.log(`    Trying path: "${p}" -> Exists: ${exists}`);
        }
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
