require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for migration...');

  // 1. Migrate Jobs (ensure weights sum to 100)
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

  // 2. Migrate Applications (ensure profileSnapshot exists, clean profileFile)
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

    // Ensure profileSnapshot exists
    if (!app.profileSnapshot || typeof app.profileSnapshot !== 'object') {
      app.profileSnapshot = { links: {}, codingStats: [], certificates: app.parsed?.certifications || [], snapshotAt: new Date().toISOString() };
      updated = true;
    }

    if (updated) {
      await app.save();
      console.log(`Migrated application: ${app._id}`);
    }
  }

  // Unset profileFile on all applications
  await Application.collection.updateMany({}, { $unset: { profileFile: "" } });

  // 3. Migrate Users (Safe removal of Google OAuth fields, ensure all users have passwordHash)
  const users = await User.find().select('+passwordHash');
  console.log(`Checking ${users.length} users...`);
  for (const u of users) {
    let uUpdated = false;

    // If an account had no passwordHash from legacy Google-only login, give it a default secure passwordHash
    if (!u.passwordHash) {
      u.passwordHash = await bcrypt.hash('HireLensPass2026!', 12);
      uUpdated = true;
      console.log(`Set password for legacy Google-only user: ${u.email}`);
    }

    if (uUpdated) {
      await u.save();
    }

    // Ensure candidate has a UserProfile
    if (u.role === 'candidate') {
      const existingProf = await UserProfile.findOne({ userId: u._id });
      if (!existingProf) {
        await UserProfile.create({
          userId: u._id,
          notificationPreferences: {
            emailStatusUpdates: true,
            jobAlerts: true,
            jobAlertsMode: 'instant',
            minFitScore: 40,
          },
        });
        console.log(`Created default UserProfile for: ${u.email}`);
      }
    }
  }

  // Unset Google fields on users collection
  await User.collection.updateMany({}, { $unset: { provider: "", googleId: "", avatarUrl: "" } });

  console.log('Migration complete.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
