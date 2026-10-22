require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Profile = mongoose.model('UserProfile', new mongoose.Schema({}, { strict: false }));
  const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }));
  const EmailLog = mongoose.model('EmailLog', new mongoose.Schema({}, { strict: false }));

  console.log('=== USERS ===');
  const users = await User.find({}).sort({ createdAt: -1 }).limit(5);
  console.log(users.map(u => ({ id: u._id, email: u.email, role: u.role, name: u.name })));

  console.log('=== PROFILES WITH PLATFORMS ===');
  const profiles = await Profile.find({});
  for (const p of profiles) {
    if (p.codingPlatforms && p.codingPlatforms.length > 0) {
      console.log(`User ${p.userId} platforms:`, JSON.stringify(p.codingPlatforms, null, 2));
    }
  }

  console.log('=== RECENT APPLICATIONS ===');
  const apps = await Application.find({}).sort({ createdAt: -1 }).limit(5);
  console.log(apps.map(a => ({
    id: a._id,
    email: a.email,
    candidateName: a.candidateName || a.name,
    status: a.status,
    jobTitle: a.jobTitle,
    platforms: a.codingPlatformsSnapshot
  })));

  console.log('=== EMAIL LOGS ===');
  const emails = await EmailLog.find({}).sort({ createdAt: -1 }).limit(10);
  console.log(emails.map(e => ({
    id: e._id,
    to: e.to,
    template: e.template,
    status: e.status,
    subject: e.subject,
    idempotencyKey: e.idempotencyKey,
    error: e.error,
    sentAt: e.sentAt,
    createdAt: e.createdAt
  })));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
