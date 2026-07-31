const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");

async function resetDb() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  // Free up teacherId "1" from lata first
  await Teacher.findOneAndUpdate({ email: "lata@gmail.com" }, { teacherId: "3" });
  await Teacher.findOneAndUpdate({ email: "farihanuha356@gmail.com" }, { teacherId: "1" });

  const all = await Teacher.find().lean();
  console.log("Clean Teachers in DB:", all.map(t => ({ id: t.teacherId, name: t.name, email: t.email })));

  await mongoose.disconnect();
}

resetDb().catch(console.error);
