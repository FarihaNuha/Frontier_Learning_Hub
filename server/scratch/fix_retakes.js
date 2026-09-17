const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const RetakeRequest = require("../models/RetakeRequest");
const Adviser = require("../models/Adviser");

async function fixRetakes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
    const retakes = await RetakeRequest.find({}).lean();
    console.log("Existing Retakes in DB:", retakes);

    // Update retakes with adviserEmail if empty
    for (const r of retakes) {
      if (!r.adviserEmail) {
        const adviser = await Adviser.findOne({ department: r.department || "EDTE" }).lean();
        const emailToSet = adviser?.teacherEmail || adviser?.email || "farihanuha356@gmail.com";
        await RetakeRequest.updateOne({ _id: r._id }, { $set: { adviserEmail: emailToSet } });
        console.log(`Updated Retake ${r._id} with adviserEmail ${emailToSet}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
fixRetakes();
