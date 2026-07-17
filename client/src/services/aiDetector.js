import api from "./api";

export async function analyzeAnswers(answers, questions) {
  try {
    const res = await api.post("/exams/analyze-ai", { answers, questions });
    return res.data;
  } catch (error) {
    console.warn("AI analysis failed:", error);
    return { overallAI: 0, questionAnalysis: [] };
  }
}
