const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
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

    const submissionRawTextCache = {};

    for (let i = 0; i < submissions.length; i++) {
      const currentSub = submissions[i];
      let extractedText = currentSub.extractedText || "";

      if (!extractedText) {
        let currentFiles = currentSub.files || [];
        if (currentFiles.length === 0 && currentSub.fileURL) {
          currentFiles = [{ fileURL: currentSub.fileURL, originalName: currentSub.originalName }];
        }

        let allRawTexts = [];
        for (const f of currentFiles) {
          const ext = path.extname(f.originalName || f.fileURL).toLowerCase();
          if (ext === ".txt" || ext === ".docx" || ext === ".pdf") {
            // resolve path using the robust logic
            let rel = f.fileURL;
            if (f.fileURL.includes("/uploads/")) {
              rel = f.fileURL.split("/uploads/").pop();
            } else if (f.fileURL.includes("\\uploads\\")) {
              rel = f.fileURL.split("\\uploads\\").pop();
            } else {
              rel = path.basename(f.fileURL);
            }
            rel = rel.split("?")[0].replace(/^\//, "");
            
            const pathsToTry = [
              path.join(__dirname, "../../uploads", rel),
              path.join(process.cwd(), "uploads", rel),
              path.join(__dirname, "../uploads", rel),
              path.join(__dirname, "../../", f.fileURL)
            ];
            
            let filePath = pathsToTry[0];
            for (const p of pathsToTry) {
              if (fs.existsSync(p)) {
                filePath = p;
                break;
              }
            }

            if (fs.existsSync(filePath)) {
              try {
                const text = await similarityService.extractTextFromFile(filePath);
                allRawTexts.push(text);
              } catch (err) {
                console.error(`Recalculate: Text extraction failed for student ${currentSub.studentId}:`, err);
              }
            }
          }
        }
        extractedText = allRawTexts.join(" ");
        if (extractedText) {
          currentSub.extractedText = extractedText;
          await currentSub.save();
        }
      }

      const sentences = similarityService.splitIntoSentences(extractedText);
      submissionSentencesCache[currentSub._id.toString()] = sentences;
      submissionRawTextCache[currentSub._id.toString()] = extractedText;

      let highestSimilarityPercent = 0;
      let highestMatchedStudent = null;
      let highestMatchedSubmission = null;
      let similarityMatches = [];

      const currentSentences = submissionSentencesCache[currentSub._id.toString()] || [];
      const currentRawText = submissionRawTextCache[currentSub._id.toString()] || "";

      if (currentSentences.length > 0 || currentRawText.length > 0) {
        for (let j = 0; j < i; j++) {
          const otherSub = submissions[j];
          if (otherSub.studentId.toString() === currentSub.studentId.toString()) continue;

          const otherSentences = submissionSentencesCache[otherSub._id.toString()] || [];
          const otherRawText = submissionRawTextCache[otherSub._id.toString()] || "";
          if (otherSentences.length > 0 || otherRawText.length > 0) {
            const similarity = similarityService.calculateSimilarity(
              currentSentences, 
              otherSentences,
              currentRawText,
              otherRawText
            );
            
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
