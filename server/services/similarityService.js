const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

/**
 * Extracts plain text from an uploaded file (.txt, .docx, or .pdf).
 * @param {string} filePath - Absolute path to the file on the server.
 * @returns {Promise<string>} - Extracted raw text.
 */
async function extractTextFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on server.");
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf-8");
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === ".pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }
  throw new Error("Unsupported file format. Only .docx, .pdf, and .txt are supported.");
}

/**
 * Preprocesses text: converts to lowercase, removes special characters, and removes extra spaces.
 * @param {string} text - Raw text.
 * @returns {string} - Cleaned text.
 */
function preprocessText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special characters
    .replace(/\s+/g, " ")       // remove extra whitespaces
    .trim();
}

/**
 * Splits text into individual sentences.
 * @param {string} text - Raw text.
 * @returns {string[]} - Array of sentences.
 */
function splitIntoSentences(text) {
  if (!text) return [];
  return text
    .split(/[.!?]+\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Computes Levenshtein distance between two strings.
 */
function computeLevenshtein(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}

/**
 * Calculates sentence similarity between clean sentences.
 */
function getSentenceSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const dist = computeLevenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return (maxLen - dist) / maxLen;
}

/**
 * Computes the similarity percentage of new sentences compared to reference sentences.
 * Checks close matches with Levenshtein and exact matches using a set.
 * @param {string[]} newSentences - Sentences from the new submission.
 * @param {string[]} refSentences - Sentences from the reference submission.
 * @returns {number} - Percentage similarity (0 to 100).
 */
function calculateSimilarity(newSentences, refSentences) {
  if (newSentences.length === 0 || refSentences.length === 0) return 0;

  const newClean = newSentences.map(s => preprocessText(s)).filter(s => s.length > 0);
  const refClean = refSentences.map(s => preprocessText(s)).filter(s => s.length > 0);

  if (newClean.length === 0 || refClean.length === 0) return 0;

  const refCleanSet = new Set(refClean);
  let matchCount = 0;

  for (const ns of newClean) {
    // 1. Exact match check
    if (refCleanSet.has(ns)) {
      matchCount++;
      continue;
    }

    // 2. Similarity match check (Levenshtein)
    let foundMatch = false;
    for (const rs of refClean) {
      const lenDiff = Math.abs(ns.length - rs.length);
      const maxLen = Math.max(ns.length, rs.length);
      if (lenDiff / maxLen > 0.05) continue; // Skip if lengths differ by more than 5%

      const similarity = getSentenceSimilarity(ns, rs);
      if (similarity >= 0.95) {
        foundMatch = true;
        break;
      }
    }

    if (foundMatch) {
      matchCount++;
    }
  }

  return Math.round((matchCount / newClean.length) * 100);
}

module.exports = {
  extractTextFromFile,
  preprocessText,
  splitIntoSentences,
  calculateSimilarity
};
