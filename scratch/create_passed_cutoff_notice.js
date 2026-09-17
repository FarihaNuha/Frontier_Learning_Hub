const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function createCutoffNotice() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Notice = mongoose.model("Notice", new mongoose.Schema({}, { strict: false }));

  await Notice.deleteMany({ title: /Result Submission Cutoff/i });

  const notice1 = await Notice.create({
    title: "Final Result Submission Cutoff — 2022-23 Level 1 Term-2",
    content: "All course teachers assigned to Level 1 Term-2 (Session: 2022-23) must upload and submit Final result marksheets by Sep 16, 2026, 4:30 PM.",
    targetAudience: "Teachers",
    resultDeadlineType: "Final",
    session: "2022-23",
    level: "Level 1",
    term: "Term 2",
    deadlineDate: new Date("2026-09-16T16:30:00.000Z"),
    category: "Academic",
    status: "Published",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Created passed cutoff notice for Level 1 Term 2:", notice1);

  await mongoose.disconnect();
}

createCutoffNotice();
