const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const CourseImport = require("../models/CourseImport");

async function checkCourseImport() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  const ci = await CourseImport.findOne({ courseCode: "ET 217" }).lean();
  console.log("CourseImport ET 217:", ci);

  const allCI = await CourseImport.find({}, "courseCode courseTitle level term department").lean();
  console.log("Total CourseImport records:", allCI.length);
  console.log("Sample CourseImports:", allCI.slice(0, 5));

  await mongoose.disconnect();
}

checkCourseImport().catch(console.error);
