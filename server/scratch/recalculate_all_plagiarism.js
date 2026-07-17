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
    console.log(`Found ${submissions.length} submissions.`);
    const submissionSentencesCache = {};

    for (let i = 0; i < submissions.length; i++) {
      const currentSub = submissions[i];
      let currentFiles = currentSub.files || [];
      if (currentFiles.length === 0 && currentSub.fileURL) {
        currentFiles = [{ fileURL: currentSub.fileURL, originalName: currentSub.originalName }];
      }

      let allCurrentSentences = [];
      for (const f of currentFiles) {
        const ext = path.extname(f.originalName || f.fileURL).toLowerCase();
        if (ext === ".txt" || ext === ".docx") {
          const filePath = path.join(__dirname, "../../", f.fileURL);
          if (fs.existsSync(filePath)) {
            try {
              const text = await similarityService.extractTextFromFile(filePath);
              const sentences = similarityService.splitIntoSentences(text);
              allCurrentSentences.push(...sentences);
            } catch (err) {
              console.error(`Recalculate: Text extraction failed for student ${currentSub.studentId}:`, err);
            }
          }
        }
      }

      submissionSentencesCache[currentSub._id.toString()] = allCurrentSentences;

      let highestSimilarityPercent = 0;
      let highestMatchedStudent = null;
      let highestMatchedSubmission = null;
      let similarityMatches = [];

      if (allCurrentSentences.length > 0) {
        for (let j = 0; j < i; j++) {
          const otherSub = submissions[j];
          if (otherSub.studentId.toString() === currentSub.studentId.toString()) continue;

          const otherSentences = submissionSentencesCache[otherSub._id.toString()] || [];
          if (otherSentences.length > 0) {
            const similarity = similarityService.calculateSimilarity(allCurrentSentences, otherSentences);
            
            if (similarity > 0) {
              similarityMatches.push({
                studentId: otherSub.studentId,
                submissionId: otherSub._id,
                similarityPercent: similarity
              });

              if (similarity > highestSimilarityPercent) {
                highestSimilarityPercent = similarity;
                highestMatchedStudent = otherSub.studentId;
                highestMatchedSubmission = otherSub._id;
              }
            }
          }
        }
      }

      currentSub.similarityPercent = highestSimilarityPercent;
      currentSub.similarityMatchedStudent = highestMatchedStudent;
      currentSub.similarityMatchedSubmission = highestMatchedSubmission;
      currentSub.similarityMatches = similarityMatches;
      await currentSub.save();
      console.log(`Updated submission ${currentSub._id} (student: ${currentSub.studentId}) with ${similarityMatches.length} matches.`);
    }
  } catch (error) {
    console.error("Error in recalculateAssignmentSimilarity:", error);
  }
};

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
    await mongoose.connect(mongoUri);
    console.log("DB connected successfully.");

    // Find all unique assignmentIds in submissions
    const assignmentIds = await Submission.distinct("assignmentId");
    console.log(`Found ${assignmentIds.length} unique assignments with submissions.`);

    for (const aId of assignmentIds) {
      await recalculateAssignmentSimilarity(aId);
    }

    console.log("All recalculations completed.");
    process.exit(0);
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

main();
