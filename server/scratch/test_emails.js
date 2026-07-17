require("dotenv").config({ path: "../.env" });
const { sendEmail, emailTemplates } = require("../services/emailService");

async function test() {
  console.log("Starting email test...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);

  try {
    console.log("1. Testing newAssignment template...");
    const assignmentEmail = emailTemplates.newAssignment(
      "Test Student",
      "Assignment 01",
      "ET 317",
      new Date()
    );
    const res1 = await sendEmail("bloomwise06@gmail.com", assignmentEmail.subject, assignmentEmail.html);
    console.log("newAssignment result:", res1 ? "SUCCESS" : "FAILED");

    console.log("2. Testing marksheetUploaded template...");
    const marksheetEmail = emailTemplates.marksheetUploaded(
      "Test Student",
      "ET 317",
      85, 10, 15, 30, 30
    );
    const res2 = await sendEmail("bloomwise06@gmail.com", marksheetEmail.subject, marksheetEmail.html);
    console.log("marksheetUploaded result:", res2 ? "SUCCESS" : "FAILED");

    console.log("3. Testing newCommunityPost template...");
    const communityEmail = emailTemplates.newCommunityPost(
      "Test Recipient",
      "Test Author",
      "General Post Title",
      "ET 317"
    );
    const res3 = await sendEmail("bloomwise06@gmail.com", communityEmail.subject, communityEmail.html);
    console.log("newCommunityPost result:", res3 ? "SUCCESS" : "FAILED");

  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

test();
