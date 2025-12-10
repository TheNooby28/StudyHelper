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

// POST /api/gemini
app.post('/api/gemini', async (req, res) => {
  try {
    console.log(`Recieving API request from ${req.ip}`);
    const { text } = "You are answering a simple question. Do not respond with any different formatting than regular plain text, no bold italics or anything. Do not respond with anything else other than the answer(s) to the question. This is the question:\n" + req.body;
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
    });

    let out;
    if (typeof geminiRes.text === 'function') {
      out = geminiRes.text();
    } else {
      const cand = geminiRes.candidates?.[0];
      const part = cand?.content?.parts?.[0];
      out = part?.text || '(no text from Gemini)';
    }

    res.json({ result: out });
    console.log(`API response successfully sent to ${req.ip}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
