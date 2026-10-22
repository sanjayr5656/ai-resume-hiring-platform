import type { Job } from './job';

export interface ProofFile {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256?: string;
  uploadedAt: string;
}

export interface ExtractedCertData {
  candidateName?: string;
  courseTitle?: string;
  issuer?: string;
  dateOrDuration?: string;
  credentialId?: string;
  scoreOrGrade?: string;
  verificationUrl?: string;
}

export interface AiCheckResult {
  verdict: 'likely_valid' | 'needs_review' | 'suspicious';
  confidence: number;
  findings: string[];
  extracted?: ExtractedCertData;
  checkedAt: string;
}

export interface AuditEntry {
  verifiedBy?: string;
  action: 'verified' | 'rejected' | 'ai_checked';
  at: string;
  note?: string;
}

export type CertificationStatus = 'claimed' | 'proof_provided' | 'ai_checked' | 'verified' | 'rejected';

export interface Certification {
  _id: string;
  name: string;
  issuer?: string;
  credentialId?: string;
  credentialUrl?: string;
  proofFiles: ProofFile[];
  verificationStatus: CertificationStatus;
  aiCheckResult?: AiCheckResult;
  auditTrail: AuditEntry[];
  relevance?: number;
  confidenceNote?: string;
}

export interface Scores {
  total: number;
  skills: number;
  projects: number;
  certifications: number;
  experience: number;
  explanation?: string;
  reasons?: string[];
  breakdown?: {
    skillsReason?: string;
    projectsReason?: string;
    certificationsReason?: string;
    experienceReason?: string;
  };
  strengths?: string[];
  gaps?: string[];
  confidence?: number;
  trustIndicator?: number;
}

export interface SkillGapResource {
  title: string;
  url: string;
}

export interface SkillGapSuggestion {
  skill: string;
  priority: 'high' | 'medium';
  whyItMatters: string;
  nextStep: string;
  sentence?: string;
  category?: string;
  currentStatus?: string;
  projectIdea?: string;
  resources?: SkillGapResource[];
  estimatedTime?: string;
  scoreImpact?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  evidenceTip?: string;
}

export interface SkillGap {
  matched: string[];
  missing: string[];
  suggestions: SkillGapSuggestion[];
}

export interface CandidateUserRef {
  _id: string;
  name: string;
  email: string;
}

export interface ParsedProfile {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    relevance?: number;
  }>;
  certifications?: Certification[];
  education?: any[];
  experience?: Array<{
    title?: string;
    years?: number;
    description?: string;
  }>;
}

export interface ProfileSnapshot {
  links?: Record<string, any>;
  codingStats?: any[];
  certificates?: any[];
  snapshotAt?: string;
}

export interface Application {
  _id: string;
  jobId: string | Job;
  candidateId: string | CandidateUserRef;
  resumeFile?: string;
  resumeText?: string;
  parsed?: ParsedProfile;
  scores: Scores;
  skillGap: SkillGap;
  status: 'applied' | 'shortlisted' | 'rejected';
  rank?: number | null;
  rankUpdatedAt?: string;
  duplicateFlags?: any[];
  profileSnapshot?: ProfileSnapshot;
  createdAt: string;
  updatedAt: string;
}

