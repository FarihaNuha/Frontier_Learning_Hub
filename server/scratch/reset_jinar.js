const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/uftb_moodle';

async function resetStudent() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));

  const email = 'jahida0001@std.uftb.ac.bd';
  
  const userRes = await User.deleteMany({ email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });
  console.log('Deleted user records:', userRes.deletedCount);

  const studentRes = await Student.updateOne(
    { universityEmail: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
    { $set: { accountStatus: 'inactive' } }
  );
  console.log('Updated student directory status:', studentRes);

  await mongoose.disconnect();
  console.log('Reset complete for Jinar!');
}

resetStudent().catch(console.error);
