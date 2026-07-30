const mongoose = require("mongoose");

async function run() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  const Student = mongoose.model(
    "Student",
    new mongoose.Schema({
      studentId: String,
      currentLevel: Number,
      currentTerm: Number,
    })
  );

  const updates = [
    { studentId: "2202001", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202002", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202003", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202006", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202022", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202030", currentLevel: 3, currentTerm: 2 },
    { studentId: "2302001", currentLevel: 2, currentTerm: 2 },
    { studentId: "2302002", currentLevel: 2, currentTerm: 2 },
    { studentId: "2301003", currentLevel: 2, currentTerm: 2 },
    { studentId: "2401001", currentLevel: 2, currentTerm: 1 },
    { studentId: "2403002", currentLevel: 2, currentTerm: 1 },
    { studentId: "2404003", currentLevel: 2, currentTerm: 1 },
  ];

  for (const u of updates) {
    const res = await Student.updateOne(
      { studentId: u.studentId },
      { currentLevel: u.currentLevel, currentTerm: u.currentTerm }
    );
    console.log(`Updated student ${u.studentId}: Level ${u.currentLevel} Term ${u.currentTerm}`, res.modifiedCount);
  }

  await mongoose.disconnect();
  console.log("Done!");
}

run();
