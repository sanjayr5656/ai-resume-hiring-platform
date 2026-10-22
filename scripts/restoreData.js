/**
 * restoreData.js – HireLens data restore utility
 *
 * Usage:
 *   node scripts/restoreData.js <backup-folder>
 *   npm run reset:restore -- backups/2026-10-21T09-00-00
 *
 * Restores all JSON exports back into MongoDB and copies uploaded files back.
 * Does NOT overwrite existing documents with the same _id — uses upsert.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const backupArg = process.argv[2];
if (!backupArg) {
  console.error('Usage: node scripts/restoreData.js <backup-folder>');
  process.exit(1);
}

const BACKUP_DIR = path.resolve(backupArg);
if (!fs.existsSync(BACKUP_DIR)) {
  console.error(`ERROR: Backup folder not found: ${BACKUP_DIR}`);
  process.exit(1);
}

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

const Application = require('../models/Application');
const Notification = require('../models/Notification');
const UserProfile = require('../models/UserProfile');
let EmailLog; try { EmailLog = require('../models/EmailLog'); } catch {}
let Job; try { Job = require('../models/Job'); } catch {}
let User; try { User = require('../models/User'); } catch {}

const MODEL_MAP = {
  'applications.json': Application,
  'notifications.json': Notification,
  'user_profiles.json': UserProfile,
  'email_logs.json': EmailLog,
  'jobs.json': Job,
  'users.json': User,
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function listFilesRecursive(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) results.push(...listFilesRecursive(full));
    else if (entry.isFile()) results.push(full);
  }
  return results;
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI || '';
  if (!MONGO_URI) { console.error('ERROR: MONGO_URI not set'); process.exit(1); }

  await mongoose.connect(MONGO_URI);
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  HireLens Data Restore Utility');
  console.log(`  Restoring from: ${BACKUP_DIR}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Restore JSON collections
  for (const [filename, Model] of Object.entries(MODEL_MAP)) {
    if (!Model) continue;
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    try {
      const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(docs) || docs.length === 0) {
        console.log(`  Skipping ${filename} (empty)`);
        continue;
      }

      let upserted = 0;
      for (const doc of docs) {
        try {
          await Model.findByIdAndUpdate(doc._id, { $setOnInsert: doc }, { upsert: true, new: false });
          upserted++;
        } catch {}
      }
      console.log(`  Restored ${upserted}/${docs.length} ${filename} documents`);
    } catch (e) {
      console.warn(`  Warning: could not restore ${filename}: ${e.message}`);
    }
  }

  // Restore uploaded files
  const backupUploadsDir = path.join(BACKUP_DIR, 'uploads');
  if (fs.existsSync(backupUploadsDir)) {
    const files = listFilesRecursive(backupUploadsDir);
    let restored = 0;
    let restoredBytes = 0;
    for (const f of files) {
      const rel = path.relative(backupUploadsDir, f);
      const dest = path.join(UPLOADS_DIR, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      try {
        if (!fs.existsSync(dest)) {
          const size = fs.statSync(f).size;
          fs.copyFileSync(f, dest);
          restored++;
          restoredBytes += size;
        }
      } catch (e) {
        console.warn(`  Warning: could not restore file ${f}: ${e.message}`);
      }
    }
    console.log(`  Restored ${restored} uploaded file(s) (${formatBytes(restoredBytes)})`);
  } else {
    console.log('  No uploads/ folder in backup.');
  }

  console.log('\n  Restore complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\n  ERROR:', err.message || err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
