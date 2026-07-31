const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Assessment = require("../models/Assessment");

async function sanitizeAtlas() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const allAssessments = await Assessment.find({});
  console.log(`Found ${allAssessments.length} assessment records in Atlas.`);

  let updatedCount = 0;
  for (const doc of allAssessments) {
    if (doc.courseCode && doc.courseCode.toLowerCase().includes("course title")) {
      const cleanCode = doc.courseCode.split(/course title|course type|credit|level|term|dept/i)[0].trim();
      console.log(`Updating doc ${doc._id}: "${doc.courseCode}" -> "${cleanCode}"`);
      doc.courseCode = cleanCode;
      await doc.save();
      updatedCount++;
    }
  }

  console.log(`✅ Cleaned ${updatedCount} assessment records in MongoDB Atlas.`);
  await mongoose.disconnect();
}

sanitizeAtlas().catch(console.error);
