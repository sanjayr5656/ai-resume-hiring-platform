import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { login, register } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { Button, Field, Heading, Icon, Logo } from '../components/ui';
import type { Role } from '../types';

export const Auth = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const initialRole = (searchParams.get('role') as Role) || 'candidate';
  const initialMode = searchParams.get('mode') === 'login' ? 'login' : 'register';

  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    searchParams.set('role', newRole);
    setSearchParams(searchParams, { replace: true });
  };

  const handleModeChange = (newMode: 'register' | 'login') => {
    setMode(newMode);
    setGeneralError('');
    setSubmitted(false);
    searchParams.set('mode', newMode);
    setSearchParams(searchParams, { replace: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setGeneralError('');

    // Client-side validations
    if (mode === 'register') {
      if (!name.trim()) return;
      if (role === 'recruiter' && !company.trim()) return;
    }
    if (!email.trim() || !password) return;
    if (mode === 'register' && password.length < 8) {
      setGeneralError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          company: role === 'recruiter' ? company.trim() : undefined,
        });
        signIn(res, staySignedIn);
        toast(`Welcome to HireLens, ${res.user.name.split(' ')[0]}!`);
        navigate(res.user.role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true });
      } else {
        const res = await login({
          email: email.trim().toLowerCase(),
          password,
        });
        signIn(res, staySignedIn);
        toast(`Welcome back, ${res.user.name.split(' ')[0]}!`);
        navigate(res.user.role === 'recruiter' ? '/recruiter' : '/candidate', { replace: true });
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Authentication failed. Please check your credentials.');
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-art">
        <button className="back-link" type="button" onClick={() => navigate('/')}>
          <Icon name="back" /> Back
        </button>
        <div className="auth-hero-illustration">
          <img
            src="/hirelens-hero.svg"
            alt="HireLens AI Resume Screener Illustration"
            className="auth-hero-img"
          />
        </div>
        <blockquote>“Smart resume screening that values the real skills and story behind every applicant.”</blockquote>
      </section>

      <section className="auth-form">
        <div className="auth-box">
          <Logo goHome={() => navigate('/')} />
          <span className="eyebrow">
            {mode === 'register' ? 'Create your account' : 'Welcome back'}
          </span>
          <Heading level={1}>
            {mode === 'register'
              ? 'A clearer next step starts here.'
              : 'Sign in to your HireLens account.'}
          </Heading>

          <div className="segment" role="group" aria-label="Role selection">
            <button
              type="button"
              className={role === 'candidate' ? 'active' : ''}
              onClick={() => handleRoleChange('candidate')}
            >
              Candidate
            </button>
            <button
              type="button"
              className={role === 'recruiter' ? 'active' : ''}
              onClick={() => handleRoleChange('recruiter')}
            >
              Recruiter
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {generalError && (
              <div
                className="field-error"
                role="alert"
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--red)',
                  color: 'var(--red-text)',
                  fontSize: '0.85rem',
                }}
              >
                {generalError}
              </div>
            )}

            {mode === 'register' && (
              <>
                <Field
                  label="Full name"
                  placeholder="Your full name"
                  value={name}
                  onChange={setName}
                  required
                  error={submitted && !name.trim() ? 'Please tell us your name.' : undefined}
                />
                {role === 'recruiter' && (
                  <Field
                    label="Company name"
                    placeholder="Where do you work?"
                    value={company}
                    onChange={setCompany}
                    required
                    error={
                      submitted && !company.trim()
                        ? 'Company name is required for recruiters.'
                        : undefined
                    }
                  />
                )}
              </>
            )}

            <Field
              label="Email address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={setEmail}
              required
              error={
                submitted && (!email.trim() || !/^\S+@\S+\.\S+$/.test(email))
                  ? 'Please enter a valid email address.'
                  : undefined
              }
            />

            <Field
              label="Password"
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
              type="password"
              value={password}
              onChange={setPassword}
              required
              hint={mode === 'register' ? 'Use 8+ characters for a secure account.' : undefined}
              error={
                submitted && !password
                  ? 'Please enter your password.'
                  : submitted && mode === 'register' && password.length < 8
                  ? 'Password must be at least 8 characters.'
                  : undefined
              }
            />

            <label className="check-row" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
              />
              <span>Stay signed in on this device</span>
            </label>

            <Button type="submit" loading={loading}>
              {mode === 'register' ? 'Create account' : 'Sign in'}{' '}
              <Icon name="arrow" />
            </Button>
          </form>

          <p className="auth-foot">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => handleModeChange('login')}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account yet?{' '}
                <button type="button" onClick={() => handleModeChange('register')}>
                  Create account
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
};
