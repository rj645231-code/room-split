const { GoogleGenAI, Type } = require('@google/genai');

const scanReceipt = async (req, res) => {
  try {
    const { imageBase64 } = req.body; // e.g. "data:image/jpeg;base64,/9j/4AAQSkZJRg..."

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    let apiKey = process.env.GEMINI_API_KEY || '';
    apiKey = apiKey.trim().replace(/^['"]|['"]$/g, '');

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to your .env file.' });
    }

    // Initialize genAI
    const ai = new GoogleGenAI({ apiKey });

    // Parse base64 string
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid image data format' });
    }

    const mimeType = match[1];
    const data = match[2];

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
             inlineData: { data, mimeType }
          },
          "You are an expert receipt extraction AI. Extract all line items, their individual prices, the grand total, and the merchant name from this receipt. Be extremely meticulous. If it is a blurry receipt, use context clues (like grocery items) to guess the items correctly. Do NOT skip items unless they are completely unreadable. Include taxes and fees as separate line items if visible. Make absolutely sure your response strictly matches the required JSON format and includes the 'items' array. If you cannot find any true items, attempt to extract the total as a single item. You must always return useful items."
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING, description: "Name of the store or merchant" },
              total: { type: Type.NUMBER, description: "Grand total sum on the receipt" },
              items: {
                type: Type.ARRAY,
                description: "List of items purchased",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the item" },
                    price: { type: Type.NUMBER, description: "Total price for this line item" }
                  },
                  required: ["name", "price"]
                }
              }
            },
            required: ["merchant", "total", "items"]
          }
        }
      });
    } catch (e) {
      const is503 = e.status === 503 || String(e.message).includes('503') || String(e.message).includes('UNAVAILABLE');
      const is429 = e.status === 429 || String(e.message).includes('429') || String(e.message).includes('RESOURCE_EXHAUSTED') || String(e.message).includes('exceeded your current quota');
      
      if (is503 || is429) {
        // Fallback to gemini-2.5-flash-lite
        console.warn('gemini-2.5-flash unavailable or quota exceeded, falling back to gemini-2.5-flash-lite');
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [
            {
               inlineData: { data, mimeType }
            },
            "You are an expert receipt extraction AI. Extract all line items, their individual prices, the grand total, and the merchant name from this receipt. Be extremely meticulous. If it is a blurry receipt, use context clues (like grocery items) to guess the items correctly. Do NOT skip items unless they are completely unreadable. Include taxes and fees as separate line items if visible. Make absolutely sure your response strictly matches the required JSON format and includes the 'items' array. If you cannot find any true items, attempt to extract the total as a single item. You must always return useful items."
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                merchant: { type: Type.STRING, description: "Name of the store or merchant" },
                total: { type: Type.NUMBER, description: "Grand total sum on the receipt" },
                items: {
                  type: Type.ARRAY,
                  description: "List of items purchased",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "Name of the item" },
                      price: { type: Type.NUMBER, description: "Total price for this line item" }
                    },
                    required: ["name", "price"]
                  }
                }
              },
              required: ["merchant", "total", "items"]
            }
          }
        });
      } else {
        throw e;
      }
    }

    const parsedText = response.text || "{}";
    const receiptData = JSON.parse(parsedText);

    res.json({
      success: true,
      data: receiptData
    });
  } catch (error) {
    console.error('Vision API Error:', error);
    
    let errMsg = error.message || 'Failed to analyze receipt image';
    if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }
    
    res.status(500).json({ success: false, message: errMsg });
  }
};

module.exports = {
  scanReceipt
};
