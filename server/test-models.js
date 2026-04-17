require('dotenv').config({ path: 'server/.env' });
const { GoogleGenAI } = require('@google/genai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY.replace(/^['"]|['"]$/g, '');
  const ai = new GoogleGenAI({ apiKey });
  try {
    const models = await ai.models.list();
    for (const m of models) {
      if (m.name.includes('gemini-1.5')) {
        console.log(m.name, m.supportedActions);
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}
test();
