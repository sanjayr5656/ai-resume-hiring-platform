/**
 * CodeChef platform adapter.
 * CodeChef has no official public API. This adapter does a best-effort
 * fetch of public profile data. Returns "failed" gracefully on any error.
 */
const axios = require('axios');

const TIMEOUT_MS = 8000;
const MAX_SIZE_BYTES = 256 * 1024;

const HEADERS = {
  'User-Agent': 'HireLens/1.0 (+https://hirelens.app; for candidate profile display)',
  Accept: 'application/json, text/html',
};

async function fetchCodeChef(username) {
  const safeUsername = String(username || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
  if (!safeUsername) throw new Error('Invalid CodeChef username');

  const profileUrl = `https://www.codechef.com/users/${safeUsername}`;

  try {
    // CodeChef exposes some profile data via their unofficial API used by their own site
    const apiUrl = `https://www.codechef.com/users/${safeUsername}`;
    const { data: html } = await axios.get(apiUrl, {
      headers: { ...HEADERS, Accept: 'text/html' },
      timeout: TIMEOUT_MS,
      maxContentLength: MAX_SIZE_BYTES,
      validateStatus: s => s < 500,
    });

    if (!html || typeof html !== 'string') {
      return failedResult(safeUsername, profileUrl, 'Empty response from CodeChef');
    }

    const cheerio = require('cheerio');
    const $ = cheerio.load(html);

    // Total Solved
    const solvedH3 = $('h3:contains("Total Problems Solved")').first().text().trim();
    const totalSolvedMatch = solvedH3.match(/(\d+)/);
    const totalSolved = totalSolvedMatch ? Number(totalSolvedMatch[1]) : (
      Number($('section.problems-solved').text().match(/(\d+)\s*(?:Problems\s*Solved|problems\s*solved)/i)?.[1]) || null
    );

    // Global Rank
    const rankText = $('.rating-ranks a strong').first().text().trim();
    const rank = Number(rankText.replace(/[^0-9]/g, '')) || null;

    // Contests Attended
    const contestH3 = $('h3:contains("Contests")').first().text().trim();
    const contestsAttended = Number(contestH3.replace(/[^0-9]/g, '')) || null;

    // Stars (1-7)
    const starsCount = $('.rating-star span').length || (html.match(/★/g) || []).length || null;
    const stars = starsCount > 0 && starsCount <= 7 ? starsCount : null;

    // CodeChef rating is explicitly omitted per user request
    const rating = null;
    const maxRating = null;

    if (!totalSolved && !contestsAttended && !rank) {
      return failedResult(safeUsername, profileUrl, 'Could not parse CodeChef profile. The page structure may have changed.');
    }

    return {
      platform: 'codechef',
      username: safeUsername,
      profileUrl,
      rating: null,
      maxRating: null,
      totalSolved,
      easySolved: null,
      mediumSolved: null,
      hardSolved: null,
      contestsAttended,
      rank,
      activity: [],
      ratingHistory: [],
      fetchedAt: new Date().toISOString(),
      source: 'live',
      status: 'ok',
      note: 'CodeChef stats synced (rating omitted)',
      stars,
    };
  } catch (err) {
    return failedResult(safeUsername, profileUrl, err.message || 'Fetch failed');
  }
}

function failedResult(username, profileUrl, error) {
  return {
    platform: 'codechef',
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
    note: 'CodeChef has no official public API. Please enter your stats manually.',
  };
}

module.exports = { fetchCodeChef };
