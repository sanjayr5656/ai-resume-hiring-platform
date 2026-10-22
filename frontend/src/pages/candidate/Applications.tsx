import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyApplications } from '../../api/jobs';
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

export const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'shortlisted' | 'applied' | 'rejected'>('all');

  useEffect(() => {
    let mounted = true;
    async function loadApps() {
      try {
        const apps = await getMyApplications();
        if (mounted) setApplications(apps);
      } catch (err) {
        console.error('Failed to load applications', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadApps();
    return () => {
      mounted = false;
    };
  }, []);

  const totalApps = applications.length;
  const shortlistedCount = applications.filter((a) => a.status === 'shortlisted').length;
  const inReviewCount = applications.filter((a) => a.status === 'applied').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const filteredApps = applications.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  return (
    <main className="page">
      <PageHeader
        eyebrow="Candidate Portal"
        title="My Applications"
        text="Track your submitted resumes, AI fit scoring breakdown, and recruiter evaluation progress."
        action={
          <Button variant="primary" onClick={() => navigate('/candidate/jobs')}>
            <Icon name="search" /> Browse More Roles
          </Button>
        }
      />

      <div className="stats-grid">
        <Card
          className={`stat card-clickable ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          style={{ cursor: 'pointer', border: filter === 'all' ? '2px solid var(--teal)' : undefined }}
        >
          <small>Total Applications</small>
          <strong>{totalApps}</strong>
          <span>All submissions</span>
        </Card>
        <Card
          className={`stat card-clickable ${filter === 'shortlisted' ? 'active' : ''}`}
          onClick={() => setFilter('shortlisted')}
          style={{ cursor: 'pointer', border: filter === 'shortlisted' ? '2px solid var(--teal)' : undefined }}
        >
          <small>Shortlisted</small>
          <strong>{shortlistedCount}</strong>
          <span className={shortlistedCount > 0 ? 'positive' : ''}>Active candidates</span>
        </Card>
        <Card
          className={`stat card-clickable ${filter === 'applied' ? 'active' : ''}`}
          onClick={() => setFilter('applied')}
          style={{ cursor: 'pointer', border: filter === 'applied' ? '2px solid var(--teal)' : undefined }}
        >
          <small>Under Review</small>
          <strong>{inReviewCount}</strong>
          <span>Awaiting decision</span>
        </Card>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({totalApps})
        </button>
        <button
          type="button"
          className={`chip ${filter === 'shortlisted' ? 'active' : ''}`}
          onClick={() => setFilter('shortlisted')}
        >
          Shortlisted ({shortlistedCount})
        </button>
        <button
          type="button"
          className={`chip ${filter === 'applied' ? 'active' : ''}`}
          onClick={() => setFilter('applied')}
        >
          Under Review ({inReviewCount})
        </button>
        {rejectedCount > 0 && (
          <button
            type="button"
            className={`chip ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Not Selected ({rejectedCount})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <span className="spinner" />
        </div>
      ) : filteredApps.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center', marginTop: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'var(--paper)', borderRadius: '50%', marginBottom: '16px' }}>
            <Icon name="briefcase" size={32} />
          </div>
          <Heading level={3}>
            {totalApps === 0 ? 'No applications submitted yet' : 'No applications match this filter'}
          </Heading>
          <p style={{ marginTop: '8px', maxWidth: '440px', marginInline: 'auto' }}>
            {totalApps === 0
              ? 'Find engineering positions matched with your experience and apply with your resume to see your instant AI fit score.'
              : 'Try selecting a different filter above to view your other submitted applications.'}
          </p>
          {totalApps === 0 && (
            <Button
              style={{ marginTop: '20px' }}
              variant="primary"
              onClick={() => navigate('/candidate/jobs')}
            >
              Explore Open Roles
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
          {filteredApps.map((app) => {
            const job = typeof app.jobId === 'object' ? (app.jobId as Job) : null;
            const fitScore = app.scores?.total ?? 0;
            const appliedDate = new Date(app.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

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
                  {(job?.company || 'C').slice(0, 1).toUpperCase()}
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <Heading level={3} style={{ margin: 0 }}>
                      {job?.title || 'Engineering Role'}
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
                        ? 'Not selected'
                        : 'Under Review'}
                    </Badge>
                  </div>

                  <p style={{ fontSize: '0.88rem' }}>
                    <strong>{job?.company || 'Company'}</strong> · Remote · Applied on {appliedDate}
                  </p>

                  {app.skillGap && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {app.skillGap.matched?.slice(0, 4).map((skill) => (
                        <Badge key={skill} tone="sage">
                          ✓ {skill}
                        </Badge>
                      ))}
                      {app.skillGap.missing?.slice(0, 2).map((skill) => (
                        <Badge key={skill} tone="grey">
                          + {skill}
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {job && (
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/candidate/jobs/${job._id}`)}
                      >
                        View Job
                      </Button>
                    )}
                    {job && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(`/candidate/jobs/${job._id}/report`, {
                            state: { application: app },
                          })
                        }
                      >
                        Fit Report
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
};
