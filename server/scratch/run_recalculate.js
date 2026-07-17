const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const similarityService = require("../services/similarityService");
const Submission = require("../models/Submission");
const User = require("../models/User");
const fs = require("fs");

const recalculateAssignmentSimilarity = async (assignmentId) => {
  try {
    console.log("Starting recalculation for assignment:", assignmentId);
    const submissions = await Submission.find({ assignmentId }).sort({ submittedAt: 1 });
    console.log("Found submissions count:", submissions.length);
    const submissionSentencesCache = {};

    for (let i = 0; i < submissions.length; i++) {
      const currentSub = submissions[i];
      console.log(`Processing submission index ${i} for student:`, currentSub.studentId);
      let currentFiles = currentSub.files || [];
      if (currentFiles.length === 0 && currentSub.fileURL) {
        currentFiles = [{ fileURL: currentSub.fileURL, originalName: currentSub.originalName }];
      }
      console.log(`- Files:`, currentFiles.map(f => f.originalName));

      let allCurrentSentences = [];
      for (const f of currentFiles) {
        const ext = path.extname(f.originalName || f.fileURL).toLowerCase();
        if (ext === ".txt" || ext === ".docx") {
          const filePath = path.join(__dirname, "../../", f.fileURL);
          console.log("  - Reading file:", filePath);
          if (fs.existsSync(filePath)) {
            try {
              const text = await similarityService.extractTextFromFile(filePath);
              const sentences = similarityService.splitIntoSentences(text);
              allCurrentSentences.push(...sentences);
            } catch (err) {
              console.error(`Recalculate: Text extraction failed for student ${currentSub.studentId}:`, err);
            }
          } else {
            console.log("    - File does not exist!");
          }
        }
      }

      console.log(`  - Extracted sentences count:`, allCurrentSentences.length);
      submissionSentencesCache[currentSub._id.toString()] = allCurrentSentences;

      let highestSimilarityPercent = 0;
      let highestMatchedStudent = null;
      let highestMatchedSubmission = null;

      if (allCurrentSentences.length > 0) {
        for (let j = 0; j < i; j++) {
          const otherSub = submissions[j];
          if (otherSub.studentId.toString() === currentSub.studentId.toString()) {
            console.log(`  - Skipping self-match check with index ${j}`);
            continue;
          }

          const otherSentences = submissionSentencesCache[otherSub._id.toString()] || [];
          console.log(`  - Comparing with index ${j} (sentences: ${otherSentences.length})`);
          if (otherSentences.length > 0) {
            const similarity = similarityService.calculateSimilarity(allCurrentSentences, otherSentences);
            console.log(`    - Match percentage: ${similarity}%`);
            if (similarity > highestSimilarityPercent) {
              highestSimilarityPercent = similarity;
              highestMatchedStudent = otherSub.studentId;
              highestMatchedSubmission = otherSub._id;
            }
          }
        }
      }

      console.log(`  - Final Similarity: ${highestSimilarityPercent}%, Matched Student: ${highestMatchedStudent}`);
      currentSub.similarityPercent = highestSimilarityPercent;
      currentSub.similarityMatchedStudent = highestMatchedStudent;
      currentSub.similarityMatchedSubmission = highestMatchedSubmission;
      await currentSub.save();
      console.log(`  - Saved submission!`);
    }
    console.log("Recalculation complete.");
  } catch (error) {
    console.error("Error in recalculateAssignmentSimilarity:", error);
  }
};

async function main() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);
  console.log("DB connected.");
  await recalculateAssignmentSimilarity("6a3d5e6d6b594fdc61c311c4");
  process.exit(0);
}

main();
