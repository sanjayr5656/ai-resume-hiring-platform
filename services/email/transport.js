/**
 * Nodemailer transport with dev-mode fallback.
 * If SMTP is not configured, emails are logged to console and saved in EmailLog collection.
 */
const nodemailer = require('nodemailer');

let _transport = null;
let _etherealPromise = null;

async function getTransport() {
  if (_transport) return _transport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    const isGmail = host === 'smtp.gmail.com' || (user && user.endsWith('@gmail.com'));
    if (isGmail) {
      _transport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      _transport = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
      });
    }
    return _transport;
  }

  // Dev mode: Auto-initialize Ethereal test transporter if no credentials supplied
  if (!_etherealPromise) {
    _etherealPromise = nodemailer.createTestAccount().then(account => {
      console.log(`[Email] Initialized test SMTP inbox (Ethereal): ${account.user}`);
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    }).catch(err => {
      console.warn('[Email] Could not create Ethereal account, falling back to console logger:', err.message);
      return null;
    });
  }

  _transport = await _etherealPromise;
  return _transport;
}

module.exports = { getTransport };
