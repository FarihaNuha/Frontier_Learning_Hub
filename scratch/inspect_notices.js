const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function inspectNotices() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const Notice = mongoose.model("Notice", new mongoose.Schema({}, { strict: false }));
  const notices = await Notice.find({}).lean();

  console.log("All Notices count:", notices.length);
  notices.forEach(n => console.log(n));

  await mongoose.disconnect();
}

inspectNotices();
