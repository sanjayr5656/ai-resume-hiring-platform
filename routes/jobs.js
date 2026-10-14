const router = require('express').Router();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parsePdf } = require('../controllers/parser');
const { extractResume } = require('../controllers/ai');
const { skillGap } = require('../utils/skills');
const { rank } = require('../utils/ranking');
const { enqueueRerank, rerankJob } = require('../services/queue');

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 10);
const maxFileSizeBytes = maxUploadMb * 1024 * 1024;

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeBytes, files: 1 },
  fileFilter: (_req, f, cb) => cb(null, f.mimetype === 'application/pdf' && f.originalname.toLowerCase().endsWith('.pdf'))
});

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeBytes, files: 10 },
  fileFilter: (_req, f, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    cb(null, allowed.includes(f.mimetype));
  }
});

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function validWeights(w) {
  if (!w) return true;
  const keys = ['skills', 'projects', 'certifications', 'experience'];
  const numbers = keys.every(k => Number.isFinite(Number(w[k])));
  const sum = keys.reduce((a, k) => a + Number(w[k] || 0), 0);
  return numbers && sum === 100;
}

// 1. List jobs
router.get('/', asyncRoute(async (req, res) => {
  if (req.user?.role === 'recruiter') {
    return res.json(await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 }));
  }
  const filter = { status: 'open' };
  if (req.query.search) {
    filter.$or = ['title', 'company', 'description', 'requiredSkills'].map(k => ({
      [k]: { $regex: String(req.query.search).slice(0, 80), $options: 'i' }
    }));
  }
  res.json(await Job.find(filter).sort({ createdAt: -1 }));
}));

// 2. Get single job
router.get('/:id', asyncRoute(async (req, res) => {
  const j = await Job.findOne({ _id: req.params.id, status: 'open' });
  if (!j) return res.status(404).json({ error: 'Open job not found' });
  res.json(j);
}));

// 3. Create job
router.post('/', requireAuth, requireRole('recruiter'), asyncRoute(async (req, res) => {
  const { title, description, requiredSkills = [], niceToHaveSkills = [], minExperience = 0, weights } = req.body;
  const initialWeights = weights || { skills: 45, projects: 30, certifications: 20, experience: 5 };
  if (!title?.trim() || !description?.trim() || !Array.isArray(requiredSkills) || !validWeights(initialWeights)) {
    return res.status(400).json({ error: 'Valid title, description, skills and weights totaling 100 are required' });
  }
  const job = await Job.create({
    recruiterId: req.user._id,
    title: title.trim(),
    description,
    company: req.user.company || 'Company',
    requiredSkills,
    niceToHaveSkills,
    minExperience,
    weights: initialWeights
  });
  res.status(201).json(job);
}));

// 4. Update job (triggers automatic applicant re-ranking)
router.put('/:id', requireAuth, requireRole('recruiter'), asyncRoute(async (req, res) => {
  const j = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!j) return res.status(404).json({ error: 'Job not found' });
  for (const key of ['title', 'description', 'requiredSkills', 'niceToHaveSkills', 'minExperience', 'weights', 'status']) {
    if (req.body[key] !== undefined) j[key] = req.body[key];
  }
  if (!validWeights(j.weights)) return res.status(400).json({ error: 'Weights must sum to 100' });
  try {
    await j.save();
  } catch (e) {
    if (e.name === 'ValidationError') return res.status(400).json({ error: e.message });
    throw e;
  }
  // Automatically re-rank all applicants for this job with new weights/skills
  enqueueRerank(j._id);
  res.json(j);
}));

// 5. Close job
router.post('/:id/close', requireAuth, requireRole('recruiter'), asyncRoute(async (req, res) => {
  const j = await Job.findOneAndUpdate({ _id: req.params.id, recruiterId: req.user._id }, { status: 'closed' }, { new: true });
  if (!j) return res.status(404).json({ error: 'Job not found' });
  res.json(j);
}));

// 6. Candidate apply (with PDF resume)
router.post('/:id/apply', requireAuth, requireRole('candidate'), resumeUpload.single('resume'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: `Upload one PDF resume (maximum ${maxUploadMb} MB)` });
  const job = await Job.findOne({ _id: req.params.id, status: 'open' });
  if (!job) return res.status(404).json({ error: 'Open job not found' });
  if (await Application.exists({ jobId: job._id, candidateId: req.user._id })) {
    return res.status(409).json({ error: 'You have already applied to this job' });
  }

  const resumeText = await parsePdf(req.file.buffer);
  if (!resumeText.trim()) return res.status(400).json({ error: 'No text could be extracted from this PDF' });

  const parsed = await extractResume(resumeText, job);
  parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  parsed.certifications = Array.isArray(parsed.certifications) ? parsed.certifications : [];
  parsed.education = Array.isArray(parsed.education) ? parsed.education : [];
  parsed.experience = Array.isArray(parsed.experience) ? parsed.experience : [];
  parsed.certifications.forEach(c => {
    c.verificationStatus = 'claimed';
    c.proofFiles = [];
    c.auditTrail = [];
  });

  const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
  fs.mkdirSync(uploadDir, { recursive: true });
  const storedName = `${crypto.randomUUID()}.pdf`;
  const storedPath = path.join(uploadDir, storedName);
  fs.writeFileSync(storedPath, req.file.buffer);

  const initialScores = rank(parsed, job);
  const initialGaps = skillGap(job.requiredSkills, parsed.skills, job.title);

  const app = await Application.create({
    jobId: job._id,
    candidateId: req.user._id,
    resumeFile: req.file.originalname,
    resumePath: storedPath,
    resumeHash: crypto.createHash('sha256').update(req.file.buffer).digest('hex'),
    resumeText,
    parsed,
    skillGap: initialGaps,
    scores: initialScores
  });

  // Re-rank all applicants for this job in background
  enqueueRerank(job._id);

  res.status(201).json(app);
}));

// 7. Candidate's applications
router.get('/my/applications', requireAuth, requireRole('candidate'), asyncRoute(async (req, res) => {
  const list = await Application.find({ candidateId: req.user._id })
    .populate('jobId', 'title company status requiredSkills niceToHaveSkills')
    .sort({ createdAt: -1 });
  res.json(list);
}));

// 8. Download resume
router.get('/my/applications/:applicationId/resume', requireAuth, requireRole('candidate'), asyncRoute(async (req, res) => {
  const a = await Application.findOne({ _id: req.params.applicationId, candidateId: req.user._id }).select('+resumePath');
  if (!a?.resumePath || !fs.existsSync(a.resumePath)) return res.status(404).json({ error: 'Resume file not found' });
  res.download(a.resumePath, a.resumeFile || 'resume.pdf', (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to download resume file' });
    }
  });
}));

// 9. Add a Certification / Document to Application (Section 2)
router.post('/applications/:applicationId/certifications', requireAuth, requireRole('candidate'), proofUpload.array('proofs', 10), asyncRoute(async (req, res) => {
  const a = await Application.findOne({ _id: req.params.applicationId, candidateId: req.user._id });
  if (!a) return res.status(404).json({ error: 'Application not found' });

  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Certification or document name is required' });

  const issuer = String(req.body.issuer || '').trim();
  const credentialId = String(req.body.credentialId || '').trim();
  const credentialUrl = String(req.body.credentialUrl || '').trim();
  if (credentialUrl && !/^https?:\/\//i.test(credentialUrl)) {
    return res.status(400).json({ error: 'Credential URL must be a valid http/https link' });
  }

  const proofsDir = path.join(__dirname, '..', 'uploads', 'proofs');
  fs.mkdirSync(proofsDir, { recursive: true });

  const proofFiles = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const fileId = crypto.randomUUID();
      const sanitizedName = (f.originalname || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFilename = `${fileId}_${sanitizedName}`;
      const diskPath = path.join(proofsDir, diskFilename);
      fs.writeFileSync(diskPath, f.buffer);

      const sha256 = crypto.createHash('sha256').update(f.buffer).digest('hex');
      proofFiles.push({
        fileId,
        originalName: sanitizedName,
        mimeType: f.mimetype,
        size: f.size,
        path: diskPath,
        sha256,
        uploadedAt: new Date()
      });
    }
  }

  const hasProof = proofFiles.length > 0 || !!credentialUrl;
  const newCert = {
    name,
    issuer,
    credentialId,
    credentialUrl,
    proofFiles,
    verificationStatus: hasProof ? 'proof_provided' : 'claimed',
    auditTrail: [],
    relevance: 5
  };

  if (!a.parsed) a.parsed = {};
  if (!Array.isArray(a.parsed.certifications)) a.parsed.certifications = [];
  a.parsed.certifications.push(newCert);

  const job = await Job.findById(a.jobId);
  a.scores = rank(a.parsed, job);
  a.markModified('parsed');
  await a.save();

  enqueueRerank(job._id);
  await a.populate('jobId', 'title company status requiredSkills niceToHaveSkills');
  res.status(201).json(a);
}));

// 10. Delete a Certification from Application
router.delete('/applications/:applicationId/certifications/:certificationId', requireAuth, requireRole('candidate'), asyncRoute(async (req, res) => {
  const a = await Application.findOne({ _id: req.params.applicationId, candidateId: req.user._id });
  if (!a) return res.status(404).json({ error: 'Application not found' });

  const certs = a.parsed?.certifications || [];
  const certIdx = certs.findIndex(c => String(c._id) === String(req.params.certificationId));
  if (certIdx === -1) return res.status(404).json({ error: 'Certification not found' });

  const c = certs[certIdx];
  if (c.verificationStatus === 'verified') {
    return res.status(400).json({ error: 'Cannot delete a verified certification.' });
  }

  // Remove disk proof files
  if (Array.isArray(c.proofFiles)) {
    for (const f of c.proofFiles) {
      if (f.path && fs.existsSync(f.path)) {
        try { fs.unlinkSync(f.path); } catch {}
      }
    }
  }

  certs.splice(certIdx, 1);
  const job = await Job.findById(a.jobId);
  a.scores = rank(a.parsed, job);
  a.markModified('parsed');
  await a.save();

  enqueueRerank(job._id);
  await a.populate('jobId', 'title company status requiredSkills niceToHaveSkills');
  res.json(a);
}));

// 11. Upload Multiple Proof Documents for a Certification (Section 2)
router.post('/applications/:applicationId/certifications/:certificationId/proof', requireAuth, requireRole('candidate'), proofUpload.array('proofs', 10), asyncRoute(async (req, res) => {
  const a = await Application.findOne({ _id: req.params.applicationId, candidateId: req.user._id });
  if (!a) return res.status(404).json({ error: 'Application not found' });

  const certs = a.parsed?.certifications || [];
  const c = typeof certs.id === 'function' ? certs.id(req.params.certificationId) : certs.find(item => String(item._id) === String(req.params.certificationId));
  if (!c) return res.status(404).json({ error: 'Certification not found' });

  if (c.verificationStatus === 'verified') {
    return res.status(400).json({ error: 'This certification is already verified and cannot be edited.' });
  }

  const proofsDir = path.join(__dirname, '..', 'uploads', 'proofs');
  fs.mkdirSync(proofsDir, { recursive: true });

  if (!Array.isArray(c.proofFiles)) c.proofFiles = [];

  // Handle uploaded files
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const fileId = crypto.randomUUID();
      const sanitizedName = (f.originalname || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFilename = `${fileId}_${sanitizedName}`;
      const diskPath = path.join(proofsDir, diskFilename);
      fs.writeFileSync(diskPath, f.buffer);

      const sha256 = crypto.createHash('sha256').update(f.buffer).digest('hex');
      c.proofFiles.push({
        fileId,
        originalName: sanitizedName,
        mimeType: f.mimetype,
        size: f.size,
        path: diskPath,
        sha256,
        uploadedAt: new Date()
      });
    }
    c.verificationStatus = 'proof_provided';
  }

  // Handle credentialId & credentialUrl
  if (req.body.credentialId !== undefined) {
    c.credentialId = String(req.body.credentialId).trim();
  }
  if (req.body.credentialUrl !== undefined) {
    const credUrl = String(req.body.credentialUrl).trim();
    if (credUrl && !/^https?:\/\//i.test(credUrl)) {
      return res.status(400).json({ error: 'Credential URL must be a valid http/https link' });
    }
    c.credentialUrl = credUrl;
    if (credUrl) c.verificationStatus = 'proof_provided';
  }

  const job = await Job.findById(a.jobId);
  a.scores = rank(a.parsed, job);
  a.markModified('parsed');
  await a.save();

  // Enqueue reranking
  enqueueRerank(job._id);

  await a.populate('jobId', 'title company status requiredSkills niceToHaveSkills');
  res.json(a);
}));

// 12. Delete a proof file from a certification (Section 2)
router.delete('/applications/:applicationId/certifications/:certificationId/proofs/:fileId', requireAuth, requireRole('candidate'), asyncRoute(async (req, res) => {
  const a = await Application.findOne({ _id: req.params.applicationId, candidateId: req.user._id });
  if (!a) return res.status(404).json({ error: 'Application not found' });

  const certs = a.parsed?.certifications || [];
  const c = typeof certs.id === 'function' ? certs.id(req.params.certificationId) : certs.find(item => String(item._id) === String(req.params.certificationId));
  if (!c) return res.status(404).json({ error: 'Certification not found' });

  if (c.verificationStatus === 'verified') {
    return res.status(400).json({ error: 'Cannot remove proof from a verified certificate.' });
  }

  const fileIdx = (c.proofFiles || []).findIndex(f => f.fileId === req.params.fileId);
  if (fileIdx === -1) return res.status(404).json({ error: 'Proof file not found' });

  const fileRecord = c.proofFiles[fileIdx];
  if (fileRecord.path && fs.existsSync(fileRecord.path)) {
    try { fs.unlinkSync(fileRecord.path); } catch {}
  }

  c.proofFiles.splice(fileIdx, 1);

  if (c.proofFiles.length === 0 && !c.credentialUrl) {
    c.verificationStatus = 'claimed';
  }

  const job = await Job.findById(a.jobId);
  a.scores = rank(a.parsed, job);
  a.markModified('parsed');
  await a.save();

  enqueueRerank(job._id);
  await a.populate('jobId', 'title company status requiredSkills niceToHaveSkills');
  res.json(a);
}));

// 11. Authenticated Secure Document Viewing for Proofs (Section 2 & 4)
router.get('/applications/:applicationId/certifications/:certificationId/proofs/:fileId', requireAuth, asyncRoute(async (req, res) => {
  const a = await Application.findById(req.params.applicationId).select('+parsed.certifications.proofFiles.path +parsed.certifications.proofFile').populate('jobId');
  if (!a) return res.status(404).json({ error: 'Application not found' });

  // Allowed viewers: Owning candidate or Recruiter owning the job
  const isCandidateOwner = a.candidateId.toString() === req.user._id.toString();
  const isRecruiterOwner = a.jobId && a.jobId.recruiterId.toString() === req.user._id.toString();

  if (!isCandidateOwner && !isRecruiterOwner) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view this proof document.' });
  }

  const certs = a.parsed?.certifications || [];
  const c = typeof certs.id === 'function' ? certs.id(req.params.certificationId) : certs.find(item => String(item._id) === String(req.params.certificationId));
  if (!c) return res.status(404).json({ error: 'Certification not found' });

  const fileRecord = (c.proofFiles || []).find(f => f.fileId === req.params.fileId);
  if (fileRecord && fileRecord.path && fs.existsSync(fileRecord.path)) {
    res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileRecord.originalName}"`);
    return fs.createReadStream(fileRecord.path).pipe(res);
  }

  // Backward compatibility with legacy base64 proofFile
  if (c.proofFile) {
    res.type(c.proofMime || 'application/pdf');
    return res.send(Buffer.from(c.proofFile, 'base64'));
  }

  res.status(404).json({ error: 'Proof document file not found on server' });
}));

module.exports = router;
