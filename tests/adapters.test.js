const assert = require('assert');
const { guardUrl, ALLOWED_HOSTS } = require('../services/codingPlatforms/ssrf');
const { fetchPlatformStats } = require('../services/codingPlatforms');

console.log('--- RUNNING CODING PLATFORM ADAPTER TESTS ---');

// 1. SSRF Guard Tests
async function runSsrfTests() {
  assert(ALLOWED_HOSTS.has('leetcode.com'), 'leetcode.com should be in allow list');
  assert(ALLOWED_HOSTS.has('codechef.com'), 'codechef.com should be in allow list');
  assert(ALLOWED_HOSTS.has('hackerrank.com'), 'hackerrank.com should be in allow list');

  let blocked = false;
  try {
    await guardUrl('http://127.0.0.1/admin');
  } catch (err) {
    blocked = true;
  }
  assert(blocked, 'Should block 127.0.0.1');

  blocked = false;
  try {
    await guardUrl('http://169.254.169.254/latest/meta-data/');
  } catch (err) {
    blocked = true;
  }
  assert(blocked, 'Should block 169.254.169.254');

  blocked = false;
  try {
    await guardUrl('http://malicious-domain.com/');
  } catch (err) {
    blocked = true;
  }
  assert(blocked, 'Should block non-allowed domain');

  console.log('✓ Test 1 passed: SSRF guard blocks disallowed domains and IP addresses.');
}

// 2. Unsupported Platform Dispatcher
async function runDispatcherTests() {
  const res = await fetchPlatformStats('unknown_platform', 'user123');
  assert.strictEqual(res.status, 'failed', 'Should return failed status for unknown platform');
  assert(res.error.includes('Unsupported platform'));
  console.log('✓ Test 2 passed: Dispatcher safely returns failed status for unsupported platform.');
}

// 3. Username Validation & Sanitization
function runModuleExportsTests() {
  const LeetCode = require('../services/codingPlatforms/leetcode');
  assert(LeetCode.fetchLeetCode, 'LeetCode adapter should export fetchLeetCode');
  const CodeChef = require('../services/codingPlatforms/codechef');
  assert(CodeChef.fetchCodeChef, 'CodeChef adapter should export fetchCodeChef');
  const HackerRank = require('../services/codingPlatforms/hackerrank');
  assert(HackerRank.fetchHackerRank, 'HackerRank adapter should export fetchHackerRank');
  console.log('✓ Test 3 passed: All platform adapters are properly exported.');
}

Promise.all([runSsrfTests(), runDispatcherTests(), Promise.resolve(runModuleExportsTests())])
  .then(() => console.log('--- ALL ADAPTER TESTS PASSED ---'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
