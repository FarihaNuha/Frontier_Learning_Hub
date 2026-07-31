const mongoose = require("mongoose");
require("dotenv").config();

const { processOnlinePayment, initiateOrGetPaymentRecord } = require("../controllers/registrationPaymentController");
const User = require("../models/User");
const RegistrationPayment = require("../models/RegistrationPayment");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  const mitaUser = await User.findOne({ role: "student" }).lean();
  console.log("Testing processOnlinePayment with user:", mitaUser?.email);

  const reqInit = {
    user: { id: mitaUser._id, _id: mitaUser._id, email: mitaUser.email, role: "student" },
    body: { selectedCourses: [] }
  };

  let initResult = null;
  const resInit = {
    json: (d) => { initResult = d; console.log("INIT SUCCESS:", d?.payment?.paymentId); },
    status: (code) => ({ json: (err) => console.error("INIT ERROR:", code, err) })
  };

  await initiateOrGetPaymentRecord(reqInit, resInit);

  if (initResult && initResult.payment) {
    const paymentId = initResult.payment.paymentId || initResult.payment._id;

    const reqProcess = {
      user: { id: mitaUser._id, _id: mitaUser._id, email: mitaUser.email, role: "student" },
      body: { paymentId, status: "SUCCESS" }
    };

    const resProcess = {
      json: (d) => console.log("PROCESS SUCCESS:", d),
      status: (code) => ({ json: (err) => console.error("PROCESS ERROR STATUS:", code, err) })
    };

    await processOnlinePayment(reqProcess, resProcess);
  }

  process.exit(0);
}

run().catch(err => { console.error("FATAL ERR:", err); process.exit(1); });
