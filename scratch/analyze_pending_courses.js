const path = require("path");
const mongoose = require(path.join(__dirname, "../server/node_modules/mongoose"));

async function analyze() {
  await mongoose.connect("mongodb://127.0.0.1:27017/uftb_moodle");

  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
  const users = await User.find({ email: /rubel/i }).lean();
  console.log("Rubel users in DB:", users);

  await mongoose.disconnect();
}

analyze();
