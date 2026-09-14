const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const similarityService = require("../services/similarityService");

async function run() {
  try {
    const file1 = path.join(__dirname, "../../uploads/1785923514922-974825027.docx");
    const file2 = path.join(__dirname, "../../uploads/1785923586983-239335524.docx");
    
    console.log(`File 1 exists: ${fs.existsSync(file1)}`);
    console.log(`File 2 exists: ${fs.existsSync(file2)}`);
    
    if (fs.existsSync(file1) && fs.existsSync(file2)) {
      const text1 = await similarityService.extractTextFromFile(file1);
      const text2 = await similarityService.extractTextFromFile(file2);
      
      console.log(`Text 1 length: ${text1.length}`);
      console.log(`Text 1 sample: "${text1.slice(0, 150)}..."`);
      
      console.log(`Text 2 length: ${text2.length}`);
      console.log(`Text 2 sample: "${text2.slice(0, 150)}..."`);
      
      const sentences1 = similarityService.splitIntoSentences(text1);
      const sentences2 = similarityService.splitIntoSentences(text2);
      
      console.log(`Sentences 1: ${sentences1.length}`);
      console.log(`Sentences 2: ${sentences2.length}`);
      
      const similarity = similarityService.calculateSimilarity(sentences1, sentences2, text1, text2);
      console.log(`Calculated Similarity: ${similarity}%`);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
