import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db.js';

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

app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Missing fields' });

  if (username.length < 3)
    return res.status(400).json({ error: 'Username too short' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password too short' });

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `).run(username, password_hash);
    
    const token = jwt.sign(
      { id: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Missing fields' });

    const user = db.prepare(`
      SELECT * FROM users WHERE username = ?
    `).get(username);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing auth' });

  const [type, token] = header.split (' ');
  if (type !== 'Bearer' || !token)
    return res.status(401).json({ error: 'Invalid token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });

    req.user = decoded;
    next();
  });

}

// POST /api/gemini
app.post('/api/gemini', authMiddleware, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`Receiving API request from ${ip}`);
    const prefix = "You are answering a simple question. Do not respond with any different formatting than regular plain text, no bold italics or anything. Do not respond with anything else other than the answer(s) to the question. This is the question:\n";
    const userInput = (req.body && typeof req.body === 'object' && 'text' in req.body)
      ? req.body.text
      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const text = prefix + (userInput ?? '');
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
    console.log(`API response successfully sent to ${ip}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
