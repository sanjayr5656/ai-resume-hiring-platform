/**
 * Profile snapshot service.
 * Collects the candidate's profile links, coding stats, and certificates
 * into a single immutable snapshot for attaching to applications.
 */
const UserProfile = require('../models/UserProfile');
const { fetchPlatformStats } = require('./codingPlatforms');

/**
 * Refresh stats for all linked platforms, then build the snapshot.
 * This is called right before PDF generation.
 */
async function buildProfileSnapshot(userId, applicationCertifications = []) {
  let profile = await UserProfile.findOne({ userId });
  if (!profile) {
    return {
      links: {},
      codingStats: [],
      certificates: applicationCertifications || [],
      snapshotAt: new Date().toISOString(),
    };
  }

  // Refresh all linked platforms (best-effort, don't crash on failure)
  const refreshedStats = [];
  for (const link of profile.platformLinks || []) {
    if (['leetcode', 'hackerrank', 'codechef'].includes(link.platform)) {
      try {
        const fresh = await fetchPlatformStats(link.platform, link.username);
        // Update cache
        const idx = profile.codingStats.findIndex(s => s.platform === link.platform);
        const merged = {
          platform: link.platform,
          username: fresh.username || link.username,
          profileUrl: fresh.profileUrl || link.profileUrl,
          rating: fresh.rating ?? null,
          maxRating: fresh.maxRating ?? null,
          totalSolved: fresh.totalSolved ?? null,
          easySolved: fresh.easySolved ?? null,
          mediumSolved: fresh.mediumSolved ?? null,
          hardSolved: fresh.hardSolved ?? null,
          contestsAttended: fresh.contestsAttended ?? null,
          rank: fresh.rank ?? null,
          activity: fresh.activity || [],
          ratingHistory: fresh.ratingHistory || [],
          fetchedAt: new Date(),
          source: fresh.source || 'live',
          status: fresh.status || 'ok',
          error: fresh.error || '',
          note: fresh.note || '',
          manualOverride: idx !== -1 ? profile.codingStats[idx].manualOverride : undefined,
        };
        if (idx !== -1) {
          profile.codingStats[idx] = merged;
        } else {
          profile.codingStats.push(merged);
        }
        refreshedStats.push(merged);
      } catch {
        // Keep existing cached stats
        const existing = profile.codingStats.find(s => s.platform === link.platform);
        if (existing) refreshedStats.push(existing.toObject ? existing.toObject() : existing);
      }
    }
  }

  profile.markModified('codingStats');
  await profile.save();

  // Build the links object for the snapshot
  const links = {};
  if (profile.linkedin?.url) {
    links.linkedin = {
      url: profile.linkedin.url,
      headline: profile.linkedin.headline || '',
      currentRole: profile.linkedin.currentRole || '',
      skills: profile.linkedin.skills || [],
    };
  }
  for (const l of profile.platformLinks || []) {
    links[l.platform] = { username: l.username, profileUrl: l.profileUrl };
  }

  // Use final coding stats (refreshed or cached or manual)
  const statsForSnapshot = profile.codingStats.map(s => {
    const obj = s.toObject ? s.toObject() : { ...s };
    // Merge manual overrides into the main values for display
    if (obj.manualOverride && (obj.status === 'failed' || obj.source === 'manual')) {
      const m = obj.manualOverride;
      if (m.rating !== null) obj.rating = m.rating;
      if (m.totalSolved !== null) obj.totalSolved = m.totalSolved;
      if (m.easySolved !== null) obj.easySolved = m.easySolved;
      if (m.mediumSolved !== null) obj.mediumSolved = m.mediumSolved;
      if (m.hardSolved !== null) obj.hardSolved = m.hardSolved;
      if (m.contestsAttended !== null) obj.contestsAttended = m.contestsAttended;
      if (m.activity?.length) obj.activity = m.activity;
      obj.source = 'manual';
      obj.selfReported = true;
    }
    return obj;
  });

  return {
    links,
    codingStats: statsForSnapshot,
    certificates: applicationCertifications || [],
    snapshotAt: new Date().toISOString(),
  };
}

module.exports = { buildProfileSnapshot };
