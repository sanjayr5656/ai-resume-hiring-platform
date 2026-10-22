import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getJobApplicants, getRecruiterJobs } from '../../api/recruiter';
import { getErrorMessage } from '../../api/client';
import { Badge, Button, Card, Heading, Icon, PageHeader, Progress, SectionTitle } from '../../components/ui';
import type { Application, Job } from '../../types';

interface JobWithStats {
  job: Job;
  applicantsCount: number;
  shortlistedCount: number;
  pendingProofCount: number;
}

export const RecruiterHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobStats, setJobStats] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const jobs = await getRecruiterJobs();
        const statsPromises = jobs.map(async (j) => {
          try {
            const apps = await getJobApplicants(j._id);
            const shortlisted = apps.filter((a) => a.status === 'shortlisted').length;
            const pendingProof = apps.filter((a) =>
              a.parsed?.certifications?.some(
                (c) => c.verificationStatus === 'proof_provided' || c.verificationStatus === 'ai_checked'
              )
            ).length;
            return {
              job: j,
              applicantsCount: apps.length,
              shortlistedCount: shortlisted,
              pendingProofCount: pendingProof,
            };
          } catch {
            return {
              job: j,
              applicantsCount: 0,
              shortlistedCount: 0,
              pendingProofCount: 0,
            };
          }
        });

        const resolved = await Promise.all(statsPromises);
        if (mounted) setJobStats(resolved);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load roles'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const openJobsCount = jobStats.filter((s) => s.job.status === 'open').length;
  const totalApplicants = jobStats.reduce((acc, s) => acc + s.applicantsCount, 0);
  const totalShortlisted = jobStats.reduce((acc, s) => acc + s.shortlistedCount, 0);
  const totalPendingVerifications = jobStats.reduce((acc, s) => acc + s.pendingProofCount, 0);

  return (
    <main className="page">
      <PageHeader
        eyebrow="Recruiter workspace"
        title={<>Good morning, {firstName}. Smarter screening, faster hiring.</>}
        text="AI-powered resume evaluation, objective fit scoring, and verified credentials to identify top talent effortlessly."
        action={
          <Button icon="plus" onClick={() => navigate('/recruiter/jobs/new')}>
            Create job
          </Button>
        }
      />

      <div className="stats-grid four">
        <Card className="stat">
          <small>Open jobs</small>
          <strong>{openJobsCount}</strong>
          <span>{jobStats.length} total roles</span>
        </Card>
        <Card
          className="stat card-clickable"
          onClick={() => navigate('/recruiter/applications')}
          title="Click to view all applicants"
          style={{ cursor: 'pointer' }}
        >
          <small>Applicants</small>
          <strong>{totalApplicants}</strong>
          <span className={totalApplicants > 0 ? 'positive' : ''} style={{ fontWeight: 600 }}>
            {totalApplicants > 0 ? `${totalApplicants} total candidates →` : 'Across all searches'}
          </span>
        </Card>
        <Card
          className="stat card-clickable"
          onClick={() => navigate('/recruiter/applications')}
          title="Click to view shortlisted candidates"
          style={{ cursor: 'pointer' }}
        >
          <small>Shortlisted</small>
          <strong>{totalShortlisted}</strong>
          <span>Advancing candidates →</span>
        </Card>
        <Card className="stat">
          <small>Pending verifications</small>
          <strong>{totalPendingVerifications}</strong>
          <span className={totalPendingVerifications > 0 ? 'coral-text' : ''}>
            {totalPendingVerifications > 0 ? 'Needs review' : 'All caught up'}
          </span>
        </Card>
      </div>

      <SectionTitle
        title="Open roles"
        text="A spacious view of your active candidate searches."
        action={
          <Button variant="ghost" onClick={() => navigate('/recruiter/jobs/new')}>
            <Icon name="plus" /> Post new role
          </Button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <span className="spinner" />
        </div>
      ) : error ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red-text)' }}>{error}</p>
        </Card>
      ) : jobStats.length === 0 ? (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <Heading level={3}>No roles posted yet</Heading>
          <p style={{ marginTop: '8px' }}>
            Get started by posting an engineering role with custom scoring weights.
          </p>
          <Button
            style={{ marginTop: '16px' }}
            icon="plus"
            onClick={() => navigate('/recruiter/jobs/new')}
          >
            Create your first job
          </Button>
        </Card>
      ) : (
        <div className="role-list">
          {jobStats.map(({ job, applicantsCount }) => (
            <Card
              className="role-row"
              key={job._id}
              onClick={() => navigate(`/recruiter/jobs/${job._id}/applicants`)}
            >
              <div className="company-mark">
                <Icon name="briefcase" />
              </div>
              <div>
                <Heading level={3}>{job.title}</Heading>
                <small>
                  {job.company} · Remote · Posted{' '}
                  {new Date(job.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </small>
              </div>
              <div className="app-count">
                <span>
                  {applicantsCount} {applicantsCount === 1 ? 'applicant' : 'applicants'}
                </span>
                <Progress value={Math.min(100, applicantsCount * 10)} />
              </div>
              <Badge tone={job.status === 'open' ? 'sage' : 'grey'}>
                {job.status === 'open' ? 'Open' : 'Closed'}
              </Badge>
              <Icon name="arrow" />
            </Card>
          ))}
        </div>
      )}
    </main>
  );
};
