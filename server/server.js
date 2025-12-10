import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Health check
app.get('/', (req, res) => {
  res.json({ ok: true });
});

// POST /api/gemini  { text: "..." }
app.post('/api/gemini', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' });
    }

    const geminiRes = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ]
    }); // [web:59][web:65][web:68]

    // In current @google/genai, this should exist:
    let out;
    if (typeof geminiRes.text === 'function') {
      out = geminiRes.text();
    } else {
      // Fallback: manual extraction if .text() is missing
      const cand = geminiRes.candidates?.[0];
      const part = cand?.content?.parts?.[0];
      out = part?.text || '(no text from Gemini)';
    }

    res.json({ result: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
