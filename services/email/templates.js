/**
 * Email HTML/text templates for all notification types.
 * Uses a single branded layout with HireLens design system colors.
 */

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

function baseLayout(title, bodyHtml, previewText = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="x-apple-disable-message-reformatting" />
</head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:#1a6b5e;padding:24px 40px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.04em;">HireLens</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${bodyHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;background:#f7f5f0;border-top:1px solid #e8e4dc;">
          <p style="margin:0;font-size:12px;color:#8a8a8a;">
            You received this email because you have an active HireLens account.
            <a href="${BASE_URL}/candidate/settings" style="color:#1a6b5e;">Manage email preferences</a>
            &nbsp;·&nbsp;
            <a href="${BASE_URL}" style="color:#1a6b5e;">Visit HireLens</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1a1a1a;font-family:Georgia,serif;">${text}</h1>`;
}

function para(text) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">${text}</p>`;
}

function cta(text, url) {
  return `<a href="${url}" style="display:inline-block;margin:24px 0 0;padding:14px 32px;background:#1a6b5e;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">${text} →</a>`;
}

function infoBox(label, value) {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#888;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#1a1a1a;">${value}</td>
  </tr>`;
}

// ── Template 1: Shortlisted ───────────────────────────────────────────────────
function shortlistedEmail({ candidateName, jobTitle, company, recruiterNote, applicationLink }) {
  const firstName = (candidateName || '').split(' ')[0] || 'there';
  const appUrl = applicationLink || `${BASE_URL}/candidate/applications`;
  const noteSection = recruiterNote
    ? `<div style="margin:20px 0;padding:16px;background:#f0faf7;border-left:3px solid #1a6b5e;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#2d6e63;">${recruiterNote}</p>
      </div>`
    : '';

  const html = baseLayout('You\'ve been shortlisted! 🎉', `
    ${heading(`Great news, ${firstName}! 🎉`)}
    ${para(`You've been <strong>shortlisted</strong> for the following position:`)}
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;border:1px solid #e8e4dc;border-radius:10px;overflow:hidden;">
      ${infoBox('Role', jobTitle || 'Position')}
      ${infoBox('Company', company || 'Company')}
    </table>
    ${noteSection}
    ${para('The hiring team has reviewed your application and wants to move forward. Check your application for the next steps.')}
    ${cta('View my application', appUrl)}
  `, `You've been shortlisted for ${jobTitle} at ${company}`);

  const text = `Hi ${firstName},\n\nGreat news — you've been shortlisted for ${jobTitle} at ${company}!\n\n${recruiterNote ? `Note from recruiter: ${recruiterNote}\n\n` : ''}View your application: ${appUrl}\n\n— The HireLens Team`;

  return { subject: `🎉 You've been shortlisted for ${jobTitle} at ${company}`, html, text };
}

// ── Template 2: Rejected ──────────────────────────────────────────────────────
function rejectedEmail({ candidateName, jobTitle, company, recruiterNote, browseLink }) {
  const firstName = (candidateName || '').split(' ')[0] || 'there';
  const browseUrl = browseLink || `${BASE_URL}/candidate/jobs`;
  const noteSection = recruiterNote
    ? `<div style="margin:20px 0;padding:16px;background:#fef6f3;border-left:3px solid #e05c3a;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#8b3a20;">${recruiterNote}</p>
      </div>`
    : '';

  const html = baseLayout('Application update', `
    ${heading(`Hi ${firstName},`)}
    ${para(`Thank you for your interest in the <strong>${jobTitle}</strong> role at <strong>${company}</strong>. After careful consideration, the team has decided to move forward with other candidates at this time.`)}
    ${noteSection}
    ${para('We encourage you to continue applying — there are many open roles that may be a great fit for your background.')}
    ${cta('Browse open jobs', browseUrl)}
  `, `Application update for ${jobTitle} at ${company}`);

  const text = `Hi ${firstName},\n\nThank you for applying to ${jobTitle} at ${company}. Unfortunately, the team has decided to move forward with other candidates at this time.\n\n${recruiterNote ? `Feedback: ${recruiterNote}\n\n` : ''}Browse more open roles: ${browseUrl}\n\n— The HireLens Team`;

  return { subject: `Application update: ${jobTitle} at ${company}`, html, text };
}

// ── Template 3: New job posted ────────────────────────────────────────────────
function newJobEmail({ candidateName, jobTitle, company, jobDescription, jobLink, fitScore }) {
  const firstName = (candidateName || '').split(' ')[0] || 'there';
  const url = jobLink || `${BASE_URL}/candidate/jobs`;

  const fitBadge = fitScore
    ? `<span style="display:inline-block;padding:3px 10px;background:#f0faf7;border:1px solid #1a6b5e;border-radius:20px;font-size:12px;font-weight:600;color:#1a6b5e;">~${fitScore}% fit</span>`
    : '';

  const html = baseLayout('New job matching your profile', `
    ${heading(`Hi ${firstName}, a new role just posted!`)}
    <div style="padding:20px;border:1px solid #e8e4dc;border-radius:12px;margin-bottom:20px;">
      <div style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${jobTitle} ${fitBadge}</div>
      <div style="font-size:14px;color:#888;margin-bottom:12px;">${company}</div>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.5;">${(jobDescription || '').slice(0, 250)}…</p>
    </div>
    ${cta('View & apply', url)}
  `, `New job: ${jobTitle} at ${company}`);

  const text = `Hi ${firstName},\n\nA new job matching your profile was just posted:\n\n${jobTitle} at ${company}${fitScore ? ` (~${fitScore}% fit)` : ''}\n\n${(jobDescription || '').slice(0, 300)}\n\nApply here: ${url}\n\n— The HireLens Team`;

  return { subject: `New job match: ${jobTitle} at ${company}`, html, text };
}

// ── Template 4: Application received ─────────────────────────────────────────
function applicationReceivedEmail({ candidateName, jobTitle, company, applicationLink }) {
  const firstName = (candidateName || '').split(' ')[0] || 'there';
  const appUrl = applicationLink || `${BASE_URL}/candidate/applications`;

  const html = baseLayout('Application received', `
    ${heading(`Application received, ${firstName}!`)}
    ${para(`Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been received and is under review.`)}
    ${para('You\'ll hear back here and by email when there\'s an update on your status.')}
    ${cta('Track my application', appUrl)}
  `, `Application confirmed: ${jobTitle}`);

  const text = `Hi ${firstName},\n\nYour application for ${jobTitle} at ${company} has been received!\n\nTrack it here: ${appUrl}\n\n— The HireLens Team`;

  return { subject: `Application received: ${jobTitle} at ${company}`, html, text };
}

// ── Template 5: Registration Welcome Email ──────────────────────────────────
function welcomeEmail({ name, email, role, company }) {
  const firstName = (name || '').split(' ')[0] || 'there';
  const roleLabel = role === 'recruiter' ? 'Recruiter' : 'Candidate';
  const nextStepUrl = role === 'recruiter' ? `${BASE_URL}/recruiter` : `${BASE_URL}/candidate/jobs`;
  const nextStepLabel = role === 'recruiter' ? 'Go to Recruiter Dashboard' : 'Explore Open Roles';

  const html = baseLayout(`Welcome to HireLens, ${firstName}! 🎉`, `
    ${heading(`Welcome to HireLens, ${firstName}! 👋`)}
    ${para(`Thank you for registering your <strong>${roleLabel}</strong> account on HireLens.`)}
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;border:1px solid #e8e4dc;border-radius:10px;overflow:hidden;">
      ${infoBox('Account Name', name || 'Candidate')}
      ${infoBox('Registered Email', email)}
      ${infoBox('Role', roleLabel)}
      ${company ? infoBox('Company', company) : ''}
    </table>
    ${para(role === 'recruiter'
      ? 'You can now post jobs, configure precision skill weights, and review ranked applicant profiles.'
      : 'You can now browse open roles, connect your coding platform profiles (LeetCode, HackerRank, GitHub, CodeChef), and apply with verified credentials.')}
    ${cta(nextStepLabel, nextStepUrl)}
  `, `Welcome to HireLens, ${firstName}!`);

  const text = `Hi ${firstName},\n\nWelcome to HireLens!\n\nYour ${roleLabel} account (${email}) is all set up.\n\n${role === 'recruiter' ? 'Post jobs and review applicants: ' + nextStepUrl : 'Browse roles and apply: ' + nextStepUrl}\n\n— The HireLens Team`;

  return { subject: `Welcome to HireLens, ${firstName}! 🎉`, html, text };
}

module.exports = {
  shortlistedEmail,
  rejectedEmail,
  newJobEmail,
  applicationReceivedEmail,
  welcomeEmail,
};
