/**
 * resetData.js – HireLens data-reset utility
 *
 * Usage:
 *   node scripts/resetData.js                      # same as --preview
 *   node scripts/resetData.js --preview            # list what would be deleted
 *   node scripts/resetData.js --confirm            # run reset (prompts for DB name)
 *   node scripts/resetData.js --confirm --include-jobs
 *   node scripts/resetData.js --confirm --include-users
 *   node scripts/resetData.js --confirm --include-jobs --include-users
 *   node scripts/resetData.js --confirm --force-remote  # allow non-localhost URIs
 *
 * Safe-guards:
 *   - Refuses to run when NODE_ENV=production (unless --force-remote is passed).
 *   - Refuses when MONGO_URI points to a non-localhost host (unless --force-remote).
 *   - Requires --confirm to make any change; otherwise only previews.
 *   - Requires typing the database name before proceeding.
 *   - Creates a full backup before deleting anything.
 *   - Never deletes files outside the uploads/ folder.
 *   - Never follows symlinks.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const IS_PREVIEW = !args.includes('--confirm');
const INCLUDE_JOBS = args.includes('--include-jobs');
const INCLUDE_USERS = args.includes('--include-users');
const FORCE_REMOTE = args.includes('--force-remote');

// ── Safety checks ─────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || '';
if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not set in .env');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !FORCE_REMOTE) {
  console.error('ERROR: Refusing to run in production. Pass --force-remote to override.');
  process.exit(1);
}

function isLocalhost(uri) {
  try {
    const u = new URL(uri);
    return ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  } catch {
    return /localhost|127\.0\.0\.1/.test(uri);
  }
}

if (!isLocalhost(MONGO_URI) && !FORCE_REMOTE) {
  console.error('ERROR: MONGO_URI does not point to localhost/127.0.0.1.');
  console.error('Pass --force-remote to allow resets on remote databases.');
  process.exit(1);
}

// ── Load models after dotenv ──────────────────────────────────────────────────
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const UserProfile = require('../models/UserProfile');

let EmailLog;
try { EmailLog = require('../models/EmailLog'); } catch {}
let Job;
if (INCLUDE_JOBS) { try { Job = require('../models/Job'); } catch {} }
let User;
if (INCLUDE_USERS) { try { User = require('../models/User'); } catch {} }

// ── Helpers ───────────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

function safeResolvePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const resolved = path.resolve(filePath);
  try {
    const lstat = fs.lstatSync(resolved);
    if (lstat.isSymbolicLink()) return null;
  } catch {
    return null;
  }
  if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) return null;
  return resolved;
}

function listFilesRecursive(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function getDbName(uri) {
  try {
    const u = new URL(uri);
    return u.pathname.replace(/^\//, '') || 'unknown';
  } catch {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'unknown';
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  HireLens Data Reset Utility');
  console.log('═══════════════════════════════════════════════════════════\n');

  const dbName = getDbName(MONGO_URI);

  // ── Count documents ─────────────────────────────────────────────────────────
  const appCount = await Application.countDocuments();
  const notifCount = await Notification.countDocuments();
  let emailLogCount = 0;
  try { emailLogCount = await EmailLog.countDocuments(); } catch {}

  const totalProfileDocs = await UserProfile.countDocuments();
  const profileWithStats = await UserProfile.countDocuments({ 'codingStats.0': { $exists: true } });

  const jobCount = (INCLUDE_JOBS && Job) ? await Job.countDocuments() : 0;
  const userCount = (INCLUDE_USERS && User) ? await User.countDocuments() : 0;

  // ── Count disk files ────────────────────────────────────────────────────────
  const allFiles = listFilesRecursive(UPLOADS_DIR);
  const totalFileSize = allFiles.reduce((sum, f) => {
    try { return sum + fs.statSync(f).size; } catch { return sum; }
  }, 0);

  // ── Print preview ───────────────────────────────────────────────────────────
  console.log(`  Database:     ${dbName}`);
  console.log(`  Mode:         ${IS_PREVIEW ? 'PREVIEW (no changes)' : 'RESET (will delete)'}`);
  console.log('');
  console.log('  Collections that WILL be cleared:');
  console.log(`    applications              ${appCount} document(s)`);
  console.log(`    notifications             ${notifCount} document(s)`);
  console.log(`    email_logs                ${emailLogCount} document(s)`);
  console.log(`    user_profiles (coding stats only — ${profileWithStats} with stats / ${totalProfileDocs} total profiles)`);
  if (INCLUDE_JOBS && Job) console.log(`    jobs                      ${jobCount} document(s)  [--include-jobs]`);
  if (INCLUDE_USERS && User) console.log(`    users                     ${userCount} document(s)  [--include-users]`);
  console.log('');
  console.log(`  Uploaded files on disk: ${allFiles.length} file(s), ${formatBytes(totalFileSize)} total`);
  console.log('    (uploads/ folder kept, files deleted)');
  console.log('');
  console.log('  PRESERVED (default):');
  const kept = [];
  if (!INCLUDE_JOBS) kept.push('jobs');
  if (!INCLUDE_USERS) kept.push('users');
  kept.push('user notification preferences', 'LinkedIn & platform links');
  console.log('   ', kept.join(', '));
  console.log('');

  if (IS_PREVIEW) {
    console.log('  Run "npm run reset:data -- --confirm" to execute the reset.');
    console.log('═══════════════════════════════════════════════════════════\n');
    await mongoose.disconnect();
    return;
  }

  // ── Confirm: type the database name ─────────────────────────────────────────
  console.log('  WARNING: This will permanently delete data listed above (after backup).');
  const typed = await ask(`  Type the database name "${dbName}" to confirm: `);
  if (typed.trim() !== dbName) {
    console.log('\n  Aborted: database name did not match.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Backup ───────────────────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve(__dirname, '..', 'backups', timestamp);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`\n  Creating backup in: ${backupDir}`);

  const collectionsToBackup = [
    ['applications', Application],
    ['notifications', Notification],
    ['user_profiles', UserProfile],
  ];
  if (EmailLog) collectionsToBackup.push(['email_logs', EmailLog]);
  if (INCLUDE_JOBS && Job) collectionsToBackup.push(['jobs', Job]);
  if (INCLUDE_USERS && User) collectionsToBackup.push(['users', User]);

  for (const [name, Model] of collectionsToBackup) {
    const docs = await Model.find().lean();
    fs.writeFileSync(
      path.join(backupDir, `${name}.json`),
      JSON.stringify(docs, null, 2)
    );
    console.log(`    Backed up ${docs.length} ${name}`);
  }

  // Backup uploads folder
  const uploadsBackupDir = path.join(backupDir, 'uploads');
  fs.mkdirSync(uploadsBackupDir, { recursive: true });
  let copiedFiles = 0;
  for (const f of allFiles) {
    const rel = path.relative(UPLOADS_DIR, f);
    const dest = path.join(uploadsBackupDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      fs.copyFileSync(f, dest);
      copiedFiles++;
    } catch (e) {
      console.warn(`    Warning: could not copy ${f}: ${e.message}`);
    }
  }
  console.log(`    Backed up ${copiedFiles} uploaded file(s)`);
  console.log('  Backup complete.\n');

  // ── Delete ────────────────────────────────────────────────────────────────────
  console.log('  Deleting data...');

  await Application.deleteMany({});
  console.log(`    Deleted ${appCount} application(s)`);

  await Notification.deleteMany({});
  console.log(`    Deleted ${notifCount} notification(s)`);

  if (EmailLog) {
    try {
      await EmailLog.deleteMany({});
      console.log(`    Deleted ${emailLogCount} email log(s)`);
    } catch {}
  }

  // Clear coding stats in UserProfiles (preserve linkedin/platformLinks/preferences)
  await UserProfile.updateMany({}, { $set: { codingStats: [] } });
  console.log(`    Cleared coding stats in ${totalProfileDocs} user profile(s)`);

  if (INCLUDE_JOBS && Job) {
    await Job.deleteMany({});
    console.log(`    Deleted ${jobCount} job(s)`);
  }
  if (INCLUDE_USERS && User) {
    await User.deleteMany({});
    await UserProfile.deleteMany({});
    console.log(`    Deleted ${userCount} user(s) + all user profiles`);
  }

  // Delete uploaded files (keep folder + .gitkeep)
  let deletedFiles = 0;
  let deletedBytes = 0;
  for (const f of allFiles) {
    const safe = safeResolvePath(f);
    if (!safe) { console.warn(`    Skipping unsafe path: ${f}`); continue; }
    try {
      const stat = fs.statSync(safe);
      deletedBytes += stat.size;
      fs.unlinkSync(safe);
      deletedFiles++;
    } catch (e) {
      console.warn(`    Warning: could not delete ${f}: ${e.message}`);
    }
  }

  // Ensure .gitkeep exists in uploads/
  const gitkeep = path.join(UPLOADS_DIR, '.gitkeep');
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');

  console.log(`    Deleted ${deletedFiles} uploaded file(s) (${formatBytes(deletedBytes)})`);

  console.log('\n  Reset complete!');
  console.log(`  Backup saved to: ${backupDir}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\n  ERROR:', err.message || err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
