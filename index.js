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

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('DB Connected');
  app.listen(port, '0.0.0.0', () => console.log(`Running on ${port}`));
}).catch(err => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
