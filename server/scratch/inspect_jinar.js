const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/uftb_moodle';

async function inspect() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));

  const users = await User.find({}).lean();
  console.log('=== ALL USERS ===');
  users.forEach(u => console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role} | StudentID: ${u.studentId}`));

  const students = await Student.find({}).lean();
  console.log('=== ALL STUDENTS ===');
  students.forEach(s => console.log(`Student: ${s.name} | Email: ${s.universityEmail} | Status: ${s.accountStatus} | StudentID: ${s.studentId}`));

  await mongoose.disconnect();
}

inspect().catch(console.error);
