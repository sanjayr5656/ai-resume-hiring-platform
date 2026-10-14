const assert = require('assert');

const baseURL = 'http://localhost:3000';

async function api(path, options = {}) {
  const res = await fetch(`${baseURL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE ENDPOINT TESTS ---');

  // 1. Recruiter Login
  console.log('Testing Recruiter Login...');
  const recLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'recruiter@example.com',
      password: 'DemoPass123!'
    })
  });
  assert(recLoginRes.data.token, 'Recruiter login must return token');
  assert.strictEqual(recLoginRes.data.user.role, 'recruiter');
  const recToken = recLoginRes.data.token;
  console.log('✓ Recruiter Login Passed.');

  // 2. Candidate Login
  console.log('Testing Candidate Login...');
  const candLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'candidate@example.com',
      password: 'DemoPass123!'
    })
  });
  assert(candLoginRes.data.token, 'Candidate login must return token');
  assert.strictEqual(candLoginRes.data.user.role, 'candidate');
  const candToken = candLoginRes.data.token;
  console.log('✓ Candidate Login Passed.');

  // 3. Token Refresh (Section 1)
  console.log('Testing Session Refresh Endpoint...');
  const refreshRes = await api('/api/auth/refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candToken}` }
  });
  assert(refreshRes.data.token, 'Refresh must return a fresh token');
  assert.strictEqual(refreshRes.data.user.email, 'candidate@example.com');
  console.log('✓ Session Refresh Passed.');

  // 4. Jobs List
  console.log('Testing Jobs Listing...');
  const jobsRes = await api('/api/recruiter/jobs', {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(Array.isArray(jobsRes.data), 'Recruiter jobs must be an array');
  assert(jobsRes.data.length > 0, 'There should be recruiter jobs');
  const sampleJob = jobsRes.data[0];
  console.log(`✓ Jobs List Passed (${jobsRes.data.length} recruiter roles found, e.g. "${sampleJob.title}").`);

  // 5. Suggest Skills with AI (Section 8)
  console.log('Testing AI Suggest Skills Endpoint...');
  const skillsRes = await api('/api/recruiter/extract-skills', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: JSON.stringify({
      title: 'Full Stack Node Engineer',
      description: 'We are seeking an experienced developer with Node.js, Express, MongoDB, and React to build cloud services.'
    })
  });
  assert(Array.isArray(skillsRes.data.requiredSkills), 'requiredSkills must be an array');
  assert(skillsRes.data.requiredSkills.length > 0, 'Must extract at least one skill');
  console.log('✓ Suggest Skills with AI Passed:', skillsRes.data.requiredSkills);

  // 6. Recruiter Applicants List with Ranking & Filter (Section 9)
  console.log('Testing Ranked Applicants List...');
  const appsRes = await api(`/api/recruiter/jobs/${sampleJob._id}/applicants`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert(Array.isArray(appsRes.data), 'Applicants must be an array');
  console.log(`✓ Ranked Applicants List Passed (${appsRes.data.length} applicants for role).`);

  // 7. Candidate Career Assistant (Section 10)
  console.log('Testing AI Career Assistant Chat Endpoint...');
  const assistantRes = await api('/api/assistant/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${candToken}` },
    body: JSON.stringify({
      message: 'What are the best jobs for my skills?'
    })
  });
  assert(assistantRes.data.reply, 'Assistant must return a reply');
  assert(Array.isArray(assistantRes.data.recommendedJobs), 'recommendedJobs must be an array');
  console.log('✓ AI Career Assistant Passed. Reply snippet:', assistantRes.data.reply.slice(0, 80), '...');

  console.log('--- ALL E2E ENDPOINT TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err.data || err.message);
  process.exit(1);
});
