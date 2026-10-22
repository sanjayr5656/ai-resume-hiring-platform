const assert = require('assert');
const {
  shortlistedEmail,
  rejectedEmail,
  newJobEmail,
  applicationReceivedEmail,
} = require('../services/email/templates');

console.log('--- RUNNING EMAIL TEMPLATES & NOTIFICATION TESTS ---');

// 1. Shortlisted Email Template
{
  const email = shortlistedEmail({
    candidateName: 'Alex Rivera',
    jobTitle: 'Senior Full Stack Engineer',
    company: 'Northstar Studio',
    recruiterNote: 'We loved your LeetCode problem solving record and AWS cert!',
    applicationLink: 'http://localhost:5173/candidate/applications',
  });

  assert(email.subject.toLowerCase().includes('shortlisted'), 'Subject should mention shortlisted');
  assert(email.html.includes('Alex'), 'HTML should contain candidate first name');
  assert(email.html.includes('Northstar Studio'), 'HTML should contain company name');
  assert(email.html.includes('We loved your LeetCode'), 'HTML should contain recruiter note');
  assert(email.text.includes('Great news'), 'Text fallback should contain Great news');
  console.log('✓ Test 1 passed: Shortlisted email template generated with note and branding.');
}

// 2. Rejected Email Template
{
  const email = rejectedEmail({
    candidateName: 'Jordan Doe',
    jobTitle: 'DevOps Specialist',
    company: 'Acme Cloud',
    recruiterNote: 'Position was filled by an internal candidate.',
    browseLink: 'http://localhost:5173/candidate/jobs',
  });

  assert(email.subject.toLowerCase().includes('application update'), 'Subject should mention Application update');
  assert(email.html.includes('Jordan'), 'HTML should contain candidate first name');
  assert(email.html.includes('internal candidate'), 'HTML should contain recruiter note');
  console.log('✓ Test 2 passed: Rejection email template generated respectfully.');
}

// 3. New Job Email Template
{
  const email = newJobEmail({
    candidateName: 'Alex Rivera',
    jobTitle: 'AI Platform Engineer',
    company: 'DeepTech',
    jobDescription: 'Build scalable AI platforms with Python and Docker.',
    fitScore: 88,
    jobLink: 'http://localhost:5173/candidate/jobs/123',
  });

  assert(email.subject.includes('AI Platform Engineer'), 'Subject should mention role');
  assert(email.html.includes('AI Platform Engineer'), 'HTML should contain role');
  assert(email.html.includes('88% fit'), 'HTML should contain fit badge');
  assert(email.html.includes('Python and Docker'), 'HTML should contain description');
  console.log('✓ Test 3 passed: New job alert email template contains skills overlap and fit estimate.');
}

// 4. Application Received Template
{
  const email = applicationReceivedEmail({
    candidateName: 'Alex Rivera',
    jobTitle: 'Frontend Engineer',
    company: 'DesignFirst',
    applicationLink: 'http://localhost:5173/candidate/applications',
  });

  assert(email.subject.toLowerCase().includes('application received'), 'Subject should mention Application received');
  assert(email.html.includes('DesignFirst'), 'HTML should mention company');
  console.log('✓ Test 4 passed: Application received confirmation template generated.');
}

console.log('--- ALL NOTIFICATION TEMPLATES TESTS PASSED ---');
