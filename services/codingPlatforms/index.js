/**
 * Coding Platforms dispatcher.
 * Routes fetch requests to the correct platform adapter.
 */
const { fetchLeetCode } = require('./leetcode');
const { fetchHackerRank } = require('./hackerrank');
const { fetchCodeChef } = require('./codechef');

const SUPPORTED_PLATFORMS = ['leetcode', 'hackerrank', 'codechef'];

/**
 * Fetch stats from the specified platform.
 * NEVER throws – always returns a result with status "ok" | "partial" | "failed".
 */
async function fetchPlatformStats(platform, username) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return {
      platform,
      username,
      status: 'failed',
      error: `Unsupported platform: ${platform}`,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  }

  try {
    switch (platform) {
      case 'leetcode':   return await fetchLeetCode(username);
      case 'hackerrank': return await fetchHackerRank(username);
      case 'codechef':   return await fetchCodeChef(username);
      default:           throw new Error('Unknown platform');
    }
  } catch (err) {
    return {
      platform,
      username: String(username || ''),
      status: 'failed',
      error: err.message || 'Unexpected error',
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  }
}

module.exports = { fetchPlatformStats, SUPPORTED_PLATFORMS };
