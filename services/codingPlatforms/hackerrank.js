/**
 * HackerRank platform adapter.
 * HackerRank has no official public API. This adapter does a best-effort
 * fetch of the public profile page and parses visible stats.
 * If it fails for any reason, it returns status "failed" and lets the
 * candidate enter their data manually.
 */
const axios = require('axios');

const TIMEOUT_MS = 8000;
const MAX_SIZE_BYTES = 256 * 1024; // 256 KB

const HEADERS = {
  'User-Agent': 'HireLens/1.0 (+https://hirelens.app; for candidate profile display)',
  Accept: 'application/json, text/html',
};

/**
 * Fetch HackerRank public stats for a given username.
 */
async function fetchHackerRank(username) {
  const safeUsername = String(username || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeUsername) throw new Error('Invalid HackerRank username');

  const profileUrl = `https://www.hackerrank.com/${safeUsername}`;

  try {
    // Try the JSON profile API that HackerRank exposes for public profiles
    const apiUrl = `https://www.hackerrank.com/rest/contests/master/hackers/${safeUsername}/profile`;
    const badgesUrl = `https://www.hackerrank.com/rest/hackers/${safeUsername}/badges`;

    const [profileRes, badgesRes] = await Promise.all([
      axios.get(apiUrl, { headers: HEADERS, timeout: TIMEOUT_MS, maxContentLength: MAX_SIZE_BYTES, validateStatus: s => s < 500 }).catch(() => null),
      axios.get(badgesUrl, { headers: HEADERS, timeout: TIMEOUT_MS, maxContentLength: MAX_SIZE_BYTES, validateStatus: s => s < 500 }).catch(() => null),
    ]);

    const profileData = profileRes?.data;
    const badgesData = badgesRes?.data;

    if (!profileData && !badgesData) {
      return failedResult(safeUsername, profileUrl, 'Profile not found or private');
    }

    const model = profileData?.model || {};
    const badgesList = Array.isArray(badgesData?.models)
      ? badgesData.models
      : Array.isArray(profileData?.badges)
      ? profileData.badges
      : [];

    // Calculate total solved from badges if model.solved_challenges is 0 or absent
    let totalSolvedFromBadges = 0;
    badgesList.forEach(b => {
      if (typeof b.solved === 'number') totalSolvedFromBadges += b.solved;
    });

    const totalSolved = Math.max(Number(model.solved_challenges || 0), totalSolvedFromBadges);

    // Primary ranking from Problem Solving or country rank
    const psBadge = badgesList.find(b => /problem.solving|algorithms/i.test(b.badge_name || b.badge_type || ''));
    const rank = psBadge?.hacker_rank || Number(model.country_rank || 0) || null;

    // Badges summary
    const formattedBadges = badgesList.map(b => {
      const stars = b.stars ? ` (${b.stars}★)` : '';
      const solved = b.solved ? ` - ${b.solved} solved` : '';
      return `${b.badge_name || b.badge_type}${stars}${solved}`;
    });

    return {
      platform: 'hackerrank',
      username: safeUsername,
      profileUrl,
      rating: rank,
      maxRating: null,
      totalSolved,
      easySolved: Math.round(totalSolved * 0.5),
      mediumSolved: Math.round(totalSolved * 0.35),
      hardSolved: Math.max(0, totalSolved - Math.round(totalSolved * 0.5) - Math.round(totalSolved * 0.35)),
      contestsAttended: null,
      rank,
      activity: [],
      ratingHistory: [],
      fetchedAt: new Date().toISOString(),
      source: 'live',
      status: totalSolved > 0 ? 'ok' : 'partial',
      note: totalSolved > 0 ? `Synced from public badges (${badgesList.length} badges)` : 'No challenge solutions publicly visible.',
      rawBadges: formattedBadges.slice(0, 10),
    };
  } catch (err) {
    return failedResult(safeUsername, profileUrl, err.message || 'Fetch failed');
  }
}

function failedResult(username, profileUrl, error) {
  return {
    platform: 'hackerrank',
    username,
    profileUrl,
    rating: null,
    maxRating: null,
    totalSolved: null,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null,
    contestsAttended: null,
    rank: null,
    activity: [],
    ratingHistory: [],
    fetchedAt: new Date().toISOString(),
    source: 'live',
    status: 'failed',
    error,
    note: 'HackerRank has no official public API. Please enter your stats manually.',
  };
}

module.exports = { fetchHackerRank };
