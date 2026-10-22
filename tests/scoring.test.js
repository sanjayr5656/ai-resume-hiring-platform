const assert = require('assert');
const { rank } = require('../utils/ranking');
const { canonical, matchSkill, isSkillEvidenced } = require('../utils/skills');

console.log('--- RUNNING SCORING ENGINE TESTS ---');

const baseJob = {
  title: 'Full Stack Node/React Developer',
  description: 'Looking for a skilled engineer with Node.js, Express, MongoDB, and React experience.',
  requiredSkills: ['Node.js', 'Express', 'MongoDB', 'React'],
  niceToHaveSkills: ['AWS', 'Docker'],
  minExperience: 2,
  weights: { skills: 45, projects: 30, certifications: 20, experience: 5 }
};

// 1. Perfect Match Test
{
  const perfectCandidate = {
    skills: ['Node.js', 'Express', 'MongoDB', 'React', 'AWS', 'Docker'],
    projects: [
      { name: 'Ecommerce Platform', description: 'Built with React, Node.js, Express and MongoDB, deployed on AWS with Docker.', technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'AWS'], relevance: 9 },
      { name: 'Task Manager API', description: 'REST API built with Node.js and MongoDB.', technologies: ['Node.js', 'MongoDB'], relevance: 8 },
      { name: 'Analytics Dashboard', description: 'React real-time analytics UI.', technologies: ['React'], relevance: 8 }
    ],
    certifications: [
      { name: 'AWS Certified Developer', issuer: 'Amazon', verificationStatus: 'verified', relevance: 9 },
      { name: 'MongoDB Certified Developer', issuer: 'MongoDB', verificationStatus: 'verified', relevance: 9 }
    ],
    experience: [{ title: 'Full Stack Engineer', years: 3, description: 'Worked on Node and React apps' }],
    education: [{ degree: 'B.Tech Computer Science', jobFit: 9 }]
  };

  const scores = rank(perfectCandidate, baseJob);
  console.log('1. Perfect Match Score:', scores.total, '/ 100');
  assert(scores.total >= 85, `Expected score >= 85 for perfect candidate, got ${scores.total}`);
  assert.strictEqual(scores.trustIndicator, 100);
  assert(scores.reasons[0].includes('100% of required skills matched'));
  console.log('✓ Test 1 passed: Perfect match yields high score.');
}

// 2. Zero Matches Test
{
  const zeroCandidate = {
    skills: ['Carpentry', 'Plumbing', 'Welding'],
    projects: [],
    certifications: [],
    experience: [],
    education: []
  };

  const scores = rank(zeroCandidate, baseJob);
  console.log('2. Zero Match Score:', scores.total, '/ 100');
  assert(scores.total <= 20, `Expected score <= 20 for zero match candidate, got ${scores.total}`);
  assert(scores.reasons[0].includes('0% of required skills matched'));
  console.log('✓ Test 2 passed: Zero match yields low score.');
}

// 3. Synonym Matches Test (e.g. ReactJS = React, Node = Node.js, Mongo = MongoDB, ExpressJS = Express)
{
  const synonymCandidate = {
    skills: ['reactjs', 'node', 'mongo', 'expressjs'],
    projects: [
      { name: 'App One', description: 'Built with reactjs and node', technologies: ['reactjs', 'node'], relevance: 7 }
    ],
    certifications: [],
    experience: [{ title: 'Developer', years: 2 }],
    education: [{ jobFit: 7 }]
  };

  const scores = rank(synonymCandidate, baseJob);
  console.log('3. Synonym Match Score:', scores.total, '/ 100');
  assert(scores.skills >= 35, `Expected skills >= 35 from 45 for synonym matches, got ${scores.skills}`);
  assert(scores.reasons[0].includes('100% of required skills matched'));
  console.log('✓ Test 3 passed: Synonyms properly recognized as required skills.');
}

// 4. Unverified vs Verified Certificates Test
{
  const unverifiedCandidate = {
    skills: ['Node.js', 'React'],
    projects: [{ name: 'Project 1', technologies: ['Node.js'], relevance: 6 }],
    certifications: [
      { name: 'Cert A', verificationStatus: 'claimed', relevance: 8 }
    ],
    experience: [{ years: 2 }]
  };

  const verifiedCandidate = {
    ...unverifiedCandidate,
    certifications: [
      { name: 'Cert A', verificationStatus: 'verified', relevance: 8 }
    ]
  };

  const unverifiedScore = rank(unverifiedCandidate, baseJob);
  const verifiedScore = rank(verifiedCandidate, baseJob);
  console.log('4. Unverified Cert Score:', unverifiedScore.certifications, 'vs Verified Cert Score:', verifiedScore.certifications);
  assert(verifiedScore.certifications > unverifiedScore.certifications, 'Verified certifications must score higher than unverified');
  console.log('✓ Test 4 passed: Verified certifications yield higher score.');
}

// 5. Weight Changes Test
{
  const candidate = {
    skills: ['Node.js', 'Express', 'MongoDB', 'React'],
    projects: [],
    certifications: [],
    experience: [{ years: 2 }]
  };

  const skillHeavyJob = { ...baseJob, weights: { skills: 80, projects: 10, certifications: 5, experience: 5 } };
  const projectHeavyJob = { ...baseJob, weights: { skills: 10, projects: 80, certifications: 5, experience: 5 } };

  const score1 = rank(candidate, skillHeavyJob);
  const score2 = rank(candidate, projectHeavyJob);
  console.log('5. Skill-heavy score:', score1.total, 'vs Project-heavy score with no projects:', score2.total);
  assert(score1.total > score2.total, 'Score must reflect custom recruiter weights');
  console.log('✓ Test 5 passed: Weight changes correctly shift total score.');
}

// 6. Test the problematic 9/100 candidate scenario from screenshot
{
  const realCandidate = {
    skills: ['Node.js', 'Express', 'MongoDB', 'React', 'JavaScript'],
    projects: [
      { name: 'Production Backend API', description: 'Scalable REST API with Express and MongoDB', technologies: ['Node.js', 'Express', 'MongoDB'], relevance: 8 },
      { name: 'Client Portal UI', description: 'React web application', technologies: ['React'], relevance: 7 }
    ],
    certifications: [
      { name: 'Full Stack Web Dev', issuer: 'Coursera', verificationStatus: 'proof_provided', relevance: 8 }
    ],
    experience: [{ title: 'Full Stack Engineer', years: 2, description: 'Worked with Node and React' }],
    education: [{ degree: 'BS Computer Science', jobFit: 8 }]
  };

  const realScore = rank(realCandidate, baseJob);
  console.log('6. Realistic Candidate Score:', realScore.total, '/ 100 (skills:', realScore.skills, 'projects:', realScore.projects, 'certs:', realScore.certifications, 'exp:', realScore.experience, ')');
  assert(realScore.total >= 70, `Expected realistic candidate to score >= 70, got ${realScore.total}`);
  console.log('✓ Test 6 passed: Real candidate scores sensibly (> 70/100) instead of buggy 9/100.');
}

// 7. Profile Snapshot Supporting Evidence Test
{
  const candidate = {
    skills: ['Node.js', 'React'],
    projects: [{ name: 'Task Manager', technologies: ['Node.js'], relevance: 6 }],
    certifications: [],
    experience: [{ years: 2 }]
  };

  const snapshotWithCoding = {
    codingStats: [
      { platform: 'leetcode', totalSolved: 450, rating: 1850 },
      { platform: 'codechef', totalSolved: 120, rating: 1600 }
    ],
    links: { leetcode: { username: 'testdev' } },
    certificates: [],
    snapshotAt: new Date().toISOString()
  };

  const scoreWithoutSnapshot = rank(candidate, baseJob);
  const scoreWithSnapshot = rank(candidate, baseJob, snapshotWithCoding);

  assert(scoreWithSnapshot.skills >= scoreWithoutSnapshot.skills, 'Coding stats snapshot should provide supporting evidence for skills');
  assert(scoreWithSnapshot.skills <= baseJob.weights.skills, 'Skills score cannot exceed job skill weight');
  assert(scoreWithSnapshot.projects <= baseJob.weights.projects, 'Projects score cannot exceed job project weight');
  assert(scoreWithSnapshot.total <= 100, 'Total score cannot exceed 100');
  assert(scoreWithSnapshot.breakdown.skillsReason.includes('Supported by profile snapshot'), 'Reasoning should mention profile snapshot');
  assert(scoreWithSnapshot.breakdown.projectsReason.includes('Supported by profile snapshot'), 'Reasoning should mention profile snapshot');
  console.log('✓ Test 7 passed: Profile snapshot provides supporting evidence within weight limits and is documented in reasoning.');
}

console.log('--- ALL SCORING ENGINE TESTS PASSED! ---');
