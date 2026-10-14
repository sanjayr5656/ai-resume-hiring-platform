require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Job = require('../models/Job');
const Application = require('../models/Application');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for migration...');

  // 1. Migrate Jobs
  const jobs = await Job.find();
  console.log(`Checking ${jobs.length} jobs...`);
  for (const job of jobs) {
    let updated = false;
    const w = job.weights || {};
    const sum = (Number(w.skills) || 0) + (Number(w.projects) || 0) + (Number(w.certifications) || 0) + (Number(w.experience) || 0);
    if (sum !== 100) {
      job.weights = { skills: 45, projects: 30, certifications: 20, experience: 5 };
      updated = true;
    }
    if (updated) {
      await job.save();
      console.log(`Updated job weights for: ${job.title} (${job._id})`);
    }
  }

  // 2. Migrate Applications
  const apps = await Application.find().select('+parsed.certifications.proofFile +resumePath');
  console.log(`Checking ${apps.length} applications...`);
  for (const app of apps) {
    let updated = false;
    if (app.parsed && Array.isArray(app.parsed.certifications)) {
      for (const cert of app.parsed.certifications) {
        if (!Array.isArray(cert.proofFiles)) {
          cert.proofFiles = [];
          updated = true;
        }
        if (!Array.isArray(cert.auditTrail)) {
          cert.auditTrail = [];
          updated = true;
        }
        if (!cert.verificationStatus) {
          cert.verificationStatus = 'claimed';
          updated = true;
        }
      }
    }

    if (!app.scores) {
      app.scores = { total: 0, skills: 0, projects: 0, certifications: 0, experience: 0 };
      updated = true;
    }
    if (!app.scores.breakdown) {
      app.scores.breakdown = {
        skillsReason: 'Skills evaluated from resume.',
        projectsReason: 'Projects evaluated from resume.',
        certificationsReason: 'Certifications evaluated.',
        experienceReason: 'Experience evaluated.'
      };
      updated = true;
    }
    if (!Array.isArray(app.scores.strengths)) {
      app.scores.strengths = app.skillGap?.matched || [];
      updated = true;
    }
    if (!Array.isArray(app.scores.gaps)) {
      app.scores.gaps = app.skillGap?.missing || [];
      updated = true;
    }
    if (app.scores.confidence === undefined) {
      app.scores.confidence = 80;
      updated = true;
    }
    if (app.scores.trustIndicator === undefined) {
      app.scores.trustIndicator = 100;
      updated = true;
    }

    if (updated) {
      await app.save();
      console.log(`Migrated application: ${app._id}`);
    }
  }

  console.log('Migration complete.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
