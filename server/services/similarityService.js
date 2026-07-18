const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

/**
 * Clean and normalize text extracted from files
 */
function cleanExtractedText(rawText) {
  if (!rawText) return "";
  return rawText
    .replace(/([a-zA-Z0-9])-\s*[\r\n]+\s*([a-zA-Z0-9])/g, "$1$2") // Rejoin broken words at line breaks
    .replace(/[\r\n]+/g, " ")                                      // Collapse linebreaks to spaces
    .replace(/\s+/g, " ")                                          // Collapse multiple spaces
    .trim();
}

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
  let text = "";

  if (ext === ".txt") {
    text = fs.readFileSync(filePath, "utf-8");
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    text = result.value || "";
  } else if (ext === ".pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    text = data.text || "";
  } else {
    throw new Error("Unsupported file format. Only .docx, .pdf, and .txt are supported.");
  }

  return cleanExtractedText(text);
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
  const clean = cleanExtractedText(text);
  return clean
    .split(/[.!?]+\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 5); // Ignore empty or trivial 1-2 char noise
}

/**
 * Computes Levenshtein distance between two strings.
 */
function computeLevenshtein(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

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

  // Word set Jaccard similarity for fast comparison
  const w1 = new Set(s1.split(" "));
  const w2 = new Set(s2.split(" "));
  let intersection = 0;
  for (const w of w1) {
    if (w2.has(w)) intersection++;
  }
  const union = new Set([...w1, ...w2]).size;
  const wordJaccard = union > 0 ? intersection / union : 0;

  if (wordJaccard >= 0.6) return wordJaccard;

  const dist = computeLevenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return (maxLen - dist) / maxLen;
}

/**
 * Generate word N-grams (trigrams) from text array
 */
function getTrigrams(words) {
  const trigrams = new Set();
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return trigrams;
}

/**
 * Computes the similarity percentage of new sentences compared to reference sentences.
 * Combines sentence fuzzy matching with document Trigram Jaccard similarity.
 * @param {string[]} newSentences - Sentences from the new submission.
 * @param {string[]} refSentences - Sentences from the reference submission.
 * @returns {number} - Percentage similarity (0 to 100).
 */
function calculateSimilarity(newSentences, refSentences) {
  if (!newSentences || !refSentences || newSentences.length === 0 || refSentences.length === 0) return 0;

  const newClean = newSentences.map(s => preprocessText(s)).filter(s => s.length > 0);
  const refClean = refSentences.map(s => preprocessText(s)).filter(s => s.length > 0);

  if (newClean.length === 0 || refClean.length === 0) return 0;

  // 0. Direct full-text & high-word overlap check (100% exact match)
  const newFullText = newClean.join(" ");
  const refFullText = refClean.join(" ");
  if (newFullText && refFullText) {
    if (newFullText === refFullText) return 100;

    const newWordsAll = newFullText.split(" ").filter((w) => w.length > 1);
    const refWordsAll = refFullText.split(" ").filter((w) => w.length > 1);
    if (newWordsAll.length > 0 && refWordsAll.length > 0) {
      const refSet = new Set(refWordsAll);
      let wordMatches = 0;
      for (const w of newWordsAll) {
        if (refSet.has(w)) wordMatches++;
      }
      const wordSimilarity = Math.round((wordMatches / newWordsAll.length) * 100);
      if (wordSimilarity >= 90) return wordSimilarity;
    }
  }

  // 1. Sentence-level similarity ratio
  const refCleanSet = new Set(refClean);
  let matchCount = 0;

  for (const ns of newClean) {
    if (refCleanSet.has(ns)) {
      matchCount++;
      continue;
    }

    let foundMatch = false;
    for (const rs of refClean) {
      const lenDiff = Math.abs(ns.length - rs.length);
      const maxLen = Math.max(ns.length, rs.length);
      if (lenDiff / maxLen > 0.4) continue; // Skip if lengths differ by more than 40%

      const similarity = getSentenceSimilarity(ns, rs);
      if (similarity >= 0.70) { // 70%+ sentence match threshold
        foundMatch = true;
        break;
      }
    }

    if (foundMatch) {
      matchCount++;
    }
  }

  const sentenceMatchPercent = Math.round((matchCount / newClean.length) * 100);

  // 2. Document Trigram Jaccard Overlap
  const newWords = newClean.join(" ").split(" ").filter(w => w.length > 2);
  const refWords = refClean.join(" ").split(" ").filter(w => w.length > 2);

  let ngramPercent = 0;
  if (newWords.length >= 3 && refWords.length >= 3) {
    const newTrigrams = getTrigrams(newWords);
    const refTrigrams = getTrigrams(refWords);
    
    let commonTrigrams = 0;
    for (const tri of newTrigrams) {
      if (refTrigrams.has(tri)) commonTrigrams++;
    }
    ngramPercent = Math.round((commonTrigrams / Math.max(1, newTrigrams.size)) * 100);
  }

  // Final combined similarity score (highest of sentence match and trigram overlap)
  return Math.min(100, Math.max(sentenceMatchPercent, ngramPercent));
}

module.exports = {
  extractTextFromFile,
  preprocessText,
  splitIntoSentences,
  calculateSimilarity
};
