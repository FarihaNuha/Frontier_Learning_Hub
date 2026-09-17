const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function testEndpoint() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const { getAdminResults } = require(path.join(__dirname, "../server/controllers/resultController"));

  const req = {
    query: {
      resultType: "Final",
      status: "Pending"
    }
  };

  const res = {
    json: function(data) {
      console.log("\n--- Admin Get Results API Response ---");
      console.log(`Total Uploads returned for Pending filter: ${data.uploads ? data.uploads.length : 0}`);
      
      const cse115 = data.uploads?.find(u => u.courseCode === "CSE 115");
      console.log("CSE 115 in Pending uploads:", cse115);

      const level1Term2Uploads = data.uploads?.filter(u => String(u.level).includes("1") && String(u.term).includes("2"));
      console.log(`Level 1 Term 2 Pending uploads count: ${level1Term2Uploads?.length}`);
      level1Term2Uploads?.forEach(u => console.log(`  - [${u.courseCode}] ${u.courseTitle} | Teacher: ${u.teacherName} | Session: ${u.session}`));
    },
    status: function(code) {
      console.log("Status code:", code);
      return this;
    }
  };

  await getAdminResults(req, res);

  await mongoose.disconnect();
}

testEndpoint().catch(err => {
  console.error("Error testing endpoint:", err);
  mongoose.disconnect();
});
