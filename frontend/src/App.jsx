import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import './duplicates.css';
import './auth-nav.css';
import './density.css';
import './features.css';

// -------------------------------------------------------------
// Shared Axios Instance with Persistent Token Interceptors (Section 1)
// -------------------------------------------------------------
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const isLoginOrRegister = /\/api\/auth\/(login|register)/.test(error.config?.url || '');
    const code = error.response?.data?.code;
    const isSessionExpired = code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'SESSION_EXPIRED';
    if (error.response?.status === 401 && !isLoginOrRegister && isSessionExpired && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('hirewise:session-expired', { detail: { message: error.response?.data?.error || 'Session expired' } }));
    }
    return Promise.reject(error);
  }
);

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  const signIn = data => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const onExpired = () => {
      logout();
      navigate('/login?expired=1', { replace: true });
    };
    window.addEventListener('hirewise:session-expired', onExpired);
    return () => window.removeEventListener('hirewise:session-expired', onExpired);
  }, [navigate]);

  return <AuthContext.Provider value={{ user, token, signIn, logout }}>{children}</AuthContext.Provider>;
}

function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'recruiter' ? '/recruiter' : '/jobs'} replace />;
  return children;
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="top">
        <Link className="brand" to="/">hirewise<span>●</span></Link>
        <nav>
          {user ? (
            <>
              <Link to={user.role === 'recruiter' ? '/recruiter' : '/jobs'}>
                {user.role === 'recruiter' ? 'My roles' : 'Find roles'}
              </Link>
              {user.role === 'candidate' && <Link to="/applications">My applications</Link>}
              <span className="nav-name">{user.name} ({user.role})</span>
              <button className="quiet" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="nav-register" to="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
      {user?.role === 'candidate' && <AICareerAssistant />}
      <footer>
        Make the next move count. <span>hirewise · Precision Hiring Platform.</span>
      </footer>
    </>
  );
}

function Landing() {
  return (
    <Shell>
      <section className="hero">
        <div className="eyebrow">A BETTER WAY TO HIRE & GET HIRED</div>
        <h1>Good work starts<br />with <em>the right match.</em></h1>
        <p>A transparent hiring platform connecting verified technical candidates with engineering teams.</p>
        <div className="path-cards">
          <Link to="/auth?role=recruiter" className="path-card dark">
            <span className="card-index">01 / FOR TEAMS</span>
            <b>I'm hiring</b>
            <small>Rank applicants by verified skills, project evidence, and credentials.</small>
            <i>↗</i>
          </Link>
          <Link to="/auth?role=candidate" className="path-card">
            <span className="card-index">02 / FOR CANDIDATES</span>
            <b>I'm job hunting</b>
            <small>Get clear fit reports, verified credential credit, and personal AI guidance.</small>
            <i>↗</i>
          </Link>
        </div>
      </section>
      <div className="ticker">DETERMINISTIC RANKING · VERIFIED CERTIFICATES · CLEAR FIT EXPLANATIONS · EVIDENCE BASED</div>
    </Shell>
  );
}

function AuthPage({ initialMode = 'login' }) {
  const params = new URLSearchParams(location.search);
  const [role, setRole] = useState(params.get('role') || 'candidate');
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const update = (k, v) => setForm({ ...form, [k]: v });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = mode === 'login' ? { email: form.email, password: form.password } : { ...form, role };
      const { data } = await api.post(`/api/auth/${mode}`, payload);
      signIn(data);
      navigate(data.user.role === 'recruiter' ? '/recruiter' : '/jobs');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not connect to the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="auth-layout">
        <div>
          <div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</div>
          <h1 className="page-title">{mode === 'login' ? 'Sign in to continue.' : 'Create your account.'}</h1>
          {params.get('expired') === '1' && (
            <div className="error">Your session expired. Please sign in again; your data is safely preserved.</div>
          )}
          <p className="muted">
            {role === 'recruiter'
              ? 'Review verified talent with deterministic fit scores, evidence tracking, and AI assistance.'
              : 'Apply with your resume, authenticate credentials, and receive actionable fit insights.'}
          </p>
        </div>
        <form className="panel auth-form" onSubmit={submit}>
          <div className="segmented">
            <button type="button" className={role === 'candidate' ? 'selected' : ''} onClick={() => setRole('candidate')}>Candidate</button>
            <button type="button" className={role === 'recruiter' ? 'selected' : ''} onClick={() => setRole('recruiter')}>Recruiter</button>
          </div>
          {mode === 'register' && (
            <label>Full name<input required value={form.name || ''} onChange={e => update('name', e.target.value)} minLength="2" /></label>
          )}
          <label>Email address<input type="email" required value={form.email || ''} onChange={e => update('email', e.target.value)} /></label>
          {mode === 'register' && role === 'recruiter' && (
            <label>Company name<input required value={form.company || ''} onChange={e => update('company', e.target.value)} /></label>
          )}
          <label>Password<input type="password" required minLength={mode === 'register' ? 8 : 1} value={form.password || ''} onChange={e => update('password', e.target.value)} /></label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={busy}>{busy ? 'Authenticating…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <p className="form-switch">
            {mode === 'login' ? 'New to HireWise?' : 'Already have an account?'}
            {' '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </Shell>
  );
}

function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/api/jobs', { params: { search: q } })
      .then(r => active && setJobs(r.data))
      .catch(() => active && setError('Could not load jobs. Please check network connection.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [q]);

  return (
    <Shell>
      <div className="page-head">
        <div>
          <div className="eyebrow">EXPLORE OPPORTUNITIES</div>
          <h1 className="page-title">Find roles that fit.</h1>
        </div>
        <label className="search">
          ⌕ <input placeholder="Search roles, skills, companies" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="empty">Loading open opportunities…</div>
      ) : jobs.length === 0 ? (
        <div className="empty">No roles match your search. Try different keywords.</div>
      ) : (
        <div className="job-grid">
          {jobs.map(j => (
            <article className="job-card" key={j._id}>
              <div className="job-company">{j.company}</div>
              <h2>{j.title}</h2>
              <p>{j.description.slice(0, 170)}{j.description.length > 170 ? '…' : ''}</p>
              <div className="chips">
                {j.requiredSkills.slice(0, 5).map(s => <span key={s}>{s}</span>)}
              </div>
              <div className="job-bottom">
                <small>{j.minExperience || 0}+ years exp · {j.status}</small>
                <Link to={`/jobs/${j._id}`} className="text-link">View role ↗</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </Shell>
  );
}

function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get(`/api/jobs/${id}`)
      .then(r => setJob(r.data))
      .catch(() => setMsg('This role is no longer active.'));
  }, [id]);

  async function apply(e) {
    e.preventDefault();
    if (!file) return setMsg('Please select your PDF resume file.');
    setBusy(true);
    setMsg('');
    const body = new FormData();
    body.append('resume', file);
    try {
      const r = await api.post(`/api/jobs/${id}/apply`, body);
      // Section 1 fix: use navigate() without page reload to preserve auth session
      navigate(`/applications?new=${r.data._id}`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to submit application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      {!job ? (
        <div className="empty">{msg || 'Loading job details…'}</div>
      ) : (
        <div className="detail-layout">
          <section>
            <div className="eyebrow">{job.company} / OPEN POSITION</div>
            <h1 className="page-title">{job.title}</h1>
            <p className="detail-desc">{job.description}</p>
            <h3>Required technical skills</h3>
            <div className="chips">
              {job.requiredSkills.map(s => <span key={s}>{s}</span>)}
            </div>
            {job.niceToHaveSkills?.length > 0 && (
              <>
                <h3>Nice to have</h3>
                <div className="chips">
                  {job.niceToHaveSkills.map(s => <span key={s}>{s}</span>)}
                </div>
              </>
            )}
            <h3>Evaluation breakdown</h3>
            <p className="muted" style={{ fontSize: '13px' }}>
              This role is weighted: Skills ({job.weights?.skills || 45}%), Projects ({job.weights?.projects || 30}%), Certifications ({job.weights?.certifications || 20}%), Experience ({job.weights?.experience || 5}%).
            </p>
          </section>
          <form className="panel apply-box" onSubmit={apply}>
            <div className="eyebrow">APPLY TODAY</div>
            <h2>Submit your resume</h2>
            <p>Upload a standard PDF resume to be evaluated for this position.</p>
            <div className="apply-details">
              <span><b>01</b> Technical skill overlap</span>
              <span><b>02</b> Practical project relevance</span>
              <span><b>03</b> Verified credentials & experience</span>
            </div>
            <small className="file-note">PDF format only · Maximum 10 MB file size.</small>
            <input type="file" accept="application/pdf,.pdf" required onChange={e => setFile(e.target.files?.[0])} />
            {msg && <div className="error">{msg}</div>}
            <button className="primary full" disabled={busy}>
              {busy ? 'Analyzing resume with AI…' : 'Submit application'}
            </button>
          </form>
        </div>
      )}
    </Shell>
  );
}

function Applications() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    api.get('/api/jobs/my/applications')
      .then(r => setItems(r.data))
      .finally(() => setBusy(false));
  }, []);

  return (
    <Shell>
      <div className="eyebrow">CANDIDATE DASHBOARD</div>
      <h1 className="page-title">My applications.</h1>
      {busy ? (
        <div className="empty">Loading your applications…</div>
      ) : !items.length ? (
        <div className="empty">You have not submitted any applications yet. <Link to="/jobs">Explore open roles ↗</Link></div>
      ) : (
        <div className="application-list">
          {items.map(a => (
            <article className="application-card" key={a._id}>
              <div>
                <div className="job-company">{a.jobId?.company}</div>
                <h2>{a.jobId?.title || 'Engineering Role'}</h2>
                <small>Submitted on {new Date(a.createdAt).toLocaleDateString()}</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="score-pill">{a.scores?.total || 0}/100 Fit</span>
                <span className={`status ${a.status}`}>{a.status}</span>
              </div>
              <Link className="text-link" to={`/applications/${a._id}`}>View fit report & proofs ↗</Link>
            </article>
          ))}
        </div>
      )}
    </Shell>
  );
}

// -------------------------------------------------------------
// Candidate Multi-File Proof Uploader (Section 2)
// -------------------------------------------------------------
function MultiFileProofUploader({ app, cert, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [credId, setCredId] = useState(cert.credentialId || '');
  const [credUrl, setCredUrl] = useState(cert.credentialUrl || '');
  const fileInputRef = useRef(null);

  const proofFiles = cert.proofFiles || [];

  async function handleFiles(files) {
    if (!files || !files.length) return;
    setError('');
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('proofs', files[i]);
    }
    if (credId) formData.append('credentialId', credId);
    if (credUrl) formData.append('credentialUrl', credUrl);

    try {
      const res = await api.post(`/api/jobs/applications/${app._id}/certifications/${cert._id}/proof`, formData);
      onUpdate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload proof files.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('credentialId', credId);
    formData.append('credentialUrl', credUrl);
    try {
      const res = await api.post(`/api/jobs/applications/${app._id}/certifications/${cert._id}/proof`, formData);
      onUpdate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save credential details.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId) {
    if (!confirm('Remove this proof file?')) return;
    try {
      const res = await api.delete(`/api/jobs/applications/${app._id}/certifications/${cert._id}/proofs/${fileId}`);
      onUpdate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete file.');
    }
  }

  const isVerified = cert.verificationStatus === 'verified';

  return (
    <div className="cert-card">
      <div className="cert-card-header">
        <div>
          <div className="cert-card-title">{cert.name}</div>
          <div className="cert-meta">{cert.issuer ? `Issuer: ${cert.issuer} · ` : ''}Relevance: {cert.relevance || 5}/10</div>
        </div>
        <span className={`status ${cert.verificationStatus}`}>{cert.verificationStatus?.replace('_', ' ')}</span>
      </div>

      {!isVerified && (
        <>
          <div
            className={`cert-dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="application/pdf,image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <p>📁 Drag & drop multiple proof files here, or click to browse</p>
            <small>Supports PDF, PNG, JPG, WEBP (Up to 10 MB each)</small>
          </div>

          <form className="cred-inputs" onSubmit={handleSaveDetails}>
            <label>
              Credential ID / Roll No
              <input
                placeholder="e.g. AWS-DEV-98432"
                value={credId}
                onChange={e => setCredId(e.target.value)}
              />
            </label>
            <label>
              Verification URL (HTTPS)
              <input
                type="url"
                placeholder="https://..."
                value={credUrl}
                onChange={e => setCredUrl(e.target.value)}
              />
            </label>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="quiet" disabled={uploading}>
                {uploading ? 'Saving…' : 'Save credential details'}
              </button>
            </div>
          </form>
        </>
      )}

      {proofFiles.length > 0 && (
        <div className="proof-files-list">
          <small style={{ fontWeight: 600, color: 'var(--muted)' }}>Uploaded Proof Files ({proofFiles.length}):</small>
          {proofFiles.map(f => (
            <div className="proof-file-item" key={f.fileId}>
              <div className="proof-file-info">
                <span>📄</span>
                <a
                  href={`${api.defaults.baseURL}/api/jobs/applications/${app._id}/certifications/${cert._id}/proofs/${f.fileId}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="proof-file-name"
                >
                  {f.originalName}
                </a>
                <span className="proof-file-size">({Math.round(f.size / 1024)} KB)</span>
              </div>
              {!isVerified && (
                <button
                  type="button"
                  className="quiet danger"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => handleDeleteFile(f.fileId)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {cert.aiCheckResult && (
        <div style={{ background: '#f8faf3', padding: '10px 14px', borderRadius: '5px', fontSize: '11px', border: '1px solid #dce2d0' }}>
          <b>AI Forensic Inspection:</b> {cert.aiCheckResult.verdict?.replace('_', ' ')} (Confidence: {cert.aiCheckResult.confidence}%)
          {cert.aiCheckResult.findings?.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
              {cert.aiCheckResult.findings.map((finding, idx) => <li key={idx}>{finding}</li>)}
            </ul>
          )}
        </div>
      )}

      {error && <div className="error" style={{ fontSize: '11px' }}>{error}</div>}
    </div>
  );
}

// -------------------------------------------------------------
// Candidate Fit Report (Sections 5, 6, 7)
// -------------------------------------------------------------
function FitReport() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/jobs/my/applications')
      .then(r => setApp(r.data.find(a => a._id === id)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Shell><div className="empty">Loading your fit report…</div></Shell>;
  if (!app) return <Shell><div className="empty">Application not found. <Link to="/applications">Back to my applications</Link></div></Shell>;

  const scores = app.scores || {};
  const breakdown = scores.breakdown || {};
  const skillGaps = app.skillGap || {};
  const suggestions = skillGaps.suggestions || [];

  return (
    <Shell>
      <div className="eyebrow">APPLICATION REPORT</div>
      <h1 className="page-title">Candidate fit evaluation.</h1>
      <div className="panel report">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2>{app.jobId?.title} <small>at {app.jobId?.company}</small></h2>
            {app.resumeFile && (
              <div style={{ marginTop: '6px' }}>
                <a
                  href={`${api.defaults.baseURL}/api/jobs/my/applications/${app._id}/resume?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await api.get(`/api/jobs/my/applications/${app._id}/resume`, { responseType: 'blob' });
                      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = app.resumeFile || 'resume.pdf';
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
                    } catch (err) {
                      window.open(`${api.defaults.baseURL}/api/jobs/my/applications/${app._id}/resume?token=${encodeURIComponent(localStorage.getItem('token') || '')}`, '_blank');
                    }
                  }}
                  className="quiet"
                  style={{ textDecoration: 'none', fontSize: '12px' }}
                >
                  📄 Download submitted resume ({app.resumeFile})
                </a>
              </div>
            )}
          </div>
          {scores.trustIndicator !== undefined && (
            <span className={`trust-pill ${scores.trustIndicator < 70 ? 'danger' : scores.trustIndicator < 90 ? 'warning' : ''}`}>
              Credential Trust: {scores.trustIndicator}%
            </span>
          )}
        </div>

        <div className="score-total">
          {scores.total || 0}
          <small>/ 100 overall fit score (Confidence: {scores.confidence || 85}%)</small>
        </div>

        {/* Component Score Grid */}
        <div className="score-grid">
          <div>
            <div className="score-label">Required Skills <b>{scores.skills || 0} / 45 pts</b></div>
            <div className="bar"><i style={{ width: `${Math.min(100, ((scores.skills || 0) / 45) * 100)}%` }} /></div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '6px 0 0' }}>{breakdown.skillsReason}</p>
          </div>
          <div>
            <div className="score-label">Projects Relevance <b>{scores.projects || 0} / 30 pts</b></div>
            <div className="bar"><i style={{ width: `${Math.min(100, ((scores.projects || 0) / 30) * 100)}%` }} /></div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '6px 0 0' }}>{breakdown.projectsReason}</p>
          </div>
          <div>
            <div className="score-label">Certifications Evidence <b>{scores.certifications || 0} / 20 pts</b></div>
            <div className="bar"><i style={{ width: `${Math.min(100, ((scores.certifications || 0) / 20) * 100)}%` }} /></div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '6px 0 0' }}>{breakdown.certificationsReason}</p>
          </div>
          <div>
            <div className="score-label">Experience & Education <b>{scores.experience || 0} / 5 pts</b></div>
            <div className="bar"><i style={{ width: `${Math.min(100, ((scores.experience || 0) / 5) * 100)}%` }} /></div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '6px 0 0' }}>{breakdown.experienceReason}</p>
          </div>
        </div>

        <p className="muted" style={{ fontSize: '13px', lineHeight: 1.7, background: '#fbfbf8', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--line)' }}>
          {scores.explanation}
        </p>

        {/* Strengths and Gaps */}
        {scores.strengths?.length > 0 && (
          <>
            <h3 style={{ fontSize: '17px', marginTop: '22px' }}>Profile Strengths</h3>
            <ul style={{ fontSize: '12px', color: '#3d4434', lineHeight: 1.7, paddingLeft: '20px' }}>
              {scores.strengths.map((str, idx) => <li key={idx}><strong>✓</strong> {str}</li>)}
            </ul>
          </>
        )}

        {/* Skills Matched */}
        <h3 style={{ fontSize: '17px', marginTop: '22px' }}>Skills Confirmed on Resume</h3>
        <div className="chips">
          {(skillGaps.matched || []).map(s => <span className="good" key={s}>✓ {s}</span>)}
        </div>

        {/* Structured Skills to Grow (Section 7) */}
        <h3 style={{ fontSize: '17px', marginTop: '26px' }}>Skills to Grow & Action Plan</h3>
        {suggestions.length === 0 ? (
          <p className="muted" style={{ fontSize: '12px' }}>No critical skill gaps identified for this role.</p>
        ) : (
          <div className="growth-grid">
            {suggestions.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <div className="growth-card medium" key={idx}>
                    <p className="growth-text">{item}</p>
                  </div>
                );
              }
              return (
                <div className={`growth-card ${item.priority || 'medium'}`} key={idx}>
                  <div className="growth-header">
                    <span className="growth-skill">{item.skill}</span>
                    <span className={`growth-priority ${item.priority}`}>{item.priority} Priority</span>
                  </div>
                  <p className="growth-text">{item.sentence || `${item.whyItMatters} ${item.nextStep}`}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Multi-Document Proof Upload Section (Section 2) */}
        <h3 style={{ fontSize: '17px', marginTop: '30px' }}>Certification Proofs & Document Uploads</h3>
        <p className="muted" style={{ fontSize: '12px' }}>
          Provide verifiable evidence (certificates, transcripts, credentials) to elevate your proof score from claimed (0.3x) to verified (1.0x).
        </p>
        {(app.parsed?.certifications || []).length === 0 ? (
          <div className="empty" style={{ padding: '20px' }}>No certifications listed on this profile.</div>
        ) : (
          app.parsed.certifications.map(c => (
            <MultiFileProofUploader key={c._id} app={app} cert={c} onUpdate={setApp} />
          ))
        )}
      </div>
    </Shell>
  );
}

// -------------------------------------------------------------
// Document Review Modal / Drawer for Recruiter (Section 4)
// -------------------------------------------------------------
function DocumentReviewModal({ app, cert, onClose, onUpdated }) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [checkingAi, setCheckingAi] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const proofFiles = cert.proofFiles || [];
  const currentFile = proofFiles[activeFileIndex];

  // Esc key closes modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function runAiCheck() {
    setCheckingAi(true);
    setError('');
    try {
      const res = await api.post(`/api/recruiter/applications/${app._id}/certifications/${cert._id}/ai-check`);
      onUpdated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete AI verification check.');
    } finally {
      setCheckingAi(false);
    }
  }

  async function handleDecision(status) {
    if (status === 'rejected' && !note.trim()) {
      setError('A rejection reason is required before rejecting a certification.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const res = await api.patch(`/api/recruiter/applications/${app._id}/certifications/${cert._id}/verify`, {
        status,
        note
      });
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record verification decision.');
    } finally {
      setVerifying(false);
    }
  }

  const aiResult = cert.aiCheckResult;

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="review-drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <h3>Verify Credential: {cert.name}</h3>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Candidate: {app.candidateId?.name || app.parsed?.name}
            </span>
          </div>
          <button className="quiet" onClick={onClose}>✕ Close</button>
        </div>

        <div className="drawer-body">
          {/* Credential Details Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#fbfbf8', padding: '14px', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <div>
              <small style={{ color: 'var(--muted)', display: 'block' }}>Claimed Issuer</small>
              <b>{cert.issuer || 'Not specified'}</b>
            </div>
            <div>
              <small style={{ color: 'var(--muted)', display: 'block' }}>Credential ID / Roll No</small>
              <b>{cert.credentialId || 'None provided'}</b>
            </div>
            <div>
              <small style={{ color: 'var(--muted)', display: 'block' }}>Verification URL</small>
              {cert.credentialUrl ? (
                <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                  Open link ↗
                </a>
              ) : (
                <span style={{ color: 'var(--muted)' }}>None provided</span>
              )}
            </div>
            <div>
              <small style={{ color: 'var(--muted)', display: 'block' }}>Current Status</small>
              <span className={`status ${cert.verificationStatus}`}>{cert.verificationStatus}</span>
            </div>
          </div>

          {/* Document Viewer (Embedded PDF or Image with Zoom) */}
          {proofFiles.length === 0 ? (
            <div className="empty" style={{ padding: '30px' }}>
              No proof files uploaded yet by this candidate.
            </div>
          ) : (
            <div className="doc-viewer-container">
              <div className="doc-viewer-toolbar">
                <div>
                  Document {activeFileIndex + 1} of {proofFiles.length}: <b>{currentFile?.originalName}</b>
                </div>
                <div className="doc-viewer-controls">
                  {proofFiles.length > 1 && (
                    <>
                      <button
                        onClick={() => { setActiveFileIndex(i => (i > 0 ? i - 1 : proofFiles.length - 1)); setZoom(1); }}
                      >
                        ◀ Previous
                      </button>
                      <button
                        onClick={() => { setActiveFileIndex(i => (i < proofFiles.length - 1 ? i + 1 : 0)); setZoom(1); }}
                      >
                        Next ▶
                      </button>
                    </>
                  )}
                  {currentFile?.mimeType?.startsWith('image/') && (
                    <>
                      <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>- Zoom</button>
                      <button onClick={() => setZoom(1)}>Reset</button>
                      <button onClick={() => setZoom(z => Math.min(3, z + 0.2))}>+ Zoom</button>
                    </>
                  )}
                </div>
              </div>

              {currentFile?.mimeType === 'application/pdf' ? (
                <iframe
                  className="doc-frame"
                  title="PDF Document Proof"
                  src={`${api.defaults.baseURL}/api/jobs/applications/${app._id}/certifications/${cert._id}/proofs/${currentFile.fileId}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                />
              ) : (
                <div className="image-viewer">
                  <img
                    alt={currentFile?.originalName || 'Certificate proof'}
                    style={{ transform: `scale(${zoom})` }}
                    src={`${api.defaults.baseURL}/api/jobs/applications/${app._id}/certifications/${cert._id}/proofs/${currentFile.fileId}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                  />
                </div>
              )}
            </div>
          )}

          {/* AI Automated Forensic Check Panel (Section 3) */}
          <div className="ai-check-panel">
            <div className="ai-check-head">
              <h4>✨ AI Forensic Verification Analysis</h4>
              {aiResult ? (
                <span className={`verdict-badge ${aiResult.verdict}`}>
                  {aiResult.verdict?.replace('_', ' ')} · {aiResult.confidence}% confidence
                </span>
              ) : (
                <button className="quiet" onClick={runAiCheck} disabled={checkingAi}>
                  {checkingAi ? 'Running forensic check…' : 'Run AI Check'}
                </button>
              )}
            </div>

            {aiResult ? (
              <>
                <div className="compare-grid">
                  <div className="compare-box">
                    <b>Claimed Fields (By Candidate)</b>
                    <div>Name: {app.candidateId?.name || app.parsed?.name}</div>
                    <div>Course: {cert.name}</div>
                    <div>Issuer: {cert.issuer || 'N/A'}</div>
                    <div>ID: {cert.credentialId || 'N/A'}</div>
                  </div>
                  <div className="compare-box">
                    <b>Extracted Evidence (By AI)</b>
                    <div>Extracted Name: {aiResult.extracted?.candidateName || 'N/A'}</div>
                    <div>Extracted Course: {aiResult.extracted?.courseTitle || 'N/A'}</div>
                    <div>Extracted Issuer: {aiResult.extracted?.issuer || 'N/A'}</div>
                    <div>Extracted ID: {aiResult.extracted?.credentialId || 'N/A'}</div>
                  </div>
                </div>

                <ul className="findings-list">
                  {(aiResult.findings || []).map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="quiet" onClick={runAiCheck} disabled={checkingAi} style={{ fontSize: '11px' }}>
                    {checkingAi ? 'Re-running…' : 'Re-run AI Check'}
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                Click "Run AI Check" to cross-reference the certificate against issuer domains, candidate name alignment, and metadata consistency.
              </p>
            )}
          </div>

          {/* Audit Trail (Section 4) */}
          {cert.auditTrail?.length > 0 && (
            <div className="audit-trail">
              <b style={{ textTransform: 'uppercase', fontSize: '10px' }}>Audit History</b>
              {cert.auditTrail.map((entry, idx) => (
                <div className="audit-entry" key={idx}>
                  <span><b>{entry.action?.toUpperCase()}</b> on {new Date(entry.at).toLocaleString()}</span>
                  {entry.note && <p style={{ margin: '2px 0 0', color: 'var(--ink)' }}>Note: {entry.note}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Recruiter Decision Panel */}
          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '16px', borderRadius: '6px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              Recruiter audit note {verifying && <small>(Required if rejecting)</small>}
              <textarea
                rows="2"
                placeholder="e.g. Validated against official Credly portal / Certificate name does not match applicant."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ padding: '8px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '12px' }}
              />
            </label>
            {error && <div className="error" style={{ margin: '10px 0 0', fontSize: '12px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'flex-end' }}>
              <button
                className="quiet danger"
                disabled={verifying}
                onClick={() => handleDecision('rejected')}
              >
                Reject Certificate
              </button>
              <button
                className="primary"
                disabled={verifying}
                onClick={() => handleDecision('verified')}
              >
                Confirm Verified
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Recruiter Management Desk (Sections 4, 8, 9)
// -------------------------------------------------------------
function Recruiter() {
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [apps, setApps] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [niceSkills, setNiceSkills] = useState('');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [msg, setMsg] = useState('');
  const [dupGroups, setDupGroups] = useState([]);
  const [filter, setFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [topSummary, setTopSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [reviewModalData, setReviewModalData] = useState(null); // { app, cert }

  const refreshJobs = () => api.get('/api/recruiter/jobs').then(r => {
    setJobs(r.data);
    setLoading(false);
  });

  useEffect(() => { refreshJobs(); }, []);

  // Section 9: Auto-refresh polling every 8 seconds when recruiter desk is active
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => {
      loadApplicants(selected, filter, minScore, onlyVerified, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [selected, filter, minScore, onlyVerified]);

  async function loadApplicants(j, statusFilter = filter, min = minScore, verifiedOnly = onlyVerified, silent = false) {
    if (!silent) setSelected(j);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (min !== '') params.minScore = min;
    if (verifiedOnly) params.onlyVerified = 'true';
    try {
      const r = await api.get(`/api/recruiter/jobs/${j._id}/applicants`, { params });
      setApps(r.data);
    } catch (err) {
      if (!silent) setMsg('Failed to load applicants.');
    }
  }

  // Section 8: Fix "Suggest skills with AI" button
  async function extract() {
    if (!description.trim() || description.trim().length < 20) {
      setMsg('Please enter a role description with at least 20 characters before asking AI to extract skills.');
      return;
    }
    setExtracting(true);
    setMsg('');
    try {
      const r = await api.post('/api/recruiter/extract-skills', { title, description });
      const reqArr = r.data.requiredSkills || [];
      const niceArr = r.data.niceToHaveSkills || [];
      setSkills(reqArr.join(', '));
      setNiceSkills(niceArr.join(', '));
      setMsg(`AI successfully suggested ${reqArr.length} required and ${niceArr.length} nice-to-have skills.`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Could not extract skills with AI.');
    } finally {
      setExtracting(false);
    }
  }

  async function createJob(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/jobs', {
        title,
        description,
        requiredSkills: skills.split(',').map(s => s.trim()).filter(Boolean),
        niceToHaveSkills: niceSkills.split(',').map(s => s.trim()).filter(Boolean)
      });
      setTitle('');
      setDescription('');
      setSkills('');
      setNiceSkills('');
      refreshJobs();
      setMsg('Job successfully published.');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Could not publish role.');
    }
  }

  async function fetchTopSummary() {
    if (!selected) return;
    setLoadingSummary(true);
    try {
      const res = await api.get(`/api/recruiter/jobs/${selected._id}/top-summary`);
      setTopSummary(res.data.summary);
    } catch {
      setTopSummary('Could not generate top candidates comparative summary.');
    } finally {
      setLoadingSummary(false);
    }
  }

  const [downloadingId, setDownloadingId] = useState(null);

  async function updateStatus(a, s) {
    await api.patch(`/api/recruiter/applications/${a._id}/status`, { status: s });
    loadApplicants(selected);
  }

  async function downloadResume(e, a) {
    if (e) e.preventDefault();
    setDownloadingId(a._id);
    try {
      const response = await api.get(`/api/recruiter/applications/${a._id}/resume`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = a.resumeFile || `${(a.candidateName || 'candidate').replace(/\s+/g, '_')}_resume.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000);
    } catch (err) {
      console.error('Download resume error:', err);
      const token = localStorage.getItem('token');
      if (token) {
        window.open(`${api.defaults.baseURL}/api/recruiter/applications/${a._id}/resume?token=${encodeURIComponent(token)}`, '_blank');
      } else {
        alert(err.response?.data?.error || 'Failed to download resume.');
      }
    } finally {
      setDownloadingId(null);
    }
  }

  async function duplicates() {
    try {
      const r = await api.post(`/api/recruiter/jobs/${selected._id}/duplicates`);
      setDupGroups(r.data.groups);
      setMsg(r.data.groups.length ? `${r.data.groups.length} possible duplicate pair(s) detected.` : 'No duplicate submissions found.');
    } catch {
      setMsg('Could not run duplicate check.');
    }
  }

  return (
    <Shell>
      <div className="eyebrow">RECRUITER DESK</div>
      <h1 className="page-title">Candidate screening & ranking.</h1>

      <div className="stats">
        <div><b>{jobs.length}</b><span>Total Roles</span></div>
        <div><b>{jobs.filter(j => j.status === 'open').length}</b><span>Active Roles</span></div>
        <div><b>{apps.length}</b><span>Applicants Loaded</span></div>
      </div>

      <div className="recruit-layout">
        {/* Create Job Form (Section 8) */}
        <form className="panel job-form" onSubmit={createJob}>
          <div className="eyebrow">NEW ROLE</div>
          <h2>Post a position</h2>
          <label>Role title<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" /></label>
          <label>Description<textarea required rows="6" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe responsibilities and requirements (min 20 characters)..." /></label>
          <button
            type="button"
            className="quiet"
            disabled={extracting || description.trim().length < 20}
            onClick={extract}
            style={{ fontWeight: 600 }}
          >
            {extracting ? '✨ Analyzing with AI…' : '✨ Suggest skills with AI'}
          </button>
          <label>Required skills <small>(comma-separated)</small>
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Node.js, Express, MongoDB, React" />
          </label>
          <label>Nice-to-have skills <small>(comma-separated)</small>
            <input value={niceSkills} onChange={e => setNiceSkills(e.target.value)} placeholder="Docker, AWS, TypeScript" />
          </label>
          <button className="primary full">Publish role</button>
          {msg && <div className="notice">{msg}</div>}
        </form>

        <section>
          <div className="section-heading">
            <h2>Your active roles</h2>
            {loading && <small>Loading…</small>}
          </div>
          {jobs.map(j => (
            <button
              className={`my-job ${selected?._id === j._id ? 'active' : ''}`}
              key={j._id}
              onClick={() => { setTopSummary(''); loadApplicants(j); }}
            >
              <span>
                <b>{j.title}</b>
                <small>{j.status} · {j.requiredSkills.slice(0, 4).join(', ')}</small>
              </span>
              <i>↗</i>
            </button>
          ))}

          {selected && (
            <>
              <div className="section-heading" style={{ marginTop: '28px' }}>
                <h2>Applicants: {selected.title}</h2>
                <div className="actions">
                  <button className="quiet" onClick={fetchTopSummary} disabled={loadingSummary}>
                    {loadingSummary ? 'Analyzing…' : '✨ AI Top Candidates Analysis'}
                  </button>
                  <button className="quiet" onClick={duplicates}>Check duplicates</button>
                </div>
              </div>

              {/* Top Candidates Summary Card (Section 9) */}
              {topSummary && (
                <div className="top-summary-card">
                  <h3>Top Candidates Comparative Overview</h3>
                  <p>{topSummary}</p>
                </div>
              )}

              {/* Recruiter Filters (Section 9) */}
              <div className="recruiter-filters">
                <div className="filter-tabs">
                  <button className={filter === '' ? 'active' : ''} onClick={() => { setFilter(''); loadApplicants(selected, ''); }}>All</button>
                  <button className={filter === 'shortlisted' ? 'active' : ''} onClick={() => { setFilter('shortlisted'); loadApplicants(selected, 'shortlisted'); }}>Shortlisted</button>
                  <button className={filter === 'applied' ? 'active' : ''} onClick={() => { setFilter('applied'); loadApplicants(selected, 'applied'); }}>Applied</button>
                  <button className={filter === 'rejected' ? 'active' : ''} onClick={() => { setFilter('rejected'); loadApplicants(selected, 'rejected'); }}>Rejected</button>
                </div>
                <div className="filter-controls">
                  <label>
                    Min score:
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={minScore}
                      placeholder="0"
                      onChange={e => {
                        const val = e.target.value;
                        setMinScore(val);
                        loadApplicants(selected, filter, val, onlyVerified);
                      }}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={onlyVerified}
                      onChange={e => {
                        const checked = e.target.checked;
                        setOnlyVerified(checked);
                        loadApplicants(selected, filter, minScore, checked);
                      }}
                    />
                    Only verified certs
                  </label>
                </div>
              </div>

              {/* Ranked Applicant Cards (Section 4, 5, 9) */}
              <div className="applicants">
                {apps.map(a => (
                  <article className="applicant" key={a._id}>
                    <div className="applicant-top">
                      <div>
                        <b>
                          <span className={`rank-badge ${a.rank === 1 ? 'top-1' : a.rank <= 3 ? 'top-3' : ''}`}>
                            #{a.rank || '–'}
                          </span>
                          {a.candidateId?.name || a.parsed?.name || 'Applicant'}
                        </b>
                        <small>{a.candidateId?.email || a.parsed?.email} · {a.status}</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {a.scores?.trustIndicator !== undefined && (
                          <span className={`trust-pill ${a.scores.trustIndicator < 80 ? 'warning' : ''}`}>
                            Trust: {a.scores.trustIndicator}%
                          </span>
                        )}
                        <span className="score-pill">{a.scores?.total || 0}/100</span>
                      </div>
                    </div>

                    <div className="mini-bars">
                      <span>Skills<i><b style={{ width: `${Math.min(100, ((a.scores?.skills || 0) / 45) * 100)}%` }} /></i></span>
                      <span>Projects<i><b style={{ width: `${Math.min(100, ((a.scores?.projects || 0) / 30) * 100)}%` }} /></i></span>
                      <span>Certs<i><b style={{ width: `${Math.min(100, ((a.scores?.certifications || 0) / 20) * 100)}%` }} /></i></span>
                    </div>

                    <details>
                      <summary>Score reasons, evidence breakdown & credentials</summary>
                      <p style={{ marginTop: '8px' }}>{a.scores?.explanation}</p>
                      <ul>
                        {(a.scores?.reasons || []).map((x, idx) => <li key={idx}>{x}</li>)}
                      </ul>
                      <div style={{ marginTop: '10px' }}>
                        <b style={{ fontSize: '11px', color: 'var(--ink)' }}>Certifications & Proofs:</b>
                        {(a.parsed?.certifications || []).map(c => (
                          <div className="cert-row" key={c._id}>
                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                            <span className={`status ${c.verificationStatus}`}>{c.verificationStatus?.replace('_', ' ')}</span>
                            <small>({(c.proofFiles || []).length} file(s))</small>
                            <button
                              className="quiet"
                              onClick={() => setReviewModalData({ app: a, cert: c })}
                            >
                              🔍 View documents & verify
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>

                    <div className="actions">
                      <button className="quiet" onClick={() => updateStatus(a, 'shortlisted')}>Shortlist</button>
                      <button className="quiet danger" onClick={() => updateStatus(a, 'rejected')}>Reject</button>
                      <a
                        href={`${api.defaults.baseURL}/api/recruiter/applications/${a._id}/resume?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                        onClick={(e) => downloadResume(e, a)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="quiet"
                        style={{ textDecoration: 'none' }}
                      >
                        {downloadingId === a._id ? 'Downloading…' : 'Download resume'}
                      </a>
                    </div>
                  </article>
                ))}
                {!apps.length && <div className="empty">No applicants currently matching criteria for this role.</div>}
              </div>

              {/* Duplicate Detection List */}
              {dupGroups.length > 0 && (
                <div className="duplicate-list" style={{ marginTop: '24px' }}>
                  <h3>Possible duplicate applications</h3>
                  {dupGroups.map((g, i) => (
                    <article className="duplicate-card" key={`${g.applications[0].id}-${g.applications[1].id}`}>
                      <span className="status rejected">Possible duplicate · {g.similarity}% similarity</span>
                      <div className="duplicate-compare">
                        <div>
                          <b>{g.applications[0].candidate}</b>
                          <small>{g.applications[0].id}</small>
                          <p>{g.applications[0].preview}</p>
                        </div>
                        <strong>↔</strong>
                        <div>
                          <b>{g.applications[1].candidate}</b>
                          <small>{g.applications[1].id}</small>
                          <p>{g.applications[1].preview}</p>
                        </div>
                      </div>
                      <small>{g.reason}</small>
                      <div className="actions">
                        <button className="quiet" onClick={() => setDupGroups(groups => groups.filter((_, n) => n !== i))}>Dismiss</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Document Review Drawer Modal (Section 4) */}
      {reviewModalData && (
        <DocumentReviewModal
          app={reviewModalData.app}
          cert={reviewModalData.cert}
          onClose={() => setReviewModalData(null)}
          onUpdated={updatedApp => {
            setApps(prev => prev.map(item => (item._id === updatedApp._id ? updatedApp : item)));
            setReviewModalData(null);
          }}
        />
      )}
    </Shell>
  );
}

// -------------------------------------------------------------
// AI Career Assistant in Candidate Dashboard (Section 10)
// -------------------------------------------------------------
function AICareerAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your HireWise Career Assistant. Ask me about the best matching jobs for your skills, certificate alignments, or what you should learn next."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'Best jobs for my skills',
    'Jobs that fit my certificates',
    'What should I learn to qualify?',
    'Show highest match roles'
  ];

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(textToSend) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/assistant/chat', {
        message: text,
        history: messages.slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
      });

      const botMsg = {
        sender: 'bot',
        text: res.data.reply,
        jobs: res.data.recommendedJobs || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: err.response?.data?.error || 'Sorry, I encountered an issue analyzing jobs. Please retry.' }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="assistant-toggle-btn"
        onClick={() => setOpen(!open)}
        aria-label="Open AI Career Assistant"
      >
        <span>✨</span> AI Career Assistant
      </button>

      {open && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <b><span>✨</span> Career Assistant</b>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="assistant-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`assistant-msg ${m.sender}`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {m.jobs?.length > 0 && (
                  <div className="chat-jobs-grid">
                    {m.jobs.map(j => (
                      <div className="chat-job-card" key={j.id}>
                        <div className="chat-job-top">
                          <b>{j.title}</b>
                          <span className="chat-fit-pill">{j.fitScore}% Fit</span>
                        </div>
                        <small style={{ color: 'var(--muted)' }}>{j.company}</small>
                        <div style={{ fontSize: '10px', color: '#556b2f' }}>
                          Matched: {(j.matchedSkills || []).slice(0, 3).join(', ') || 'General profile'}
                        </div>
                        {j.missingSkills?.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#b75507' }}>
                            To learn: {j.missingSkills.slice(0, 2).join(', ')}
                          </div>
                        )}
                        <div className="chat-job-actions">
                          <Link to={`/jobs/${j.id}`} className="primary" onClick={() => setOpen(false)}>
                            View & Apply ↗
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="assistant-msg bot">
                <i>Thinking & scoring open roles…</i>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="assistant-quick-prompts">
            {quickPrompts.map(prompt => (
              <button
                key={prompt}
                className="assistant-chip"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="assistant-input-box"
            onSubmit={e => { e.preventDefault(); sendMessage(); }}
          >
            <input
              placeholder="Ask about roles, skills, certificates..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button disabled={loading || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// App Routing
// -------------------------------------------------------------
function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'recruiter' ? '/recruiter' : '/jobs'} /> : <Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage initialMode="login" />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />
      <Route path="/jobs" element={<Guard role="candidate"><JobBoard /></Guard>} />
      <Route path="/jobs/:id" element={<Guard role="candidate"><JobDetail /></Guard>} />
      <Route path="/applications" element={<Guard role="candidate"><Applications /></Guard>} />
      <Route path="/applications/:id" element={<Guard role="candidate"><FitReport /></Guard>} />
      <Route path="/recruiter" element={<Guard role="recruiter"><Recruiter /></Guard>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}
