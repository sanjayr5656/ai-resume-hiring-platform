const router = require('express').Router();
const Job = require('../models/Job');
const Application = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/auth');
const { chatAssistant } = require('../controllers/ai');

// Simple in-memory rate limiter: max 25 calls per minute per user
const rateLimitMap = new Map();
function rateLimiter(req, res, next) {
  const userId = req.user._id.toString();
  const now = Date.now();
  const windowMs = 60 * 1000;
  const userRecord = rateLimitMap.get(userId) || { count: 0, resetAt: now + windowMs };

  if (now > userRecord.resetAt) {
    userRecord.count = 1;
    userRecord.resetAt = now + windowMs;
  } else {
    userRecord.count += 1;
  }
  rateLimitMap.set(userId, userRecord);

  if (userRecord.count > 25) {
    return res.status(429).json({ error: 'Career assistant rate limit exceeded. Please wait a moment before sending more messages.' });
  }
  next();
}

router.post('/chat', requireAuth, requireRole('candidate'), rateLimiter, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // 1. Fetch candidate's latest application with parsed profile
    const latestApp = await Application.findOne({ candidateId: req.user._id })
      .select('+parsed')
      .sort({ createdAt: -1 });

    if (!latestApp || !latestApp.parsed) {
      return res.json({
        reply: "Welcome! To help you find the best matching roles and uncover skill gaps, please upload a resume first by applying to any open position. Once uploaded, I'll be able to score your profile against all opportunities!",
        hasResume: false,
        recommendedJobs: []
      });
    }

    // 2. Fetch all currently open jobs from database
    const openJobs = await Job.find({ status: 'open' }).lean();

    // 3. Process candidate career query with AI assistant
    const response = await chatAssistant({
      message: message.trim(),
      history,
      candidateResume: latestApp.parsed,
      openJobs
    });

    res.json({
      reply: response.reply,
      recommendedJobs: response.recommendedJobs || [],
      hasResume: true
    });
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'Could not process assistant query. Please try again.' });
  }
});

module.exports = router;
