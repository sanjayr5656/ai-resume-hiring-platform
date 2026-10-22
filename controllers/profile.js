/**
 * Profile controller – handles CRUD for profile links and coding stats.
 */
const UserProfile = require('../models/UserProfile');
const { fetchPlatformStats, SUPPORTED_PLATFORMS } = require('../services/codingPlatforms');

const TTL_HOURS = Number(process.env.CODING_STATS_TTL_HOURS || 6);
const COOLDOWN_MINUTES = Number(process.env.STATS_RATE_LIMIT_MINUTES || 60);

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Universal URL & username parser for all platforms
function parsePlatformInput(platform, input) {
  if (!input || typeof input !== 'string') return { username: '', profileUrl: '', valid: false };
  let str = input.trim();

  if (platform === 'github') {
    const match = str.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    const username = match ? match[1] : str.replace(/^@/, '').replace(/\/+$/, '');
    const valid = /^[a-zA-Z0-9_-]{1,39}$/.test(username);
    return {
      username,
      profileUrl: `https://github.com/${username}`,
      valid,
    };
  }

  if (platform === 'leetcode') {
    const match = str.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i);
    const username = match ? match[1] : str.replace(/^@/, '').replace(/\/+$/, '');
    const valid = /^[a-zA-Z0-9_-]{2,40}$/.test(username);
    return {
      username,
      profileUrl: `https://leetcode.com/${username}/`,
      valid,
    };
  }

  if (platform === 'hackerrank') {
    const match = str.match(/(?:https?:\/\/)?(?:www\.)?hackerrank\.com\/(?:profile\/)?([a-zA-Z0-9_-]+)/i);
    const username = match ? match[1] : str.replace(/^@/, '').replace(/\/+$/, '');
    const valid = /^[a-zA-Z0-9_-]{2,40}$/.test(username);
    return {
      username,
      profileUrl: `https://www.hackerrank.com/${username}`,
      valid,
    };
  }

  if (platform === 'codechef') {
    const match = str.match(/(?:https?:\/\/)?(?:www\.)?codechef\.com\/(?:users\/)?([a-zA-Z0-9_]+)/i);
    const username = match ? match[1] : str.replace(/^@/, '').replace(/\/+$/, '');
    const valid = /^[a-zA-Z0-9_]{2,40}$/.test(username);
    return {
      username,
      profileUrl: `https://www.codechef.com/users/${username}`,
      valid,
    };
  }

  if (platform === 'linkedin') {
    const valid = /linkedin\.com\//i.test(str);
    const profileUrl = /^https?:\/\//i.test(str) ? str : `https://${str}`;
    return { username: '', profileUrl, valid };
  }

  return { username: str, profileUrl: str, valid: Boolean(str) };
}

// Platform to profile URL builder (fallback)
const buildProfileUrl = (platform, username) => {
  return parsePlatformInput(platform, username).profileUrl;
};

/** Get or create UserProfile for the logged-in user */
async function getOrCreateProfile(userId) {
  let profile = await UserProfile.findOne({ userId });
  if (!profile) {
    profile = await UserProfile.create({ userId });
  }
  return profile;
}

// ── GET /api/profile ──────────────────────────────────────────────────────────
exports.getProfile = asyncRoute(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  res.json(profile);
});

// ── POST /api/profile/links ───────────────────────────────────────────────────
exports.addLink = asyncRoute(async (req, res) => {
  const { platform, username, url, headline, currentRole, skills } = req.body;
  const rawInput = String(url || username || '').trim();

  if (platform === 'linkedin') {
    const parsed = parsePlatformInput('linkedin', rawInput);
    if (!parsed.valid) {
      return res.status(400).json({ error: 'Please enter a valid LinkedIn URL (https://www.linkedin.com/in/...)' });
    }
    const profile = await getOrCreateProfile(req.user._id);
    profile.linkedin = {
      url: parsed.profileUrl,
      headline: String(headline || '').trim().slice(0, 200),
      currentRole: String(currentRole || '').trim().slice(0, 200),
      skills: Array.isArray(skills) ? skills.map(s => String(s).trim()).filter(Boolean).slice(0, 30) : [],
    };
    await profile.save();
    return res.json(profile);
  }

  if (platform === 'github') {
    const parsed = parsePlatformInput('github', rawInput);
    if (!parsed.valid) {
      return res.status(400).json({ error: 'Please enter a valid GitHub profile URL or username' });
    }
    const profile = await getOrCreateProfile(req.user._id);
    const existing = profile.platformLinks.find(l => l.platform === 'github');
    if (existing) {
      existing.username = parsed.username;
      existing.profileUrl = parsed.profileUrl;
    } else {
      profile.platformLinks.push({
        platform: 'github',
        username: parsed.username,
        profileUrl: parsed.profileUrl,
      });
    }
    await profile.save();
    return res.json(profile);
  }

  // Coding platforms
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }

  const parsed = parsePlatformInput(platform, rawInput);
  if (!parsed.valid) {
    return res.status(400).json({ error: `Please enter a valid ${platform} URL or username` });
  }

  const profile = await getOrCreateProfile(req.user._id);

  // Upsert platform link
  const existingLink = profile.platformLinks.find(l => l.platform === platform);
  if (existingLink) {
    existingLink.username = parsed.username;
    existingLink.profileUrl = parsed.profileUrl;
  } else {
    profile.platformLinks.push({
      platform,
      username: parsed.username,
      profileUrl: parsed.profileUrl,
    });
  }

  // Remove any stale stats for this platform so fresh ones replace them
  const statsIdx = profile.codingStats.findIndex(s => s.platform === platform);
  if (statsIdx !== -1) profile.codingStats.splice(statsIdx, 1);

  await profile.save();

  // Perform immediate live sync so candidate sees live stats right away on the website!
  try {
    await refreshPlatformStats(req.user._id, platform, parsed.username);
  } catch (err) {
    console.error(`[Profile] Live sync failed for ${platform}:`, err.message);
  }

  // Reload and return updated profile with live stats
  const freshProfile = await UserProfile.findOne({ userId: req.user._id });
  res.status(201).json(freshProfile || profile);
});

// ── PUT /api/profile/links/:platform ─────────────────────────────────────────
exports.updateLink = asyncRoute(async (req, res) => {
  const { platform } = req.params;
  const { username, url, headline, currentRole, skills } = req.body;

  const profile = await getOrCreateProfile(req.user._id);

  if (platform === 'linkedin') {
    profile.linkedin = {
      url: String(url || profile.linkedin?.url || '').trim(),
      headline: String(headline !== undefined ? headline : profile.linkedin?.headline || '').trim().slice(0, 200),
      currentRole: String(currentRole !== undefined ? currentRole : profile.linkedin?.currentRole || '').trim().slice(0, 200),
      skills: Array.isArray(skills) ? skills.map(s => String(s).trim()).filter(Boolean).slice(0, 30) : (profile.linkedin?.skills || []),
    };
    await profile.save();
    return res.json(profile);
  }

  const link = profile.platformLinks.find(l => l.platform === platform);
  if (!link) return res.status(404).json({ error: 'Platform link not found' });

  const rawInput = String(url || username || link.profileUrl || link.username).trim();
  const parsed = parsePlatformInput(platform, rawInput);
  if (!parsed.valid) {
    return res.status(400).json({ error: `Please enter a valid ${platform} URL or username` });
  }

  link.username = parsed.username;
  link.profileUrl = parsed.profileUrl;

  // Clear stale stats
  const statsIdx = profile.codingStats.findIndex(s => s.platform === platform);
  if (statsIdx !== -1) profile.codingStats.splice(statsIdx, 1);

  await profile.save();

  try {
    await refreshPlatformStats(req.user._id, platform, parsed.username);
  } catch (err) {
    console.error(`[Profile] Live sync failed on update for ${platform}:`, err.message);
  }

  const freshProfile = await UserProfile.findOne({ userId: req.user._id });
  res.json(freshProfile || profile);
});

// ── DELETE /api/profile/links/:platform ──────────────────────────────────────
exports.deleteLink = asyncRoute(async (req, res) => {
  const { platform } = req.params;
  const profile = await getOrCreateProfile(req.user._id);

  if (platform === 'linkedin') {
    profile.linkedin = {};
    await profile.save();
    return res.json(profile);
  }

  const idx = profile.platformLinks.findIndex(l => l.platform === platform);
  if (idx === -1) return res.status(404).json({ error: 'Platform link not found' });
  profile.platformLinks.splice(idx, 1);

  // Also remove stats
  const statsIdx = profile.codingStats.findIndex(s => s.platform === platform);
  if (statsIdx !== -1) profile.codingStats.splice(statsIdx, 1);

  await profile.save();
  res.json(profile);
});

// ── GET /api/profile/coding-stats ────────────────────────────────────────────
exports.getCodingStats = asyncRoute(async (req, res) => {
  const profile = await getOrCreateProfile(req.user._id);
  const ttlMs = TTL_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  // Auto-refresh stale stats (non-blocking, for next request)
  for (const link of profile.platformLinks) {
    if (['leetcode', 'hackerrank', 'codechef'].includes(link.platform)) {
      const stats = profile.codingStats.find(s => s.platform === link.platform);
      const fetchedAt = stats?.fetchedAt ? new Date(stats.fetchedAt).getTime() : 0;
      if (now - fetchedAt > ttlMs) {
        setImmediate(() => refreshPlatformStats(req.user._id, link.platform, link.username));
      }
    }
  }

  res.json(profile.codingStats);
});

// ── POST /api/profile/coding-stats/:platform/refresh ─────────────────────────
exports.refreshStats = asyncRoute(async (req, res) => {
  const { platform } = req.params;
  const profile = await getOrCreateProfile(req.user._id);

  const link = profile.platformLinks.find(l => l.platform === platform);
  if (!link) return res.status(404).json({ error: 'Platform not linked' });

  // Check cooldown
  const stats = profile.codingStats.find(s => s.platform === platform);
  const lastReq = stats?.lastRefreshRequestedAt ? new Date(stats.lastRefreshRequestedAt).getTime() : 0;
  const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
  if (Date.now() - lastReq < cooldownMs) {
    const remaining = Math.ceil((cooldownMs - (Date.now() - lastReq)) / 60000);
    return res.status(429).json({ error: `Please wait ${remaining} more minute(s) before refreshing again` });
  }

  // Mark request time immediately
  if (stats) {
    stats.lastRefreshRequestedAt = new Date();
  }
  await profile.save();

  // Do a synchronous refresh for this explicit request (user is waiting)
  const freshStats = await fetchPlatformStats(platform, link.username);
  await savePlatformStats(req.user._id, platform, freshStats);

  res.json(freshStats);
});

// ── PUT /api/profile/coding-stats/:platform/manual ───────────────────────────
exports.manualStats = asyncRoute(async (req, res) => {
  const { platform } = req.params;
  const { rating, totalSolved, easySolved, mediumSolved, hardSolved, contestsAttended, activity } = req.body;

  const profile = await getOrCreateProfile(req.user._id);
  const link = profile.platformLinks.find(l => l.platform === platform);
  if (!link) return res.status(404).json({ error: 'Platform not linked' });

  const existing = profile.codingStats.find(s => s.platform === platform);
  const override = {
    rating: rating !== undefined ? Number(rating) : (existing?.manualOverride?.rating ?? null),
    totalSolved: totalSolved !== undefined ? Number(totalSolved) : (existing?.manualOverride?.totalSolved ?? null),
    easySolved: easySolved !== undefined ? Number(easySolved) : (existing?.manualOverride?.easySolved ?? null),
    mediumSolved: mediumSolved !== undefined ? Number(mediumSolved) : (existing?.manualOverride?.mediumSolved ?? null),
    hardSolved: hardSolved !== undefined ? Number(hardSolved) : (existing?.manualOverride?.hardSolved ?? null),
    contestsAttended: contestsAttended !== undefined ? Number(contestsAttended) : (existing?.manualOverride?.contestsAttended ?? null),
    activity: Array.isArray(activity) ? activity : (existing?.manualOverride?.activity ?? []),
    updatedAt: new Date(),
  };

  if (existing) {
    existing.manualOverride = override;
    existing.source = 'manual';
  } else {
    profile.codingStats.push({
      platform,
      username: link.username,
      profileUrl: link.profileUrl,
      source: 'manual',
      status: 'ok',
      fetchedAt: new Date(),
      manualOverride: override,
    });
  }

  profile.markModified('codingStats');
  await profile.save();
  res.json(profile.codingStats.find(s => s.platform === platform));
});

// ── Internal helpers ──────────────────────────────────────────────────────────

async function refreshPlatformStats(userId, platform, username) {
  try {
    const freshStats = await fetchPlatformStats(platform, username);
    await savePlatformStats(userId, platform, freshStats);
  } catch (err) {
    console.error(`[CodingStats] Failed to refresh ${platform} for user ${userId}:`, err.message);
  }
}

async function savePlatformStats(userId, platform, freshStats) {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) return;

  const idx = profile.codingStats.findIndex(s => s.platform === platform);
  const statsDoc = {
    platform,
    username: freshStats.username || '',
    profileUrl: freshStats.profileUrl || '',
    rating: freshStats.rating ?? null,
    maxRating: freshStats.maxRating ?? null,
    totalSolved: freshStats.totalSolved ?? null,
    easySolved: freshStats.easySolved ?? null,
    mediumSolved: freshStats.mediumSolved ?? null,
    hardSolved: freshStats.hardSolved ?? null,
    contestsAttended: freshStats.contestsAttended ?? null,
    rank: freshStats.rank ?? null,
    activity: freshStats.activity || [],
    ratingHistory: freshStats.ratingHistory || [],
    fetchedAt: new Date(freshStats.fetchedAt || Date.now()),
    source: freshStats.source || 'live',
    status: freshStats.status || 'ok',
    error: freshStats.error || '',
    note: freshStats.note || '',
  };

  if (idx !== -1) {
    // Preserve manual overrides
    const existingOverride = profile.codingStats[idx].manualOverride;
    profile.codingStats[idx] = { ...statsDoc, manualOverride: existingOverride };
  } else {
    profile.codingStats.push(statsDoc);
  }

  profile.markModified('codingStats');
  await profile.save();
}

// Export helper for use in other modules (snapshot generation)
exports.getOrCreateProfile = getOrCreateProfile;
exports.savePlatformStats = savePlatformStats;
