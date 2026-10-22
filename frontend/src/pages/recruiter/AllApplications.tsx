import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecruiterJobs, getJobApplicants } from '../../api/recruiter';
import {
  Badge,
  Button,
  Card,
  Heading,
  Icon,
  PageHeader,
  ScoreRing,
} from '../../components/ui';
import type { Application, Job } from '../../types';

interface AppWithJob {
  app: Application;
  job: Job;
}

export const AllApplications = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'shortlisted' | 'applied' | 'rejected'>('all');

  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      try {
        const jobs = await getRecruiterJobs();
        const promises = jobs.map(async (j) => {
          try {
            const apps = await getJobApplicants(j._id);
            return apps.map((a) => ({ app: a, job: j }));
          } catch {
            return [];
          }
        });
        const nested = await Promise.all(promises);
        if (mounted) {
          setItems(nested.flat());
        }
      } catch (err) {
        console.error('Failed to load recruiter applications', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  const total = items.length;
  const shortlisted = items.filter((x) => x.app.status === 'shortlisted').length;
  const inReview = items.filter((x) => x.app.status === 'applied').length;
  const rejected = items.filter((x) => x.app.status === 'rejected').length;

  const filtered = items.filter((x) => {
    if (filter === 'all') return true;
    return x.app.status === filter;
  });

  return (
    <main className="page">
      <PageHeader
        eyebrow="Recruiter Portal"
        title="Candidate Applications"
        text="Review, filter, and manage applicant evaluations across all your posted roles."
        action={
          <Button variant="primary" icon="plus" onClick={() => navigate('/recruiter/jobs/new')}>
            Post New Role
          </Button>
        }
      />

      <div className="stats-grid">
        <Card
          className={`stat card-clickable ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--teal)' : undefined }}
        >
          <small>Total Candidates</small>
          <strong>{total}</strong>
          <span>Across all roles</span>
        </Card>
        <Card
          className={`stat card-clickable ${filter === 'shortlisted' ? 'active' : ''}`}
          onClick={() => setFilter('shortlisted')}
          style={{ cursor: 'pointer', border: filter === 'shortlisted' ? '2px solid var(--teal)' : undefined }}
        >
          <small>Shortlisted</small>
          <strong>{shortlisted}</strong>
          <span className={shortlisted > 0 ? 'positive' : ''}>Ready for interview</span>
        </Card>
        <Card
          className={`stat card-clickable ${filter === 'applied' ? 'active' : ''}`}
          onClick={() => setFilter('applied')}
          style={{ cursor: 'pointer', border: filter === 'applied' ? '2px solid var(--teal)' : undefined }}
        >
          <small>Awaiting Review</small>
          <strong>{inReview}</strong>
          <span>Unreviewed profiles</span>
        </Card>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({total})
        </button>
        <button
          type="button"
          className={`chip ${filter === 'shortlisted' ? 'active' : ''}`}
          onClick={() => setFilter('shortlisted')}
        >
          Shortlisted ({shortlisted})
        </button>
        <button
          type="button"
          className={`chip ${filter === 'applied' ? 'active' : ''}`}
          onClick={() => setFilter('applied')}
        >
          Awaiting Review ({inReview})
        </button>
        {rejected > 0 && (
          <button
            type="button"
            className={`chip ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({rejected})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <span className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center', marginTop: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'var(--paper)', borderRadius: '50%', marginBottom: '16px' }}>
            <Icon name="briefcase" size={32} />
          </div>
          <Heading level={3}>
            {total === 0 ? 'No applications received yet' : 'No candidates match this filter'}
          </Heading>
          <p style={{ marginTop: '8px', maxWidth: '440px', marginInline: 'auto' }}>
            {total === 0
              ? 'Once candidates submit their resumes for your open engineering roles, they will appear here with AI screening scores.'
              : 'Try selecting a different filter above to view other applicants.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
          {filtered.map(({ app, job }) => {
            const fitScore = app.scores?.total ?? 0;
            const candidateName =
              app.parsed?.name ||
              (typeof app.candidateId === 'object' ? app.candidateId?.name : null) ||
              'Applicant';
            const candidateEmail =
              app.parsed?.email ||
              (typeof app.candidateId === 'object' ? app.candidateId?.email : null);

            return (
              <Card
                key={app._id}
                style={{
                  padding: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '20px',
                  alignItems: 'center',
                }}
              >
                <div
                  className="company-mark"
                  style={{ width: '48px', height: '48px', fontSize: '1.2rem', alignSelf: 'start' }}
                >
                  {candidateName.slice(0, 1).toUpperCase()}
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <Heading level={3} style={{ margin: 0 }}>
                      {candidateName}
                    </Heading>
                    <Badge
                      tone={
                        app.status === 'shortlisted'
                          ? 'teal'
                          : app.status === 'rejected'
                          ? 'red'
                          : 'grey'
                      }
                    >
                      {app.status === 'shortlisted'
                        ? 'Shortlisted'
                        : app.status === 'rejected'
                        ? 'Rejected'
                        : 'Under Review'}
                    </Badge>
                  </div>

                  <p style={{ fontSize: '0.88rem' }}>
                    Role: <strong>{job.title}</strong> · {candidateEmail || 'No email provided'}
                  </p>

                  {app.skillGap && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {app.skillGap.matched?.slice(0, 4).map((skill) => (
                        <Badge key={skill} tone="sage">
                          ✓ {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '12px',
                  }}
                >
                  <ScoreRing value={fitScore} size="small" />
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/recruiter/jobs/${job._id}/applicants`)}
                  >
                    Review in Pipeline
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
};
