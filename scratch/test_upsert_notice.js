const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function testUpsertNotice() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const { setDeadlineAndNotice } = require(path.join(__dirname, "../server/controllers/resultController"));
  const Notice = mongoose.model("Notice");

  console.log("\n=======================================================");
  console.log("STEP 1: Call setDeadlineAndNotice for Level 1 Term 2 (First Date)");
  console.log("=======================================================");

  const req1 = {
    user: { _id: new mongoose.Types.ObjectId(), name: "Admin" },
    body: {
      noticeTitle: "Final Result Submission Cutoff — 2022-23 Level 1 Term-2",
      noticeContent: "Cutoff notice content",
      targetAudience: "Teachers",
      deadlineDate: "2026-09-16T16:30",
      resultType: "Final",
      session: "2022-23",
      level: "Level-1",
      term: "Term-2",
    }
  };

  const res1 = {
    json: (d) => console.log("Response 1:", d.message),
    status: () => res1
  };

  await setDeadlineAndNotice(req1, res1);

  const noticesAfterFirst = await Notice.find({ deadlineDate: { $ne: null } }).lean();
  console.log(`Deadline notices count in DB: ${noticesAfterFirst.length}`);
  noticesAfterFirst.forEach(n => console.log(`  - [ID: ${n._id}] ${n.title} | Deadline: ${n.deadlineDate}`));

  console.log("\n=======================================================");
  console.log("STEP 2: Call setDeadlineAndNotice AGAIN for same Level 1 Term 2 (Updated Date)");
  console.log("=======================================================");

  const req2 = {
    user: { _id: new mongoose.Types.ObjectId(), name: "Admin" },
    body: {
      noticeTitle: "Final Result Submission Cutoff — 2022-23 Level 1 Term-2",
      noticeContent: "Updated cutoff notice content",
      targetAudience: "Teachers",
      deadlineDate: "2026-09-18T17:28", // NEW UPDATED DATE!
      resultType: "Final",
      session: "2022-23",
      level: "Level-1",
      term: "Term-2",
    }
  };

  const res2 = {
    json: (d) => console.log("Response 2:", d.message),
    status: () => res2
  };

  await setDeadlineAndNotice(req2, res2);

  const noticesAfterSecond = await Notice.find({ deadlineDate: { $ne: null } }).lean();
  console.log(`Deadline notices count in DB AFTER UPDATE: ${noticesAfterSecond.length}`);
  noticesAfterSecond.forEach(n => console.log(`  - [ID: ${n._id}] ${n.title} | Updated Deadline: ${n.deadlineDate}`));

  if (noticesAfterSecond.length === 1) {
    console.log("\nSUCCESS: No duplicate record created! Existing record updated in-place!");
  } else {
    console.log("\nFAILURE: Duplicate record created!");
  }

  await mongoose.disconnect();
}

testUpsertNotice().catch(err => {
  console.error("Error in test:", err);
  mongoose.disconnect();
});
