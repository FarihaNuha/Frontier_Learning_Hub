const similarityService = require("../services/similarityService");

function runPlagiarismTests() {
  console.log("=== Testing Assignment Similarity Detection ===");

  // Test Case 1: Preprocessing
  const rawText = "This is a   TEST sentence with special char! @#$%";
  const expectedClean = "this is a test sentence with special char";
  const actualClean = similarityService.preprocessText(rawText);
  if (actualClean === expectedClean) {
    console.log("PASS: Preprocessing removes special chars and spaces, and converts to lowercase.");
  } else {
    console.error(`FAIL: Preprocessing. Expected: "${expectedClean}", Got: "${actualClean}"`);
    process.exit(1);
  }

  // Test Case 2: Sentence Tokenization
  const multilineText = "First sentence. Second sentence! Third sentence? Fourth one.";
  const sentences = similarityService.splitIntoSentences(multilineText);
  if (sentences.length === 4 && sentences[0] === "First sentence" && sentences[2] === "Third sentence") {
    console.log("PASS: Text correctly tokenized into individual sentences.");
  } else {
    console.error("FAIL: Sentence tokenization failed. Got sentences:", sentences);
    process.exit(1);
  }

  // Test Case 3: Exact Matches (100% Similarity)
  const newDoc1 = ["The quick brown fox jumps over the lazy dog", "Learning to code is fun"];
  const prevDoc1 = ["The quick brown fox jumps over the lazy dog", "Learning to code is fun", "Another random sentence"];
  const sim1 = similarityService.calculateSimilarity(newDoc1, prevDoc1);
  if (sim1 === 100) {
    console.log("PASS: Exact matching sentences count as 100% similarity.");
  } else {
    console.error(`FAIL: Exact match similarity. Expected 100%, Got ${sim1}%`);
    process.exit(1);
  }

  // Test Case 4: Near Matches (Levenshtein >= 95% Similarity)
  // "The quick brown fox jumps over the lazy dog" vs "The quick brown fox jumps over the lazy do" (98% similarity)
  const newDoc2 = ["The quick brown fox jumps over the lazy dog"];
  const prevDoc2 = ["The quick brown fox jumps over the lazy do"];
  const sim2 = similarityService.calculateSimilarity(newDoc2, prevDoc2);
  if (sim2 === 100) {
    console.log("PASS: Near matches (>= 95% similarity) are detected correctly as matching.");
  } else {
    console.error(`FAIL: Near match similarity. Expected 100%, Got ${sim2}%`);
    process.exit(1);
  }

  // Test Case 5: Low Similarity (< 95%)
  // "The quick brown fox jumps over the lazy dog" vs "A fast red fox jumped over the dog"
  const newDoc3 = ["The quick brown fox jumps over the lazy dog"];
  const prevDoc3 = ["A fast red fox jumped over the dog"];
  const sim3 = similarityService.calculateSimilarity(newDoc3, prevDoc3);
  if (sim3 === 0) {
    console.log("PASS: Sentences below 95% similarity are correctly ignored (0% similarity).");
  } else {
    console.error(`FAIL: Low similarity ignored check. Expected 0%, Got ${sim3}%`);
    process.exit(1);
  }

  // Test Case 6: Mixed matching and non-matching
  const newDoc4 = [
    "This is a unique sentence that is original",
    "The quick brown fox jumps over the lazy dog"
  ];
  const prevDoc4 = [
    "The quick brown fox jumps over the lazy dog",
    "Some other random sentence"
  ];
  const sim4 = similarityService.calculateSimilarity(newDoc4, prevDoc4);
  if (sim4 === 50) {
    console.log("PASS: Mixed matching returns correct partial percentage (50%).");
  } else {
    console.error(`FAIL: Mixed match percentage. Expected 50%, Got ${sim4}%`);
    process.exit(1);
  }

  console.log("All Plagiarism Similarity Detection Tests Passed successfully!");
  process.exit(0);
}

runPlagiarismTests();
