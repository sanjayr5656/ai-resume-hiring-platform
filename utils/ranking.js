const { canonical, matchSkill, isSkillEvidenced } = require('./skills');

// Proof credit multipliers (Section 3)
const proofMultipliers = {
  claimed: 0.3,
  proof_provided: 0.6,
  ai_checked: {
    likely_valid: 0.8,
    needs_review: 0.6,
    suspicious: 0.3
  },
  verified: 1.0,
  rejected: 0.0
};

function getCertificateMultiplier(cert) {
  const status = cert.verificationStatus || 'claimed';
  if (status === 'ai_checked') {
    const verdict = cert.aiCheckResult?.verdict || 'needs_review';
    return proofMultipliers.ai_checked[verdict] !== undefined ? proofMultipliers.ai_checked[verdict] : 0.6;
  }
  return proofMultipliers[status] !== undefined ? proofMultipliers[status] : 0.3;
}

const clamp = (x, min = 0, max = 10) => Math.max(min, Math.min(max, Number(x) || 0));

/**
 * Deterministic scoring engine
 * Default weights: skills: 45, projects: 30, certifications: 20, experience: 5 (sum = 100)
 */
function rank(parsed = {}, job = {}) {
  const weights = {
    skills: 45,
    projects: 30,
    certifications: 20,
    experience: 5,
    ...(job.weights && typeof job.weights === 'object' ? (job.weights.toObject ? job.weights.toObject() : job.weights) : {})
  };

  const reqSkills = job.requiredSkills || [];
  const niceSkills = job.niceToHaveSkills || [];
  const candidateSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const actualSet = new Set(candidateSkills.map(canonical));
  const projectsList = Array.isArray(parsed.projects) ? parsed.projects : [];
  const certsList = Array.isArray(parsed.certifications) ? parsed.certifications : [];
  const expList = Array.isArray(parsed.experience) ? parsed.experience : [];
  const eduList = Array.isArray(parsed.education) ? parsed.education : [];

  // ================= 1. SKILLS SCORING =================
  let matchedRequiredCount = 0;
  let evidencedMatchCount = 0;
  const matchedRequiredNames = [];
  const missingRequiredNames = [];

  for (const req of reqSkills) {
    const match = matchSkill(req, actualSet);
    if (match.matched) {
      matchedRequiredNames.push(req);
      const isEvidenced = isSkillEvidenced(req, projectsList, expList);
      if (isEvidenced) evidencedMatchCount++;
      // Full credit for exact/alias match, partial for related, bonus for practical evidence
      const baseCredit = match.score;
      const evidenceBoost = isEvidenced ? 1.15 : 1.0;
      matchedRequiredCount += Math.min(1.0, baseCredit * evidenceBoost);
    } else {
      missingRequiredNames.push(req);
    }
  }

  const reqSkillRatio = reqSkills.length ? Math.min(1.0, matchedRequiredCount / reqSkills.length) : 1.0;

  // Nice-to-have bonus (up to 10% bonus)
  let matchedNiceCount = 0;
  for (const nice of niceSkills) {
    if (matchSkill(nice, actualSet).matched) matchedNiceCount++;
  }
  const niceBonus = niceSkills.length ? Math.min(0.1, (matchedNiceCount / niceSkills.length) * 0.1) : 0;

  const skillScorePct = Math.min(100, (reqSkillRatio * 0.95 + niceBonus) * 100);
  const skillsScore = Math.round((skillScorePct * weights.skills) / 100);

  // ================= 2. PROJECTS SCORING =================
  // Score top 3 projects based on relevance, tech overlap, and execution complexity
  const evaluatedProjects = projectsList.map(p => {
    const tech = Array.isArray(p.technologies) ? p.technologies : [];
    const techOverlap = reqSkills.length
      ? tech.filter(t => reqSkills.some(s => canonical(s) === canonical(t))).length / reqSkills.length
      : 0.5;

    const baseRelevance = p.relevance !== undefined ? clamp(p.relevance, 0, 10) : 5.0;
    // Complexity & deployment bonus
    const desc = `${p.name || ''} ${p.description || ''}`.toLowerCase();
    const hasDeployment = /\b(deployed|production|live|docker|aws|cloud|users|ci\/cd|pipeline)\b/i.test(desc) ? 1.0 : 0;

    const finalProjectScore = clamp(baseRelevance * 0.6 + techOverlap * 3.0 + hasDeployment);
    return { name: p.name || 'Untitled Project', score: finalProjectScore };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  const avgProjectScore = evaluatedProjects.length
    ? evaluatedProjects.reduce((sum, p) => sum + p.score, 0) / evaluatedProjects.length
    : 0;
  const projectScorePct = Math.min(100, avgProjectScore * 10);
  const projectsScore = Math.round((projectScorePct * weights.projects) / 100);

  // ================= 3. CERTIFICATIONS SCORING =================
  let certScorePct = 0;
  let rejectedCertsCount = 0;
  let suspiciousCertsCount = 0;
  let verifiedCertsCount = 0;

  if (certsList.length > 0) {
    const certScores = certsList.map(c => {
      const relevance = clamp(c.relevance !== undefined ? c.relevance : 5, 1, 10);
      const mult = getCertificateMultiplier(c);
      if (c.verificationStatus === 'rejected') rejectedCertsCount++;
      if (c.verificationStatus === 'verified') verifiedCertsCount++;
      if (c.verificationStatus === 'ai_checked' && c.aiCheckResult?.verdict === 'suspicious') suspiciousCertsCount++;
      return relevance * 10 * mult;
    });
    certScorePct = Math.min(100, certScores.reduce((a, b) => a + b, 0) / certScores.length);
  } else {
    // If no certificates are provided, candidate receives a neutral baseline (40%) so as not to unduly penalize
    certScorePct = 40;
  }
  const certificationsScore = Math.round((certScorePct * weights.certifications) / 100);

  // ================= 4. EXPERIENCE & EDUCATION SCORING =================
  const expYears = expList.reduce((sum, e) => sum + Math.max(0, Number(e.years) || 0), 0);
  const minExp = Number(job.minExperience) || 0;
  const yearsPct = minExp > 0
    ? Math.min(100, (expYears / minExp) * 100)
    : (expYears > 0 ? 100 : 70);

  const degreeFit = eduList.length
    ? Math.max(...eduList.map(e => clamp(e.jobFit !== undefined ? e.jobFit : 5, 0, 10) * 10))
    : 50;
  const expEduPct = Math.min(100, yearsPct * 0.75 + degreeFit * 0.25);
  const experienceScore = Math.round((expEduPct * weights.experience) / 100);

  // ================= 5. TOTAL SCORE =================
  const total = Math.min(100, Math.max(0, skillsScore + projectsScore + certificationsScore + experienceScore));

  // ================= 6. TRUST & CONFIDENCE INDICATORS =================
  let trustIndicator = 100;
  trustIndicator -= rejectedCertsCount * 25;
  trustIndicator -= suspiciousCertsCount * 15;
  trustIndicator = Math.max(10, Math.min(100, trustIndicator));

  let confidence = 85;
  const rawTextLength = String(parsed.resumeText || '').length;
  if (rawTextLength < 400 && rawTextLength > 0) confidence -= 20;
  if (projectsList.length === 0) confidence -= 15;
  if (certsList.some(c => c.verificationStatus === 'claimed')) confidence -= 10;
  confidence = Math.max(20, Math.min(95, confidence));

  // ================= 7. DETAILED COMPONENT REASONING =================
  const skillsReason = `${matchedRequiredNames.length} of ${reqSkills.length} required skills matched (${Math.round(reqSkillRatio * 100)}%). ${
    matchedRequiredNames.length > 0 ? `Confirmed skills: ${matchedRequiredNames.join(', ')}.` : 'No required skills were identified.'
  } ${evidencedMatchCount > 0 ? `${evidencedMatchCount} skill(s) are reinforced by documented practical evidence.` : ''} ${
    missingRequiredNames.length > 0 ? `Missing skills: ${missingRequiredNames.join(', ')}.` : 'All required skills satisfied.'
  }`;

  const projectsReason = projectsList.length > 0
    ? `Assessed ${projectsList.length} project(s), highlighting top relevant work: ${evaluatedProjects.map(p => `${p.name} (${Math.round(p.score * 10)}/100)`).join(', ')}.`
    : 'No relevant technical projects were identified in the resume.';

  const certificationsReason = certsList.length > 0
    ? `${certsList.length} certification(s) evaluated (${verifiedCertsCount} verified, ${certsList.filter(c => c.verificationStatus === 'proof_provided').length} proof provided, ${rejectedCertsCount} rejected).`
    : 'No industry certifications were submitted with this profile.';

  const experienceReason = `${expYears} year(s) of relevant professional experience identified against ${minExp} year(s) required. Academic background job fit rated at ${Math.round(degreeFit)}%.`;

  const explanation = `Overall fit score is ${total}/100 based on ${Math.round(skillScorePct)}% skill match (${skillsScore}/${weights.skills} pts), ${Math.round(projectScorePct)}% project alignment (${projectsScore}/${weights.projects} pts), ${Math.round(certScorePct)}% certification validity (${certificationsScore}/${weights.certifications} pts), and ${Math.round(expEduPct)}% experience alignment (${experienceScore}/${weights.experience} pts).`;

  const reasons = [
    `${Math.round(reqSkillRatio * 100)}% of required skills matched`,
    `${evaluatedProjects.length} relevant project(s) assessed`,
    `${certsList.length} certification(s) assessed`,
    `${expYears} year(s) of experience identified`
  ];

  const strengths = [];
  if (matchedRequiredNames.length >= 2) strengths.push(`Strong core skill coverage: ${matchedRequiredNames.slice(0, 3).join(', ')}`);
  if (evaluatedProjects.length > 0 && avgProjectScore >= 6) strengths.push(`Demonstrated practical experience across ${evaluatedProjects.length} relevant project(s)`);
  if (verifiedCertsCount > 0) strengths.push(`Verified credentials with authenticated documentation`);
  if (expYears >= minExp && minExp > 0) strengths.push(`Meets or exceeds minimum required experience (${expYears} yrs)`);

  const gaps = [];
  if (missingRequiredNames.length > 0) gaps.push(`Missing key role requirements: ${missingRequiredNames.slice(0, 3).join(', ')}`);
  if (rejectedCertsCount > 0) gaps.push(`${rejectedCertsCount} certification(s) were rejected upon verification`);
  if (expYears < minExp && minExp > 0) gaps.push(`Experience (${expYears} yrs) is under the target threshold (${minExp} yrs)`);

  return {
    total,
    skills: skillsScore,
    projects: projectsScore,
    certifications: certificationsScore,
    experience: experienceScore,
    explanation,
    reasons,
    breakdown: {
      skillsReason,
      projectsReason,
      certificationsReason,
      experienceReason
    },
    strengths,
    gaps,
    confidence,
    trustIndicator
  };
}

module.exports = { rank, getCertificateMultiplier, proofMultipliers };
