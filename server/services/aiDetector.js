const axios = require("axios");

const API_KEY = process.env.AI_DETECTION_API_KEY;
const API_HOST = process.env.AI_DETECTION_API_HOST;
const PROXY = "https://corsproxy.io/?";
const API_URL =
  "https://ai-detection4.p.rapidapi.com/v1/ai-detection-rapid-api";

async function detectAI(text) {
  if (!text || text.trim().length < 50) {
    console.log("AI Detection skipped: text too short");
    return 0;
  }
  try {
    console.log("Calling AI API...");
    const response = await axios.post(
      API_URL,
      { text: text.trim(), lang: "en" },
      {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
        timeout: 10000,
      },
    );
    const data = response.data;
    const rawScore =
      data.ai_score ??
      data.score ??
      data.fake_probability ??
      (data.result ? (data.result.ai_score ?? data.result.score) : null);
    if (rawScore !== null && rawScore !== undefined) {
      const val = rawScore > 1 ? rawScore : rawScore * 100;
      console.log("AI Detection result:", val + "%");
      return Math.min(Math.max(Math.round(val), 0), 100);
    }
    console.log("AI Detection: no score in response");
    return 0;
  } catch (error) {
    console.error("AI Detection error:", error.message);
    return 0;
  }
}

async function analyzeAnswers(answers, questions) {
  const results = [];
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const answer = answers[i];
    if (
      question.type === "short" &&
      answer &&
      answer.toString().trim().length > 0
    ) {
      const aiPercentage = await detectAI(answer.toString());
      results.push({ questionIndex: i, aiPercentage });
    } else {
      results.push({ questionIndex: i, aiPercentage: 0 });
    }
  }
  return results;
}

module.exports = { detectAI, analyzeAnswers };
