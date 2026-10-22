const mongoose = require('mongoose');

// Email log for dev-mode (no SMTP configured) and delivery tracking
const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  html: { type: String },
  text: { type: String },
  status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  sentAt: { type: Date, default: null },
  idempotencyKey: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now },
});

emailLogSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
