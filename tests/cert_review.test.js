const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config();

const baseURL = 'http://localhost:3000';

async function run() {
  console.log('--- TESTING CERTIFICATE MULTI-FILE UPLOAD & REVIEW WORKFLOW ---');

  // 1. Log in recruiter and candidate
  const recRes = await (await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@example.com', password: 'DemoPass123!' })
  })).json();
  const candRes = await (await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'candidate@example.com', password: 'DemoPass123!' })
  })).json();

  const recToken = recRes.token;
  const candToken = candRes.token;

  // 2. Fetch candidate's applications
  let myApps = await (await fetch(`${baseURL}/api/jobs/my/applications`, {
    headers: { Authorization: `Bearer ${candToken}` }
  })).json();

  let app;
  if (myApps.length > 0) {
    app = myApps[0];
  } else {
    // Fetch a job and apply
    const jobs = await (await fetch(`${baseURL}/api/jobs`)).json();
    const job = jobs[0];
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 50 >>\nstream\nBT /F1 12 Tf 72 712 Td (Alex Rivera - Node.js and React Developer) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000174 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n274\n%%EOF');
    const form = new FormData();
    form.append('resume', new Blob([dummyPdf], { type: 'application/pdf' }), 'alex_rivera_resume.pdf');
    app = await (await fetch(`${baseURL}/api/jobs/${job._id}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candToken}` },
      body: form
    })).json();
  }

  // Ensure application has at least one certification
  await mongoose.connect(process.env.MONGO_URI);
  const Application = require('../models/Application');
  const dbApp = await Application.findById(app._id);
  if (!dbApp.parsed.certifications || dbApp.parsed.certifications.length === 0) {
    dbApp.parsed.certifications.push({
      name: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      credentialId: 'AWS-CCP-1092',
      credentialUrl: 'https://aws.amazon.com/verification',
      verificationStatus: 'claimed',
      relevance: 8,
      proofFiles: []
    });
    await dbApp.save();
  }
  const certId = dbApp.parsed.certifications[0]._id.toString();
  const certName = dbApp.parsed.certifications[0].name;
  await mongoose.disconnect();

  console.log(`✓ Application ready: ID ${app._id}, testing certification: "${certName}" (${certId})`);

  // 3. Candidate uploads multiple proof files (Section 2)
  console.log('Testing Multiple Proof Document Upload...');
  const proofFormData = new FormData();
  const sampleProofFile = Buffer.from('FAKE-CERTIFICATE-IMAGE-CONTENT');
  proofFormData.append('proofs', new Blob([sampleProofFile], { type: 'image/png' }), 'aws_certificate_scan.png');
  proofFormData.append('credentialId', 'AWS-VERIFIED-9912');
  proofFormData.append('credentialUrl', 'https://aws.amazon.com/verify');

  const uploadRes = await (await fetch(`${baseURL}/api/jobs/applications/${app._id}/certifications/${certId}/proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${candToken}` },
    body: proofFormData
  })).json();

  const updatedCert = uploadRes.parsed.certifications.find(c => c._id.toString() === certId);
  assert(updatedCert.proofFiles.length > 0, 'Proof files must be recorded');
  assert.strictEqual(updatedCert.verificationStatus, 'proof_provided');
  const fileId = updatedCert.proofFiles[0].fileId;
  console.log(`✓ Proof file uploaded (${updatedCert.proofFiles[0].originalName}, ID: ${fileId}). Status: proof_provided.`);

  // 4. Test Authenticated Proof Serving (Section 2 & 4)
  console.log('Testing Authenticated File Viewer...');
  const fileViewRes = await fetch(`${baseURL}/api/jobs/applications/${app._id}/certifications/${certId}/proofs/${fileId}`, {
    headers: { Authorization: `Bearer ${recToken}` }
  });
  assert.strictEqual(fileViewRes.status, 200, 'Recruiter must be permitted to view proof file');
  const fileContent = await fileViewRes.text();
  assert.strictEqual(fileContent, 'FAKE-CERTIFICATE-IMAGE-CONTENT', 'File content must match');
  console.log('✓ Secure Authenticated File View Passed.');

  // 5. Recruiter runs AI Check (Section 3)
  console.log('Testing AI Automated Forensic Certificate Check...');
  const aiCheckRes = await (await fetch(`${baseURL}/api/recruiter/applications/${app._id}/certifications/${certId}/ai-check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` }
  })).json();

  const checkedCert = aiCheckRes.parsed.certifications.find(c => c._id.toString() === certId);
  assert(checkedCert.aiCheckResult, 'aiCheckResult must be populated');
  assert(checkedCert.aiCheckResult.verdict, 'verdict must be present');
  console.log(`✓ AI Check Passed: verdict="${checkedCert.aiCheckResult.verdict}", confidence=${checkedCert.aiCheckResult.confidence}%.`);

  // 6. Recruiter verifies certificate with note & audit trail (Section 4)
  console.log('Testing Recruiter Verification Decision with Audit Trail...');
  const verifyRes = await (await fetch(`${baseURL}/api/recruiter/applications/${app._id}/certifications/${certId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recToken}`
    },
    body: JSON.stringify({
      status: 'verified',
      note: 'Verified against AWS certificate registry.'
    })
  })).json();

  const finalCert = verifyRes.parsed.certifications.find(c => c._id.toString() === certId);
  assert.strictEqual(finalCert.verificationStatus, 'verified', 'Status must be verified');
  assert(finalCert.auditTrail.length > 0, 'Audit trail must record decision');
  assert.strictEqual(finalCert.auditTrail[finalCert.auditTrail.length - 1].note, 'Verified against AWS certificate registry.');
  console.log('✓ Recruiter Verification with Audit Trail Passed.');

  // 7. Test Rank was updated
  assert(verifyRes.rank >= 1, 'Application must have a positive rank');
  console.log(`✓ Application Rank confirmed: #${verifyRes.rank} with Score ${verifyRes.scores.total}/100.`);

  console.log('--- ALL CERTIFICATE VERIFICATION TESTS PASSED! ---');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
