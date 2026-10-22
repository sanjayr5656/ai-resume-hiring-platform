/**
 * In-app notification service.
 * Creates Notification documents and (optionally) sends emails
 * based on user preferences.
 */
const Notification = require('../models/Notification');
const UserProfile = require('../models/UserProfile');
const { enqueueEmail } = require('./email/sender');
const {
  shortlistedEmail,
  rejectedEmail,
  newJobEmail,
  applicationReceivedEmail,
} = require('./email/templates');

async function getPrefs(userId) {
  const profile = await UserProfile.findOne({ userId });
  return profile?.notificationPreferences || {
    emailStatusUpdates: true,
    jobAlerts: true,
    jobAlertsMode: 'instant',
    minFitScore: 40,
  };
}

// ── Create an in-app notification ─────────────────────────────────────────────
async function createNotification(userId, { type, title, message, link = '' }) {
  try {
    await Notification.create({ userId, type, title, message, link });
  } catch (err) {
    console.error('[Notifications] Failed to create notification:', err.message);
  }
}

// ── Shortlisted ────────────────────────────────────────────────────────────────
async function notifyShortlisted({ candidate, jobTitle, company, recruiterNote, applicationId }) {
  const link = `/candidate/applications`;
  await createNotification(candidate._id, {
    type: 'shortlisted',
    title: `🎉 You've been shortlisted!`,
    message: `Congratulations! You've been shortlisted for ${jobTitle} at ${company}.`,
    link,
  });

  const prefs = await getPrefs(candidate._id);
  if (prefs.emailStatusUpdates) {
    const template = shortlistedEmail({
      candidateName: candidate.name,
      jobTitle,
      company,
      recruiterNote,
      applicationLink: `${process.env.APP_BASE_URL || 'http://localhost:5173'}${link}`,
    });
    await enqueueEmail({
      to: candidate.email,
      ...template,
      idempotencyKey: `shortlisted-${applicationId}`,
    });
  }
}

// ── Rejected ──────────────────────────────────────────────────────────────────
async function notifyRejected({ candidate, jobTitle, company, recruiterNote, applicationId }) {
  const link = `/candidate/jobs`;
  await createNotification(candidate._id, {
    type: 'rejected',
    title: `Application update`,
    message: `We appreciate your interest in ${jobTitle} at ${company}. The team has moved forward with other candidates.`,
    link,
  });

  const prefs = await getPrefs(candidate._id);
  if (prefs.emailStatusUpdates) {
    const template = rejectedEmail({
      candidateName: candidate.name,
      jobTitle,
      company,
      recruiterNote,
      browseLink: `${process.env.APP_BASE_URL || 'http://localhost:5173'}${link}`,
    });
    await enqueueEmail({
      to: candidate.email,
      ...template,
      idempotencyKey: `rejected-${applicationId}`,
    });
  }
}

// ── Application received ──────────────────────────────────────────────────────
async function notifyApplicationReceived({ candidate, jobTitle, company, applicationId }) {
  const link = `/candidate/applications`;
  await createNotification(candidate._id, {
    type: 'application_received',
    title: `Application submitted`,
    message: `Your application for ${jobTitle} at ${company} has been received.`,
    link,
  });

  const prefs = await getPrefs(candidate._id);
  if (prefs.emailStatusUpdates) {
    const template = applicationReceivedEmail({
      candidateName: candidate.name,
      jobTitle,
      company,
      applicationLink: `${process.env.APP_BASE_URL || 'http://localhost:5173'}${link}`,
    });
    await enqueueEmail({
      to: candidate.email,
      ...template,
      idempotencyKey: `app-received-${applicationId}`,
    });
  }
}

// ── New job posted ─────────────────────────────────────────────────────────────
async function notifyNewJob({ candidates, job }) {
  for (const { candidate, fitScore } of candidates) {
    const prefs = await getPrefs(candidate._id);
    if (!prefs.jobAlerts || prefs.jobAlertsMode === 'off') continue;
    if (fitScore < (prefs.minFitScore || 40)) continue;

    const link = `/candidate/jobs/${job._id}`;
    await createNotification(candidate._id, {
      type: 'new_job',
      title: `New job: ${job.title}`,
      message: `A new role at ${job.company} matches your profile (${fitScore}% fit).`,
      link,
    });

    if (prefs.jobAlertsMode === 'instant') {
      const template = newJobEmail({
        candidateName: candidate.name,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        jobLink: `${process.env.APP_BASE_URL || 'http://localhost:5173'}${link}`,
        fitScore,
      });
      await enqueueEmail({
        to: candidate.email,
        ...template,
        idempotencyKey: `new-job-${job._id}-${candidate._id}`,
      });
    }
    // 'digest' mode: notifications created above; digest emails handled by scheduled job (out of scope for MVP)
  }
}

module.exports = {
  notifyShortlisted,
  notifyRejected,
  notifyApplicationReceived,
  notifyNewJob,
  createNotification,
};
