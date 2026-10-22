import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyApplications } from '../../api/jobs';
import { getJobs } from '../../api/jobs';
import {
  Badge,
  Button,
  Card,
  Heading,
  Icon,
  PageHeader,
  ScoreRing,
  SectionTitle,
} from '../../components/ui';
import type { Application, Job } from '../../types';

export const CandidateHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<Application[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute real date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [apps, jobs] = await Promise.all([
          getMyApplications().catch(() => []),
          getJobs().catch(() => []),
        ]);
        if (mounted) {
          setApplications(apps);
          setRecommendedJobs(jobs.slice(0, 4));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const totalApps = applications.length;
  const shortlistedCount = applications.filter((a) => a.status === 'shortlisted').length;

  // Derive unique skills to grow
  const uniqueMissingSkills = Array.from(
    new Set(applications.flatMap((a) => a.skillGap?.missing || []))
  );
  const skillsToGrowCount = uniqueMissingSkills.length;

  // Latest application for tracker
  const latestApp = applications[0];
  const latestJob = latestApp
    ? typeof latestApp.jobId === 'object'
      ? latestApp.jobId
      : null
    : null;

  // Profile readiness score derived from real candidate data
  const hasResume = applications.length > 0;
  const totalCerts = applications.reduce(
    (acc, a) => acc + (a.parsed?.certifications?.length || 0),
    0
  );
  const verifiedCerts = applications.reduce(
    (acc, a) =>
      acc + (a.parsed?.certifications?.filter((c) => c.verificationStatus === 'verified').length || 0),
    0
  );

  let profileScore = 40;
  if (hasResume) profileScore += 30;
  if (totalCerts > 0) profileScore += 15;
  if (verifiedCerts > 0) profileScore += 15;
  profileScore = Math.min(100, profileScore);

  return (
    <main className="page">
      <PageHeader
        eyebrow={todayFormatted}
        title={<>Good morning, {firstName}. Match your skills with precision.</>}
        text="Empowering your job search with AI-driven resume screening and transparent skill insights."
      />

      <div className="home-grid">
        <Card className="profile-card">
          <ScoreRing value={profileScore} size="large" label="profile" />
          <div>
            <Badge tone={profileScore >= 70 ? 'sage' : 'amber'}>
              {profileScore >= 70 ? 'Looking strong' : 'Profile in progress'}
            </Badge>
            <Heading level={3}>
              {profileScore >= 70
                ? 'Your profile has a clear point of view.'
                : 'Upload proof or apply to build your profile.'}
            </Heading>
            <p>
              {profileScore >= 70
                ? 'Add verified credentials to help recruiters confirm your technical impact.'
                : 'Upload a résumé and verify your certifications to stand out to engineering teams.'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <Button variant="secondary" onClick={() => navigate('/candidate/certificates')}>
                {totalCerts > 0 ? 'Manage proof' : 'Add proof'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/candidate/dashboard')}>
                Analytics & Insights →
              </Button>
            </div>
          </div>
        </Card>

        <div className="stats-grid">
          <Card
            className="stat card-clickable"
            onClick={() => navigate('/candidate/applications')}
            title="Click to view all applications"
            style={{ cursor: 'pointer' }}
          >
            <small>Applications</small>
            <strong>{totalApps}</strong>
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>
              {totalApps === 0 ? 'No applications yet' : `${totalApps} submitted →`}
            </span>
          </Card>
          <Card
            className="stat card-clickable"
            onClick={() => navigate('/candidate/applications')}
            title="Click to view applications"
            style={{ cursor: 'pointer' }}
          >
            <small>Shortlisted</small>
            <strong>{shortlistedCount}</strong>
            <span className={shortlistedCount > 0 ? 'positive' : ''}>
              {shortlistedCount > 0 ? 'Review active →' : 'Awaiting review'}
            </span>
          </Card>
          <Card
            className="stat card-clickable"
            onClick={() => navigate('/candidate/dashboard')}
            title="Click to view skills analytics"
            style={{ cursor: 'pointer' }}
          >
            <small>Skills to grow</small>
            <strong>{skillsToGrowCount}</strong>
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>Skills gap analysis →</span>
          </Card>
        </div>
      </div>

      <SectionTitle
        title="Recommended for you"
        text="Active engineering roles open for applications."
        action={
          <button
            type="button"
            className="text-link"
            onClick={() => navigate('/candidate/jobs')}
          >
            See all jobs <Icon name="arrow" />
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <span className="spinner" />
        </div>
      ) : recommendedJobs.length === 0 ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p>No open jobs posted yet. Check back soon!</p>
        </Card>
      ) : (
        <div className="job-row">
          {recommendedJobs.map((job) => {
            const userAppForJob = applications.find(
              (a) => (typeof a.jobId === 'string' ? a.jobId : a.jobId?._id) === job._id
            );
            const fitScore = userAppForJob?.scores?.total;

            return (
              <Card
                className="job-card"
                key={job._id}
                onClick={() => navigate(`/candidate/jobs/${job._id}`)}
              >
                <div className="company-mark">{(job.company || 'C').slice(0, 1).toUpperCase()}</div>
                <div className="job-main">
                  <small>{job.company} · Remote</small>
                  <Heading level={3}>{job.title}</Heading>
                  <div className="chip-row">
                    {job.requiredSkills?.slice(0, 3).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </div>
                </div>
                {fitScore !== undefined ? (
                  <ScoreRing value={fitScore} size="small" />
                ) : (
                  <Badge tone="teal">Explore</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <SectionTitle title="Application tracker" text="A calm view of what’s moving." />

      {latestApp && latestJob ? (
        <Card className="tracker">
          <div>
            <strong>{latestJob.title}</strong>
            <small>
              {latestJob.company} · Applied{' '}
              {new Date(latestApp.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </small>
          </div>
          <div className="stepper">
            <span className="done">Applied</span>
            <span
              className={
                latestApp.status === 'shortlisted' || latestApp.status === 'rejected'
                  ? 'done'
                  : 'current'
              }
            >
              Under review
            </span>
            <span className={latestApp.status !== 'applied' ? 'current' : ''}>
              {latestApp.status === 'shortlisted'
                ? 'Shortlisted'
                : latestApp.status === 'rejected'
                ? 'Decision made'
                : 'Decision'}
            </span>
          </div>
          <Badge
            tone={
              latestApp.status === 'shortlisted'
                ? 'teal'
                : latestApp.status === 'rejected'
                ? 'red'
                : 'grey'
            }
          >
            {latestApp.status === 'shortlisted'
              ? 'Shortlisted'
              : latestApp.status === 'rejected'
              ? 'Not selected'
              : 'Applied'}
          </Badge>
        </Card>
      ) : (
        <Card style={{ padding: '24px', textAlign: 'center' }}>
          <p>You haven’t applied to any roles yet. Explore open roles above to get started!</p>
        </Card>
      )}
    </main>
  );
};
