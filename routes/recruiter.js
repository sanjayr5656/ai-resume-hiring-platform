const router = require('express').Router();
const fs = require('fs');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { requireRole, requireAuth } = require('../middleware/auth');
const { extractSkills, aiCheckCertificate, generateTopCandidatesSummary } = require('../controllers/ai');
const { rank } = require('../utils/ranking');
const { enqueueRerank, rerankJob } = require('../services/queue');
const { notifyShortlisted, notifyRejected } = require('../services/notifications');
const { buildProfileSnapshot } = require('../services/profileSnapshot');

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth, requireRole('recruiter'));

// 1. Recruiter Jobs
router.get('/jobs', asyncRoute(async (req, res) => {
  res.json(await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 }));
}));

// 2. Suggest skills with AI (Section 8)
router.post('/extract-skills', asyncRoute(async (req, res) => {
  const { title = '', description = '' } = req.body;
  if (!description?.trim() || description.trim().length < 20) {
    return res.status(400).json({ error: 'Please enter a job description of at least 20 characters before extracting skills.' });
  }
  const fullText = `${title ? `Job Title: ${title}\n` : ''}${description}`;
  const skills = await extractSkills(fullText);
  res.json(skills);
}));

// 3. Applicants List with Rank, Score Filters, and Verified Certs Filter (Section 9)
router.get('/jobs/:id/applicants', asyncRoute(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const filter = { jobId: job._id };
  if (['applied', 'shortlisted', 'rejected'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (req.query.minScore !== undefined && req.query.minScore !== '') {
    const min = Math.max(0, Math.min(100, Number(req.query.minScore) || 0));
    filter['scores.total'] = { $gte: min };
  }
  if (req.query.onlyVerified === 'true' || req.query.onlyVerified === true) {
    filter['parsed.certifications.verificationStatus'] = 'verified';
  }

  // Ensure rank is computed if null
  const unrankedCount = await Application.countDocuments({ jobId: job._id, rank: null });
  if (unrankedCount > 0) {
    await rerankJob(job._id);
  }

  const apps = await Application.find(filter)
    .populate('candidateId', 'name email')
    .sort({ rank: 1, 'scores.total': -1, createdAt: 1 });

  res.json(apps);
}));

// 4. AI Top Candidates Summary (Section 9)
router.get('/jobs/:id/top-summary', asyncRoute(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const topApps = await Application.find({ jobId: job._id })
    .populate('candidateId', 'name email')
    .sort({ rank: 1, 'scores.total': -1 })
    .limit(5);

  const summary = await generateTopCandidatesSummary(job, topApps);
  res.json({ summary });
}));

// 5. Update Application Status (Shortlist / Reject)
router.patch('/applications/:id/status', asyncRoute(async (req, res) => {
  if (!['shortlisted', 'rejected', 'applied'].includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid application status' });
  }
  const a = await Application.findById(req.params.id).populate('jobId');
  if (!a || a.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const previousStatus = a.status;
  const newStatus = req.body.status;
  const recruiterNote = String(req.body.note || '').trim().slice(0, 500);

  a.status = newStatus;
  await a.save();

  // Trigger notifications only on actual status change (idempotency)
  if (previousStatus !== newStatus && ['shortlisted', 'rejected'].includes(newStatus)) {
    const candidate = await User.findById(a.candidateId);
    if (candidate) {
      const job = a.jobId;
      setImmediate(async () => {
        try {
          if (newStatus === 'shortlisted') {
            await notifyShortlisted({
              candidate,
              jobTitle: job.title,
              company: job.company,
              recruiterNote,
              applicationId: a._id.toString(),
            });
          } else {
            await notifyRejected({
              candidate,
              jobTitle: job.title,
              company: job.company,
              recruiterNote,
              applicationId: a._id.toString(),
            });
          }
        } catch (err) {
          console.error('[Notification] Status change notification failed:', err.message);
        }
      });
    }
  }

  res.json(a);
}));


// 6. Run AI Certificate Check (Section 3 & 4)
router.post('/applications/:id/certifications/:certId/ai-check', asyncRoute(async (req, res) => {
  const a = await Application.findById(req.params.id).populate('jobId candidateId');
  if (!a || a.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const certs = a.parsed?.certifications || [];
  const c = typeof certs.id === 'function' ? certs.id(req.params.certId) : certs.find(item => String(item._id) === String(req.params.certId));
  if (!c) return res.status(404).json({ error: 'Certification not found' });

  const applicantInfo = {
    applicantName: a.candidateId?.name || a.parsed?.name,
    resumeName: a.parsed?.name
  };

  const aiResult = await aiCheckCertificate(c, applicantInfo);
  c.aiCheckResult = aiResult;
  c.verificationStatus = 'ai_checked';

  if (!Array.isArray(c.auditTrail)) c.auditTrail = [];
  c.auditTrail.push({
    verifiedBy: req.user._id,
    action: 'ai_checked',
    at: new Date(),
    note: `AI check completed: ${aiResult.verdict} (Confidence: ${aiResult.confidence}%)`
  });

  const job = a.jobId;
  a.scores = rank(a.parsed, job);
  a.markModified('parsed');
  await a.save();

  enqueueRerank(job._id);
  res.json(a);
}));

// 7. Recruiter Manual Verification / Rejection Decision with Audit Trail (Section 4)
router.patch('/applications/:id/certifications/:certId/verify', asyncRoute(async (req, res) => {
  const { status, note = '' } = req.body;
  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be verified or rejected' });
  }
  if (status === 'rejected' && !note.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required when rejecting a certificate.' });
  }

  const a = await Application.findById(req.params.id).populate('jobId');
  if (!a || a.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const certs = a.parsed?.certifications || [];
  const c = typeof certs.id === 'function' ? certs.id(req.params.certId) : certs.find(item => String(item._id) === String(req.params.certId));
  if (!c) return res.status(404).json({ error: 'Certification not found' });

  c.verificationStatus = status;

  if (!Array.isArray(c.auditTrail)) c.auditTrail = [];
  c.auditTrail.push({
    verifiedBy: req.user._id,
    action: status,
    at: new Date(),
    note: note.trim()
  });

  const job = a.jobId;
  a.scores = rank(a.parsed, job);
  a.markModified('parsed');
  await a.save();

  // Immediately update ranking
  await rerankJob(job._id);

  const updated = await Application.findById(a._id).populate('candidateId', 'name email');
  res.json(updated);
}));

// 8. Duplicate Detection (Section 9)
function shingles(text) {
  const words = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i < words.length - 2; i++) out.add(words.slice(i, i + 3).join(' '));
  return out;
}

router.post('/jobs/:id/duplicates', asyncRoute(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const threshold = Math.max(0.5, Math.min(1, Number(process.env.DUPLICATE_THRESHOLD || 0.85)));
  const apps = await Application.find({ jobId: job._id }).populate('candidateId', 'name email');
  const groups = [];

  for (let i = 0; i < apps.length; i++) {
    for (let j = i + 1; j < apps.length; j++) {
      const a = apps[i], b = apps[j];
      let similarity = 0, reason = '';
      if (a.resumeHash && a.resumeHash === b.resumeHash) {
        similarity = 1;
        reason = 'Exact resume file';
      } else if (
        (a.parsed.email && a.parsed.email.toLowerCase() === b.parsed.email?.toLowerCase()) ||
        (a.parsed.phone && a.parsed.phone.replace(/\D/g, '') === b.parsed.phone?.replace(/\D/g, ''))
      ) {
        similarity = 1;
        reason = 'Same contact details';
      } else {
        const x = shingles(a.resumeText), y = shingles(b.resumeText);
        let intersection = 0;
        for (const item of x) if (y.has(item)) intersection++;
        similarity = intersection / (x.size + y.size - intersection || 1);
        reason = 'Similar resume text';
      }
      if (similarity >= threshold) {
        groups.push({
          similarity: Math.round(similarity * 100),
          reason,
          applications: [
            { id: a._id, candidate: a.candidateId?.name || a.parsed.name },
            { id: b._id, candidate: b.candidateId?.name || b.parsed.name }
          ]
        });
      }
    }
  }

  for (const group of groups) {
    for (const item of group.applications) {
      const row = apps.find(a => a._id.toString() === item.id.toString());
      item.preview = (row?.resumeText || '').slice(0, 500);
    }
  }
  res.json({ threshold: Math.round(threshold * 100), groups });
}));

// 9. Download Candidate Resume
router.get('/applications/:id/resume', asyncRoute(async (req, res) => {
  const a = await Application.findById(req.params.id).select('+resumePath +resumeBase64').populate('jobId');
  if (!a || !a.jobId || a.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Resume not found' });
  }
  if (a.resumeBase64) {
    const buffer = Buffer.from(a.resumeBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(a.resumeFile || 'resume.pdf')}"`);
    return res.send(buffer);
  }
  if (a.resumePath && fs.existsSync(a.resumePath)) {
    return res.download(a.resumePath, a.resumeFile || 'resume.pdf');
  }
  res.status(404).json({ error: 'Resume file not found' });
}));

// 10. Recruiter Applicant Detail (returns resume plus profileSnapshot)
router.get('/applications/:id', asyncRoute(async (req, res) => {
  const a = await Application.findById(req.params.id)
    .populate('candidateId', 'name email')
    .populate('jobId');
  if (!a || !a.jobId || a.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Application not found' });
  }
  res.json(a);
}));

// 11. Recruiter Refresh Applicant Stats (re-fetches live stats with cooldown)
const refreshCooldowns = new Map();

router.post('/applications/:id/refresh-stats', asyncRoute(async (req, res) => {
  const a = await Application.findById(req.params.id)
    .populate('jobId');
  if (!a || !a.jobId || a.jobId.recruiterId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const cooldownKey = `${req.user._id}_${a._id}`;
  const lastRefresh = refreshCooldowns.get(cooldownKey);
  const now = Date.now();
  const cooldownSec = Number(process.env.STATS_RATE_LIMIT_MINUTES || 1) * 60;
  const cooldownMs = Math.min(60000, cooldownSec * 1000); // 60s cooldown limit

  if (lastRefresh && (now - lastRefresh) < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (now - lastRefresh)) / 1000);
    return res.status(429).json({ error: `Please wait ${remaining}s before refreshing stats again.` });
  }

  // Fetch latest snapshot for candidate
  const latestSnapshot = await buildProfileSnapshot(a.candidateId, a.parsed?.certifications || []);
  refreshCooldowns.set(cooldownKey, now);

  res.json({
    applicationSnapshot: a.profileSnapshot,
    latestSnapshot,
    refreshedAt: new Date().toISOString()
  });
}));

module.exports = router;
