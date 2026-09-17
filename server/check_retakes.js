const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("./node_modules/mongoose");
require("./node_modules/dotenv").config({ path: "./.env" });

async function checkRetakeRequests() {
  await mongoose.connect(process.env.MONGODB_URI);

  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model("Student", new mongoose.Schema({}, { strict: false }));
  const RetakeRequest = mongoose.model("RetakeRequest", new mongoose.Schema({}, { strict: false }));

  const mariaUser = await User.findOne({ email: "maria@gmail.com" }).lean();
  const mariaProfile = await Student.findOne({ universityEmail: "maria@gmail.com" }).lean();
  const studentIdStr = mariaProfile?.studentId || mariaUser?.studentId || "2202030";

  console.log("Maria User ID:", mariaUser._id);
  console.log("Maria studentIdStr:", studentIdStr);

  const retakes = await RetakeRequest.find({
    $or: [
      { student: mariaUser._id },
      { studentId: studentIdStr },
      { studentId: "2202030" }
    ]
  }).lean();

  console.log("Retake Requests found for Maria:", retakes);

  await mongoose.disconnect();
}

checkRetakeRequests().catch(console.error);
