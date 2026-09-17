const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function testSubmissionWorkflow() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const { getAdminResults } = require(path.join(__dirname, "../server/controllers/resultController"));
  const ResultUpload = mongoose.model("ResultUpload");
  const User = mongoose.model("User");

  console.log("\n=======================================================");
  console.log("STEP 1: Check Pending tab BEFORE teacher submission");
  console.log("=======================================================");

  let pendingResponse = null;
  const req1 = { query: { resultType: "Final", status: "Pending" } };
  const res1 = {
    json: (data) => { pendingResponse = data; },
    status: () => res1
  };

  await getAdminResults(req1, res1);

  console.log(`Pending tab count BEFORE upload: ${pendingResponse.uploads?.length}`);
  const cse115Before = pendingResponse.uploads?.find(u => u.courseCode === "CSE 115");
  console.log(`CSE 115 in Pending tab BEFORE upload?`, cse115Before ? `YES (Status: ${cse115Before.status})` : "NO");

  console.log("\n=======================================================");
  console.log("STEP 2: Simulate Teacher uploading CSE 115 marksheet");
  console.log("=======================================================");

  const dummyUser = await User.findOne({ role: "teacher" }).lean();

  // Create or update a submitted ResultUpload for CSE 115
  await ResultUpload.deleteMany({ courseCode: "CSE 115" });
  const newUpload = await ResultUpload.create({
    teacher: dummyUser?._id || new mongoose.Types.ObjectId(),
    teacherEmail: "farhana@gmail.com",
    resultType: "Final",
    department: "EDTE",
    courseCode: "CSE 115",
    courseTitle: "Discrete Mathematics and Graph Theory",
    session: "2022-23",
    level: "Level-1",
    term: "Term-2",
    totalRecords: 30,
    status: "Submitted", // Teacher submitted!
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("Created submitted upload for CSE 115:", newUpload._id, "Status: Submitted");

  console.log("\n=======================================================");
  console.log("STEP 3: Check Pending tab AFTER teacher submission");
  console.log("=======================================================");

  let pendingAfterResponse = null;
  const req2 = { query: { resultType: "Final", status: "Pending" } };
  const res2 = {
    json: (data) => { pendingAfterResponse = data; },
    status: () => res2
  };

  await getAdminResults(req2, res2);

  console.log(`Pending tab count AFTER upload: ${pendingAfterResponse.uploads?.length}`);
  const cse115AfterInPending = pendingAfterResponse.uploads?.find(u => u.courseCode === "CSE 115");
  console.log(`CSE 115 STILL in Pending tab?`, cse115AfterInPending ? "YES (BUG!)" : "NO (REMOVED SUCCESSFULLY!)");

  console.log("\n=======================================================");
  console.log("STEP 4: Check Submitted tab AFTER teacher submission");
  console.log("=======================================================");

  let submittedResponse = null;
  const req3 = { query: { resultType: "Final", status: "Submitted" } };
  const res3 = {
    json: (data) => { submittedResponse = data; },
    status: () => res3
  };

  await getAdminResults(req3, res3);

  const cse115InSubmitted = submittedResponse.uploads?.find(u => u.courseCode === "CSE 115");
  console.log(`CSE 115 in Submitted tab?`, cse115InSubmitted ? `YES (Status: ${cse115InSubmitted.status})` : "NO");

  // Clean up mock upload after test
  await ResultUpload.deleteMany({ courseCode: "CSE 115" });
  console.log("\nTest complete! Mock CSE 115 upload cleaned up.");

  await mongoose.disconnect();
}

testSubmissionWorkflow().catch(err => {
  console.error("Error in test:", err);
  mongoose.disconnect();
});
