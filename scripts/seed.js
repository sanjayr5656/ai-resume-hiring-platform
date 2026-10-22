require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Job = require('../models/Job');
const UserProfile = require('../models/UserProfile');
const Notification = require('../models/Notification');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding...');

  const pass = await bcrypt.hash('DemoPass123!', 12);

  const recruiter = await User.findOneAndUpdate(
    { email: 'recruiter@example.com' },
    {
      $set: {
        name: 'Morgan Lee',
        passwordHash: pass,
        role: 'recruiter',
        company: 'Northstar Studio',
        provider: 'local',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const candidate = await User.findOneAndUpdate(
    { email: 'candidate@example.com' },
    {
      $set: {
        name: 'Alex Rivera',
        passwordHash: pass,
        role: 'candidate',
        provider: 'local',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Seed sample UserProfile with coding stats and LinkedIn info
  await UserProfile.findOneAndUpdate(
    { userId: candidate._id },
    {
      $set: {
        userId: candidate._id,
        linkedin: {
          url: 'https://www.linkedin.com/in/alex-rivera-dev',
          headline: 'Full-Stack Software Engineer · React, Node.js & Cloud Systems',
          currentRole: 'Software Developer',
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'Docker', 'Algorithms'],
        },
        platformLinks: [
          {
            platform: 'leetcode',
            username: 'alex_rivera',
            profileUrl: 'https://leetcode.com/alex_rivera/',
            addedAt: new Date(),
          },
          {
            platform: 'codechef',
            username: 'alexrivera',
            profileUrl: 'https://www.codechef.com/users/alexrivera',
            addedAt: new Date(),
          },
        ],
        codingStats: [
          {
            platform: 'leetcode',
            username: 'alex_rivera',
            profileUrl: 'https://leetcode.com/alex_rivera/',
            rating: 1845,
            maxRating: 1890,
            totalSolved: 342,
            easySolved: 140,
            mediumSolved: 168,
            hardSolved: 34,
            contestsAttended: 14,
            rank: 45210,
            source: 'live',
            status: 'ok',
            fetchedAt: new Date(),
            activity: [
              { date: '2026-10-10', solved: 3 },
              { date: '2026-10-12', solved: 5 },
              { date: '2026-10-14', solved: 2 },
              { date: '2026-10-16', solved: 4 },
              { date: '2026-10-18', solved: 6 },
            ],
            ratingHistory: [
              { date: '2026-06-01', rating: 1650 },
              { date: '2026-07-15', rating: 1720 },
              { date: '2026-08-20', rating: 1780 },
              { date: '2026-09-30', rating: 1845 },
            ],
          },
          {
            platform: 'codechef',
            username: 'alexrivera',
            profileUrl: 'https://www.codechef.com/users/alexrivera',
            rating: 1720,
            maxRating: 1755,
            totalSolved: 118,
            source: 'live',
            status: 'ok',
            fetchedAt: new Date(),
          },
        ],
        notificationPreferences: {
          emailStatusUpdates: true,
          jobAlerts: true,
          jobAlertsMode: 'instant',
          minFitScore: 40,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Seed sample welcome notification
  const existingNotif = await Notification.findOne({ userId: candidate._id });
  if (!existingNotif) {
    await Notification.create({
      userId: candidate._id,
      type: 'new_job',
      title: 'Welcome to HireLens!',
      message: 'Connect your coding platforms in Profiles & Stats to auto-generate your verified profile file for applications.',
      link: '/candidate/profiles',
    });
  }

  const examples = [
    {
      title: 'Frontend Engineer',
      description: 'Build thoughtful web experiences with React and TypeScript. Work closely with design and backend teams. 2+ years preferred.',
      requiredSkills: ['React', 'JavaScript', 'CSS', 'TypeScript'],
      niceToHaveSkills: ['Node.js', 'Accessibility'],
      minExperience: 2,
    },
    {
      title: 'Node.js Platform Developer',
      description: 'Design dependable APIs and data services with Node.js, Express, and MongoDB. Familiarity with cloud services is a plus.',
      requiredSkills: ['Node.js', 'Express', 'MongoDB', 'REST APIs'],
      niceToHaveSkills: ['AWS', 'Docker'],
      minExperience: 3,
    },
  ];

  for (const j of examples) {
    await Job.findOneAndUpdate(
      { recruiterId: recruiter._id, title: j.title },
      {
        $set: {
          ...j,
          company: recruiter.company,
          status: 'open',
          weights: { skills: 35, projects: 30, certifications: 20, experience: 15 },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log('Seeded successfully.');
  console.log('Recruiter: recruiter@example.com / DemoPass123!');
  console.log('Candidate: candidate@example.com / DemoPass123!');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
