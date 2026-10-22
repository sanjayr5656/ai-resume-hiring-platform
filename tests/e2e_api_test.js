const http = require('http');

async function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testAll() {
  console.log('--- STARTING E2E API VERIFICATION ---');

  // 1. Health check
  const health = await request({ hostname: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
  console.log('1. Health check:', health.status === 200 && health.body.ok ? '✓ PASS' : '✗ FAIL');

  // 2. Candidate Login
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'candidate@example.com', password: 'DemoPass123!' }
  );
  console.log('2. Candidate Login:', loginRes.status === 200 && loginRes.body.token ? '✓ PASS' : '✗ FAIL');
  const token = loginRes.body?.token;

  if (!token) {
    console.error('Login failed, cannot continue E2E');
    process.exit(1);
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 3. Candidate Profile Links & Stats
  const profileRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/profile', method: 'GET', headers: authHeaders }
  );
  console.log('3. Get Candidate Profile:', profileRes.status === 200 && Array.isArray(profileRes.body.platformLinks) ? '✓ PASS' : '✗ FAIL');
  console.log('   Platforms found:', profileRes.body?.platformLinks?.map(p => p.platform));

  // 4. Notifications
  const notifRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/notifications', method: 'GET', headers: authHeaders }
  );
  console.log('4. Get Notifications:', notifRes.status === 200 && Array.isArray(notifRes.body.notifications) ? '✓ PASS' : '✗ FAIL');
  console.log(`   Total notifications: ${notifRes.body?.notifications?.length}, unread: ${notifRes.body?.unreadCount}`);

  // 5. Jobs list
  const jobsRes = await request(
    { hostname: 'localhost', port: 3000, path: '/api/jobs', method: 'GET', headers: authHeaders }
  );
  console.log('5. List Jobs:', jobsRes.status === 200 && Array.isArray(jobsRes.body) ? '✓ PASS' : '✗ FAIL');
  console.log(`   Total active jobs: ${jobsRes.body?.length}`);

  // 6. Recruiter Login
  const recLogin = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'recruiter@example.com', password: 'DemoPass123!' }
  );
  console.log('6. Recruiter Login:', recLogin.status === 200 && recLogin.body.token ? '✓ PASS' : '✗ FAIL');

  console.log('--- ALL E2E VERIFICATION CHECKS COMPLETED ---');
}

testAll().catch(console.error);
