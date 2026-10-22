/**
 * LeetCode platform adapter.
 * Uses LeetCode's public GraphQL endpoint – no authentication required for public profiles.
 */
const axios = require('axios');

const GRAPHQL_URL = 'https://leetcode.com/graphql';
const TIMEOUT_MS = 12000;
const MAX_SIZE_BYTES = 512 * 1024; // 512 KB

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'HireLens/1.0 (+https://hirelens.app)',
  Referer: 'https://leetcode.com',
};

const PROFILE_QUERY = `
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      realName
      ranking
      userAvatar
      reputation
      starRating
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
    badges { id name }
  }
}`;

const CONTEST_QUERY = `
query getUserContestRanking($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
    badge { name }
  }
  userContestRankingHistory(username: $username) {
    attended
    trendDirection
    problemsSolved
    totalProblems
    finishTimeInSeconds
    rating
    ranking
    contest { title startTime }
  }
}`;

const CALENDAR_QUERY = `
query getUserCalendar($username: String!, $year: Int) {
  matchedUser(username: $username) {
    userCalendar(year: $year) {
      activeYears
      streak
      totalActiveDays
      dccBadges { timestamp badge { name icon } }
      submissionCalendar
    }
  }
}`;

async function gql(query, variables) {
  const { data } = await axios.post(GRAPHQL_URL, { query, variables }, {
    headers: HEADERS,
    timeout: TIMEOUT_MS,
    maxContentLength: MAX_SIZE_BYTES,
    maxBodyLength: MAX_SIZE_BYTES,
  });
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
  return data.data;
}

/**
 * Parse submission calendar JSON string into activity array sorted by date.
 * LeetCode returns a JSON map of {unixTimestamp: count}.
 */
function parseCalendar(calendarStr) {
  try {
    const raw = JSON.parse(calendarStr || '{}');
    return Object.entries(raw).map(([ts, count]) => ({
      date: new Date(Number(ts) * 1000).toISOString().slice(0, 10),
      solved: Number(count),
    })).sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/**
 * Fetch LeetCode public stats for a given username.
 * @returns normalized stats shape
 */
async function fetchLeetCode(username) {
  const safeUsername = String(username || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeUsername) throw new Error('Invalid LeetCode username');

  let profileData, contestData, calendarData;

  try {
    profileData = await gql(PROFILE_QUERY, { username: safeUsername });
  } catch (err) {
    return {
      platform: 'leetcode',
      username: safeUsername,
      profileUrl: `https://leetcode.com/${safeUsername}/`,
      status: 'failed',
      error: `Could not fetch LeetCode profile: ${err.message}`,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  }

  const user = profileData?.matchedUser;
  if (!user) {
    return {
      platform: 'leetcode',
      username: safeUsername,
      profileUrl: `https://leetcode.com/${safeUsername}/`,
      status: 'failed',
      error: 'LeetCode user not found',
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  }

  // Parse solved counts
  const acStats = user.submitStatsGlobal?.acSubmissionNum || [];
  const totalSolved = acStats.find(s => s.difficulty === 'All')?.count || 0;
  const easySolved = acStats.find(s => s.difficulty === 'Easy')?.count || 0;
  const mediumSolved = acStats.find(s => s.difficulty === 'Medium')?.count || 0;
  const hardSolved = acStats.find(s => s.difficulty === 'Hard')?.count || 0;

  // Contest data (non-fatal)
  let rating = null, maxRating = null, contestsAttended = 0, rank = null, ratingHistory = [];
  try {
    contestData = await gql(CONTEST_QUERY, { username: safeUsername });
    const cr = contestData?.userContestRanking;
    if (cr) {
      rating = Math.round(cr.rating || 0);
      maxRating = rating; // LeetCode doesn't expose historical max separately
      contestsAttended = cr.attendedContestsCount || 0;
      rank = cr.globalRanking || null;
    }
    const history = contestData?.userContestRankingHistory || [];
    ratingHistory = history
      .filter(h => h.attended)
      .map(h => ({
        date: new Date(h.contest?.startTime * 1000).toISOString().slice(0, 10),
        rating: Math.round(h.rating || 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch { /* non-fatal */ }

  // Calendar data (non-fatal)
  let activity = [];
  try {
    const currentYear = new Date().getFullYear();
    calendarData = await gql(CALENDAR_QUERY, { username: safeUsername, year: currentYear });
    const cal = calendarData?.matchedUser?.userCalendar;
    activity = parseCalendar(cal?.submissionCalendar);
  } catch { /* non-fatal */ }

  return {
    platform: 'leetcode',
    username: safeUsername,
    profileUrl: `https://leetcode.com/${safeUsername}/`,
    rating,
    maxRating,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    contestsAttended,
    rank,
    activity,
    ratingHistory,
    fetchedAt: new Date().toISOString(),
    source: 'live',
    status: 'ok',
  };
}

module.exports = { fetchLeetCode };
