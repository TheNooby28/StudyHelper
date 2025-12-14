import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './db.js';

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      tier INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
})();

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

  if (password.length < 6)
    return res.status(400).json({ error: 'Password too short' });

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username`,
      [username, hash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      user,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Username taken' });

    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token });
});


function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });

  const token = header.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
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
