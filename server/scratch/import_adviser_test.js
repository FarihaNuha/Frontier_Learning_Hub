const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const uri = "mongodb+srv://farihanuha356_db_user:nuha2202022@cluster01.uchfnx6.mongodb.net/?appName=Cluster01";

const Adviser = require("../models/Adviser");

async function run() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const sampleAdvisers = [
    {
      teacherId: "1",
      teacherName: "Aditya Rajbongshi",
      teacherEmail: "farihanuha356@gmail.com",
      department: "EDTE",
      program: "B.Sc. in Educational Technology and Engineering",
      session: "2022-23",
      assignedBatch: "5th"
    },
    {
      teacherId: "2",
      teacherName: "Rabbi Khan",
      teacherEmail: "rabbi@gmail.com",
      department: "EDTE",
      program: "B.Sc. in Educational Technology and Engineering",
      session: "2023-24",
      assignedBatch: "6th"
    },
    {
      teacherId: "3",
      teacherName: "Rubel Sheikh",
      teacherEmail: "rubel@gmail.com",
      department: "EDTE",
      program: "B.Sc. in Educational Technology and Engineering",
      session: "2020-21",
      assignedBatch: "3rd"
    }
  ];

  for (const a of sampleAdvisers) {
    const doc = await Adviser.findOneAndUpdate(
      { teacherEmail: a.teacherEmail, session: a.session, assignedBatch: a.assignedBatch },
      a,
      { upsert: true, new: true }
    );
    console.log("Uploaded adviser:", doc.teacherName, doc.teacherEmail, doc.session);
  }

  const all = await Adviser.find();
  console.log("Total advisers in DB:", all.length);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
