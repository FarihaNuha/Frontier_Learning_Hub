const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function resetStudent() {
  console.log('Connecting to Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));

  const email = 'jahida0001@std.uftb.ac.bd';
  const studentId = '2202006';
  
  // 1. Delete registered User document
  const userRes = await User.deleteMany({
    $or: [
      { email: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
      { studentId: studentId }
    ]
  });
  console.log('Deleted user records count:', userRes.deletedCount);

  // 2. Reset Student directory accountStatus to inactive
  const studentRes = await Student.updateMany(
    {
      $or: [
        { universityEmail: { $regex: new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
        { studentId: studentId }
      ]
    },
    { $set: { accountStatus: 'inactive' } }
  );
  console.log('Updated student directory status:', studentRes);

  await mongoose.disconnect();
  console.log('Reset SUCCESSFUL for Jinar (jahida0001@std.uftb.ac.bd / ID 2202006)!');
}

resetStudent().catch(console.error);
