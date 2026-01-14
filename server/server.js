import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { OpenRouter } from '@openrouter/sdk';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from './db.js';

import rateLimit from 'express-rate-limit';

const tier_limits = {
  0: 0,
  1: 5,
  2: 25,
  3: 100,
  4: Infinity
};

(async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      tier INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
})();

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

const openRouter = new OpenRouter({
  apiKey: process.env.OpenRouter_API_KEY,
});

app.use(cors());
app.use(express.json());

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// GET Health check
app.get('/', (req, res) => {
  res.json({ ok: true });
});

// API IP rate limiting
const apiIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP.' },
  keyGenerator: (req) =>
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
});

// Rate limiting for usage check
const usageRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many usage requests, please try again later.' },
  keyGenerator: (req, res) =>
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
});

//GET API Usage
app.get('/api/usage', usageRateLimiter, authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const tierRes = await sql`SELECT tier FROM users WHERE id = ${userId}`;

  const tier = tierRes.rows[0]?.tier ?? 0;

  const limits = {
    0: 0,
    1: 5,
    2: 25,
    3: 100,
    4: null
  };

  const limit = limits[tier];

  const usageRes = await sql`SELECT count FROM daily_usage where user_id = ${userId} AND date = ${today}`;

  const used = usageRes.rows[0]?.count ?? 0;

  res.json({
    used,
    limit
  });
});

// Rate limiting for signup
const signupRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup requests, please try again later.' },
  keyGenerator: (req, res) =>
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
});

// POST /api/signup
app.post('/api/signup', signupRateLimiter, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`Receiving signup request from ${ip}`);
  
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Missing fields' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password too short' });

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await sql`INSERT INTO users (username, password_hash)
       VALUES (${username}, ${hash})
       RETURNING id, username`;

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

// Rate limiting for login
const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
  keyGenerator: (req, res) =>
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
});

// POST /api/login
app.post('/api/login', loginRateLimiter, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`Receiving login request from ${ip}`);
  const { username, password } = req.body;

  const result = await sql`SELECT * FROM users WHERE username = ${username}`;

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

//Middle check for authentication
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

//Middle check for limiting
async function usageMiddleWare(req, res, next) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0,10);

    const userRes = await sql`SELECT tier FROM users WHERE id = ${userId}`;

    const tier = userRes.rows[0]?.tier ?? 0;
    const limit = tier_limits[tier];

    if (limit === Infinity) {
      return next();
    }

    const usageRes = await sql`SELECT count FROM daily_usage WHERE user_id = ${userId} AND date = ${today}`;

    const used = usageRes.rows[0]?.count ?? 0;

    if (used >= limit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        used,
        limit
      });
    }

   await sql`
      INSERT INTO daily_usage (user_id, date, count)
      VALUES (${userId}, ${today}, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = daily_usage.count + 1
      `;

    next();
  } catch (err) {
    console.error('Usage middleware error: ', err);
    res.status(500).json({ error: 'Usage tracking failed' });
  }
}

// Rate limiting for API
const apiUserRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user_${req.user.id}`,
  handler: (req, res) => {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// POST /api/gemini
app.post('/api/ai', apiIpLimiter, authMiddleware, apiUserRateLimiter, usageMiddleWare, async (req, res) => {
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

    const openRouterRes = await openRouter.callModel({
      model: 'deepseek/deepseek-r1-0528:free',
      input: text,
    });
    
    client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ]
    });

    let out;
    if (typeof openRouterRes.text === 'function') {
      out = openRouterRes.text();
    } else {
      const cand = openRouterRes.candidates?.[0];
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
