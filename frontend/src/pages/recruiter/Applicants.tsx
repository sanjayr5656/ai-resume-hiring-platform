import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getJobApplicants,
  getTopSummary,
  updateApplicationStatus,
} from '../../api/recruiter';
import { getJobById } from '../../api/jobs';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Badge,
  Button,
  Card,
  Heading,
  Icon,
  PageHeader,
  Progress,
  ScoreRing,
} from '../../components/ui';
import { ApplicantDrawer } from './ApplicantDrawer';
import { VerificationDrawer } from './VerificationDrawer';
import type { Application, Certification, Job } from '../../types';

export const Applicants = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [topSummary, setTopSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [tab, setTab] = useState<'All' | 'Shortlisted' | 'Rejected' | 'Duplicates'>('All');

  const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
  const [verifyingCert, setVerifyingCert] = useState<Certification | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!id) return;
    try {
      setError('');
      const [jobData, apps] = await Promise.all([
        getJobById(id),
        getJobApplicants(id),
      ]);
      setJob(jobData);
      setApplicants(apps);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load applicants'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Load top summary
  useEffect(() => {
    if (!id) return;
    async function fetchSummary() {
      setLoadingSummary(true);
      try {
        const res = await getTopSummary(id!);
        setTopSummary(res.summary);
      } catch {
        // Summary is optional or may be generating
      } finally {
        setLoadingSummary(false);
      }
    }
    fetchSummary();
  }, [id]);

  // Optimistic status update with rollback
  const handleStatusChange = async (
    appId: string,
    newStatus: 'shortlisted' | 'rejected' | 'applied'
  ) => {
    const previous = [...applicants];
    setApplicants((prev) =>
      prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
    );

    try {
      await updateApplicationStatus(appId, newStatus);
      toast(
        newStatus === 'shortlisted'
          ? 'Candidate shortlisted'
          : newStatus === 'rejected'
          ? 'Candidate rejected'
          : 'Status reset'
      );
    } catch (err) {
      setApplicants(previous);
      toast(getErrorMessage(err, 'Failed to update status'), 'error');
    }
  };

  // Filtered applicants
  const filteredApplicants = applicants.filter((app) => {
    if (tab === 'All') return true;
    if (tab === 'Shortlisted') return app.status === 'shortlisted';
    if (tab === 'Rejected') return app.status === 'rejected';
    return true;
  });

  const shortlistedCount = applicants.filter((a) => a.status === 'shortlisted').length;
  const rejectedCount = applicants.filter((a) => a.status === 'rejected').length;

  const handleUpdatedApplication = (updatedApp: Application) => {
    setApplicants((prev) =>
      prev.map((a) => (a._id === updatedApp._id ? updatedApp : a))
    );
    if (selectedApplicant?._id === updatedApp._id) {
      setSelectedApplicant(updatedApp);
    }
  };

  return (
    <main className="page">
      <button type="button" className="back-link" onClick={() => navigate('/recruiter')}>
        <Icon name="back" /> All roles
      </button>

      <PageHeader
        eyebrow={job?.title || 'Job applicants'}
        title={`${applicants.length} ${applicants.length === 1 ? 'applicant' : 'applicants'}, ranked with context.`}
        text="AI surfaces forensic evidence and skill overlaps. Your team makes every decision."
        action={
          <Button
            variant="secondary"
            onClick={() => navigate(`/recruiter/jobs/${id}/duplicates`)}
          >
            Check duplicates
          </Button>
        }
      />

      {/* AI Summary Card */}
      {topSummary && (
        <Card className="ai-summary">
          <div className="ai-avatar">
            <Icon name="spark" />
          </div>
          <div>
            <Badge tone="lavender">AI summary</Badge>
            <Heading level={3}>Comparative Talent Intelligence</Heading>
            <p style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{topSummary}</p>
          </div>
        </Card>
      )}

      {/* Applicant Filter Tabs */}
      <div className="tabs applicant-tabs">
        {(['All', 'Shortlisted', 'Rejected', 'Duplicates'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => {
              if (t === 'Duplicates') {
                navigate(`/recruiter/jobs/${id}/duplicates`);
              } else {
                setTab(t);
              }
            }}
          >
            {t}
            {t === 'All' && <Badge>{applicants.length}</Badge>}
            {t === 'Shortlisted' && <Badge tone="teal">{shortlistedCount}</Badge>}
            {t === 'Rejected' && <Badge tone="red">{rejectedCount}</Badge>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <span className="spinner" />
        </div>
      ) : error ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red-text)' }}>{error}</p>
        </Card>
      ) : filteredApplicants.length === 0 ? (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <Heading level={3}>No candidates found</Heading>
          <p style={{ marginTop: '8px' }}>
            {tab === 'All'
              ? 'No candidates have applied to this role yet.'
              : `No candidates currently under ${tab.toLowerCase()} status.`}
          </p>
        </Card>
      ) : (
        <div className="applicant-list">
          {filteredApplicants.map((app, index) => {
            const candidateUser = typeof app.candidateId === 'object' ? app.candidateId : null;
            const candidateName =
              candidateUser?.name || app.parsed?.name || `Candidate #${index + 1}`;
            const candidateRole =
              app.parsed?.experience?.[0]?.title ||
              app.parsed?.skills?.slice(0, 2).join(' · ') ||
              'Technical Candidate';

            const initials = candidateName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((x) => x[0].toUpperCase())
              .join('');

            const score = app.scores?.total || 0;
            const skillsScore = app.scores?.skills || 0;
            const projectsScore = app.scores?.projects || 0;
            const certsScore = app.scores?.certifications || 0;

            const isDuplicate = app.duplicateFlags && app.duplicateFlags.length > 0;

            return (
              <Card
                className="applicant-row"
                key={app._id}
                onClick={() => setSelectedApplicant(app)}
              >
                <div className="rank">#{app.rank || index + 1}</div>

                <div className="candidate-name">
                  <div className="person-avatar">{initials}</div>
                  <div>
                    <Heading level={3}>{candidateName}</Heading>
                    <small>{candidateRole}</small>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                      {isDuplicate && <Badge tone="coral">Possible duplicate</Badge>}
                      {(() => {
                        const stats = app.profileSnapshot?.codingStats || [];
                        const totalSolved = stats.reduce((s: number, p: any) => s + (p.totalSolved || 0), 0);
                        const bestRating = stats.reduce((m: number, p: any) => Math.max(m, p.rating || 0), 0);
                        const verifiedCerts = (app.parsed?.certifications || []).filter((c: any) => c.verificationStatus === 'verified').length;
                        return (
                          <>
                            {totalSolved > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#1a6b5e', fontWeight: 500 }}>
                                <Icon name="code" size={12} /> {totalSolved} solved
                              </span>
                            )}
                            {bestRating > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#b45309', fontWeight: 500 }}>
                                ★ {bestRating}
                              </span>
                            )}
                            {verifiedCerts > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#1a6b5e', fontWeight: 500 }}>
                                ✓ {verifiedCerts} cert{verifiedCerts !== 1 ? 's' : ''}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <ScoreRing value={score} size="small" />

                <div className="score-bars">
                  <div>
                    <span>Skills</span>
                    <Progress value={skillsScore} />
                  </div>
                  <div>
                    <span>Projects</span>
                    <Progress value={projectsScore} tone="blue" />
                  </div>
                  <div>
                    <span>Certificates</span>
                    <Progress value={certsScore} tone="lavender" />
                  </div>
                </div>

                <div
                  className="row-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant={app.status === 'shortlisted' ? 'primary' : 'secondary'}
                    onClick={() =>
                      handleStatusChange(
                        app._id,
                        app.status === 'shortlisted' ? 'applied' : 'shortlisted'
                      )
                    }
                  >
                    {app.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      handleStatusChange(
                        app._id,
                        app.status === 'rejected' ? 'applied' : 'rejected'
                      )
                    }
                  >
                    {app.status === 'rejected' ? 'Rejected' : 'Reject'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedApplicant && (
        <ApplicantDrawer
          application={selectedApplicant}
          close={() => setSelectedApplicant(null)}
          onVerify={(cert) => setVerifyingCert(cert)}
        />
      )}

      {/* Verification Drawer */}
      {selectedApplicant && verifyingCert && (
        <VerificationDrawer
          application={selectedApplicant}
          certification={verifyingCert}
          close={() => setVerifyingCert(null)}
          onSuccess={handleUpdatedApplication}
        />
      )}
    </main>
  );
};
