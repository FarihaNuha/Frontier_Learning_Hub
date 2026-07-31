const { calculateRegistrationFee } = require("../controllers/registrationPaymentController");

const sampleCourses = [
  { courseCode: "ET 111", courseTitle: "Theory Course", creditHours: 3, courseType: "Theory" },
  { courseCode: "ET 112", courseTitle: "Sessional 1.5", creditHours: 1.5, courseType: "Sessional" },
  { courseCode: "ET 114", courseTitle: "Lab 1.5 Course", creditHours: 1.5, courseType: "Lab" },
  { courseCode: "ET 116", courseTitle: "Sessional 1", creditHours: 1, courseType: "Sessional" },
];

const result = calculateRegistrationFee(sampleCourses);
console.log("Calculated Fees:", JSON.stringify(result.coursesWithFee, null, 2));
console.log("Theory Count:", result.theoryCount, "Lab Count:", result.labCount);
console.log("Course Subtotal:", result.courseSubtotal, "Total Amount:", result.totalAmount);
