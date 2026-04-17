require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY.replace(/^['"]|['"]$/g, '');
  const ai = new GoogleGenAI({ apiKey });
  
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`Trying ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: "Return the word 'hello'"
      });
      console.log(`[SUCCESS] ${model} works! ->`, response.text);
    } catch (e) {
      console.log(`[FAILED] ${model} threw error:`, e.message);
    }
  }
}
test();
