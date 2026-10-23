require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const recruiterRoutes = require('./routes/recruiter');
const assistantRoutes = require('./routes/assistant');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

let cachedConnection = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!cachedConnection) {
    let mongoUri = process.env.MONGO_URI || '';
    // Strip accidental angle brackets around password if present (e.g. <password> -> password)
    mongoUri = mongoUri.replace(/<([^>]+)>/g, '$1');
    cachedConnection = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    }).catch(err => {
      cachedConnection = null;
      throw err;
    });
  }
  return cachedConnection;
}

// Ensure DB is connected before handling API requests in serverless and local
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/') return next();
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', apiRoutes);

// Serve uploaded files (resumes, proofs, profile PDFs) — auth is checked per-route
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, timestamp: new Date() }));
app.get('/', (_req, res) => res.json({ ok: true, message: 'HireLens API is running' }));

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);

// Only listen directly when running standalone (not inside Vercel serverless)
if (require.main === module || (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
  connectToDatabase().then(() => {
    console.log('DB Connected');
    app.listen(port, '0.0.0.0', () => console.log(`Running on ${port}`));
  }).catch(err => {
    console.error('MongoDB connection failed:', err.message);
  });
}

module.exports = app;

