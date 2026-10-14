const mongoose = require('mongoose');

const proofFileSchema = new mongoose.Schema({
  fileId: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, default: '' },
  sha256: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const aiCheckResultSchema = new mongoose.Schema({
  verdict: { type: String, enum: ['likely_valid', 'needs_review', 'suspicious'] },
  confidence: { type: Number, min: 0, max: 100 },
  findings: [String],
  extracted: {
    candidateName: String,
    courseTitle: String,
    issuer: String,
    dateOrDuration: String,
    credentialId: String,
    scoreOrGrade: String,
    verificationUrl: String
  },
  checkedAt: { type: Date, default: Date.now }
}, { _id: false });

const auditEntrySchema = new mongoose.Schema({
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: ['verified', 'rejected', 'ai_checked'] },
  at: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { _id: false });

const certificationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  issuer: { type: String, default: '' },
  credentialId: { type: String, default: '' },
  credentialUrl: { type: String, default: '' },
  proofFiles: [proofFileSchema],
  proofFile: { type: String, select: false },
  proofMime: { type: String },
  proofName: { type: String },
  verificationStatus: {
    type: String,
    enum: ['claimed', 'proof_provided', 'ai_checked', 'verified', 'rejected'],
    default: 'claimed'
  },
  aiCheckResult: aiCheckResultSchema,
  auditTrail: [auditEntrySchema],
  relevance: { type: Number, default: 5 },
  confidenceNote: { type: String, default: '' }
}, { _id: true });

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resumeFile: String,
  resumePath: { type: String, select: false },
  resumeHash: String,
  resumeText: String,
  parsed: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    projects: [mongoose.Schema.Types.Mixed],
    certifications: [certificationSchema],
    education: [mongoose.Schema.Types.Mixed],
    experience: [mongoose.Schema.Types.Mixed]
  },
  scores: {
    total: Number,
    skills: Number,
    projects: Number,
    certifications: Number,
    experience: Number,
    explanation: String,
    reasons: [String],
    breakdown: {
      skillsReason: String,
      projectsReason: String,
      certificationsReason: String,
      experienceReason: String
    },
    strengths: [String],
    gaps: [String],
    confidence: Number,
    trustIndicator: Number
  },
  skillGap: {
    matched: [String],
    missing: [String],
    suggestions: [mongoose.Schema.Types.Mixed]
  },
  status: { type: String, enum: ['applied', 'shortlisted', 'rejected'], default: 'applied', index: true },
  rank: { type: Number, default: null },
  rankUpdatedAt: { type: Date, default: null },
  duplicateFlags: [mongoose.Schema.Types.Mixed]
}, { timestamps: { createdAt: 'createdAt', updatedAt: true } });

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ jobId: 1, rank: 1 });
applicationSchema.index({ jobId: 1, 'scores.total': -1 });

module.exports = mongoose.model('Application', applicationSchema);
