const mongoose = require('mongoose');

// ── LinkedIn info (self-reported) ────────────────────────────────────────────
const linkedInSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  headline: { type: String, default: '' },
  currentRole: { type: String, default: '' },
  skills: [String],
}, { _id: false });

// ── Coding platform link ─────────────────────────────────────────────────────
const platformLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['leetcode', 'hackerrank', 'codechef', 'github'],
    required: true,
  },
  username: { type: String, required: true, trim: true },
  profileUrl: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

// ── Per-day activity point ────────────────────────────────────────────────────
const activityPointSchema = new mongoose.Schema({
  date: String,
  solved: Number,
}, { _id: false });

// ── Rating history point ──────────────────────────────────────────────────────
const ratingPointSchema = new mongoose.Schema({
  date: String,
  rating: Number,
}, { _id: false });

// ── Coding stats snapshot (one per platform) ──────────────────────────────────
const codingStatsSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  username: { type: String, required: true },
  profileUrl: { type: String, default: '' },
  rating: { type: Number, default: null },
  maxRating: { type: Number, default: null },
  totalSolved: { type: Number, default: null },
  easySolved: { type: Number, default: null },
  mediumSolved: { type: Number, default: null },
  hardSolved: { type: Number, default: null },
  contestsAttended: { type: Number, default: null },
  rank: { type: Number, default: null },
  activity: [activityPointSchema],
  ratingHistory: [ratingPointSchema],
  fetchedAt: { type: Date, default: null },
  lastRefreshRequestedAt: { type: Date, default: null },
  source: { type: String, enum: ['live', 'cache', 'manual'], default: 'live' },
  status: { type: String, enum: ['ok', 'partial', 'failed'], default: 'ok' },
  error: { type: String, default: '' },
  note: { type: String, default: '' },
  // manual overrides (when status=failed or source=manual)
  manualOverride: {
    rating: { type: Number, default: null },
    totalSolved: { type: Number, default: null },
    easySolved: { type: Number, default: null },
    mediumSolved: { type: Number, default: null },
    hardSolved: { type: Number, default: null },
    contestsAttended: { type: Number, default: null },
    activity: [activityPointSchema],
    updatedAt: { type: Date, default: null },
  },
}, { _id: false });

// ── Main UserProfile document ─────────────────────────────────────────────────
const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  linkedin: { type: linkedInSchema, default: () => ({}) },
  // Coding platform links (one per platform max)
  platformLinks: [platformLinkSchema],
  // Cached coding stats (one per linked platform)
  codingStats: [codingStatsSchema],
  // Notification preferences
  notificationPreferences: {
    emailStatusUpdates: { type: Boolean, default: true },
    jobAlerts: { type: Boolean, default: true },
    jobAlertsMode: { type: String, enum: ['instant', 'digest', 'off'], default: 'instant' },
    minFitScore: { type: Number, default: 40, min: 0, max: 100 },
  },
}, { timestamps: true });

// Helper to find a specific platform's stats
userProfileSchema.methods.getStats = function (platform) {
  return this.codingStats.find(s => s.platform === platform) || null;
};

// Helper to find a specific platform link
userProfileSchema.methods.getLink = function (platform) {
  return this.platformLinks.find(l => l.platform === platform) || null;
};

module.exports = mongoose.model('UserProfile', userProfileSchema);
