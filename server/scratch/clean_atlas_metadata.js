const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Assessment = require("../models/Assessment");

async function cleanAtlas() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  const allAssessments = await Assessment.find({});
  console.log(`Found ${allAssessments.length} assessment records in Atlas.`);

  let updatedCount = 0;
  for (const doc of allAssessments) {
    let changed = false;

    // Clean session
    const sessMatch = (doc.session || "").match(/\d{4}[-\s]\d{2,4}/);
    if (sessMatch && doc.session !== sessMatch[0]) {
      doc.session = sessMatch[0];
      changed = true;
    }

    // Clean level
    const lvlMatch = (doc.level || "").match(/level\s*(\d+)/i) || (doc.level || "").match(/(\d+)/);
    if (lvlMatch) {
      const cleanLvl = lvlMatch[1] || lvlMatch[0];
      if (doc.level !== cleanLvl) {
        doc.level = cleanLvl;
        changed = true;
      }
    }

    // Clean term
    const trmMatch = (doc.term || "").match(/term\s*(\d+)/i) || (doc.term || "").match(/(\d+)/);
    if (trmMatch) {
      const cleanTrm = trmMatch[1] || trmMatch[0];
      if (doc.term !== cleanTrm) {
        doc.term = cleanTrm;
        changed = true;
      }
    }

    // Clean department
    const deptMatch = (doc.department || "").match(/EDTE|IRE|CySE|DSE|SWE/i);
    if (deptMatch && doc.department !== deptMatch[0].toUpperCase()) {
      doc.department = deptMatch[0].toUpperCase();
      changed = true;
    }

    if (changed) {
      await doc.save();
      updatedCount++;
    }
  }

  console.log(`✅ Cleaned ${updatedCount} assessment records in MongoDB Atlas.`);
  await mongoose.disconnect();
}

cleanAtlas().catch(console.error);
