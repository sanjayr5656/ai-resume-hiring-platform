/**
 * Email sender with background queue, retries, idempotency, and dev-mode fallback.
 * Request handlers call enqueueEmail() and immediately return — the actual
 * send happens asynchronously so request latency is never blocked by email.
 */
const { getTransport } = require('./transport');
const EmailLog = require('../../models/EmailLog');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Simple in-process queue (survives server restarts only if stored in DB; for production use Bull/BullMQ)
const queue = [];
let processing = false;

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  const item = queue.shift();
  try {
    await attemptSend(item.logId, 0);
  } catch { /* errors handled inside attemptSend */ }

  processing = false;
  if (queue.length > 0) setImmediate(processQueue);
}

async function attemptSend(logId, attempt) {
  let log;
  try {
    log = await EmailLog.findById(logId);
    if (!log) return;

    const transport = await getTransport();

    if (!transport) {
      // Fallback dev mode: log to console, mark as sent
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n──── [EMAIL DEV LOG] ────────────────────────────────────────');
        console.log(`To:      ${log.to}`);
        console.log(`Subject: ${log.subject}`);
        console.log(`Body:\n${log.text || '(html only)'}`);
        console.log('────────────────────────────────────────────────────────────\n');
      }
      log.status = 'sent';
      log.sentAt = new Date();
      log.attempts = attempt + 1;
      await log.save();
      return;
    }

    const info = await transport.sendMail({
      from: process.env.MAIL_FROM || 'HireLens <noreply@hirelens.app>',
      to: log.to,
      subject: log.subject,
      html: log.html,
      text: log.text,
    });

    const previewUrl = require('nodemailer').getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`\n📧 [EMAIL DELIVERED] Preview test email for ${log.to} at: ${previewUrl}\n`);
    }

    log.status = 'sent';
    log.sentAt = new Date();
    log.attempts = attempt + 1;
    await log.save();
  } catch (err) {
    const attempts = attempt + 1;
    if (log) {
      log.attempts = attempts;
      log.lastError = String(err.message || err).slice(0, 500);
    }

    if (attempts < MAX_RETRIES) {
      // Retry with backoff
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempts));
      return attemptSend(logId, attempts);
    }

    if (log) {
      log.status = 'failed';
      await log.save();
    }
    console.error(`[Email] Failed to send after ${attempts} attempts to ${log?.to || '?'}: ${err.message}`);
  }
}

/**
 * Queue an email for sending.
 * @param {{ to: string, subject: string, html?: string, text?: string, idempotencyKey?: string }} opts
 */
async function enqueueEmail(opts) {
  const { to, subject, html, text, idempotencyKey } = opts;

  // Idempotency check
  if (idempotencyKey) {
    const existing = await EmailLog.findOne({ idempotencyKey });
    if (existing && existing.status !== 'failed') {
      return; // Already sent or queued
    }
  }

  let log;
  try {
    log = await EmailLog.create({
      to,
      subject,
      html: html || '',
      text: text || '',
      status: 'queued',
      idempotencyKey: idempotencyKey || '',
    });
  } catch (err) {
    console.error('[Email] Could not save email log:', err.message);
    return;
  }

  queue.push({ logId: log._id.toString() });
  setImmediate(processQueue);
}

module.exports = { enqueueEmail };
