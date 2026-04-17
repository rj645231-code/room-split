require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.replace(/^['"]|['"]$/g, '') : undefined;
    if (!apiKey) {
      console.log('No API key found in .env');
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const models = await ai.models.list();
    const available = [];
    for await (const m of models) {
      available.push(m.name);
    }
    console.log('Available models:', available.filter(n => n.includes('flash') || n.includes('pro')));
  } catch (e) {
    console.error(e.message);
  }
}
test();
