import { useEffect, useState } from 'react';
import { Badge, Button, Card, Heading, Icon, ScoreRing, SectionTitle } from '../../components/ui';
import { DifficultyBreakdownChart, ActivitySparkline } from '../../components/candidate/PlatformCharts';
import { getCandidateResumeUrl, refreshApplicantStats } from '../../api/recruiter';
import { getErrorMessage } from '../../api/client';
import type { Application, Certification, CodingStats } from '../../types';

interface ApplicantDrawerProps {
  application: Application;
  close: () => void;
  onVerify: (cert: Certification) => void;
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  leetcode: { label: 'LeetCode', color: '#f89f1b' },
  hackerrank: { label: 'HackerRank', color: '#2ec866' },
  codechef: { label: 'CodeChef', color: '#5b4638' },
  github: { label: 'GitHub', color: '#24292e' },
};

function sourceLabel(stat: CodingStats) {
  if (stat.source === 'manual' || stat.selfReported) return 'self-reported';
  if (stat.status === 'ok') return 'live';
  return 'cached';
}

function sourceTone(stat: CodingStats): 'sage' | 'grey' | 'blue' {
  if (stat.source === 'manual' || stat.selfReported) return 'grey';
  if (stat.status === 'ok') return 'sage';
  return 'blue';
}

export const ApplicantDrawer = ({ application, close, onVerify }: ApplicantDrawerProps) => {
  const candidateUser = typeof application.candidateId === 'object' ? application.candidateId : null;
  const candidateName = candidateUser?.name || application.parsed?.name || 'Candidate';
  const candidateEmail = candidateUser?.email || application.parsed?.email || '';

  const initials = candidateName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join('');

  const certs = application.parsed?.certifications || [];
  const scores = application.scores || {};
  const breakdown = scores.breakdown || {};
  const strengths = scores.strengths || [];
  const gaps = scores.gaps || [];

  const initialSnapshot = application.profileSnapshot;
  const [activeTab, setActiveTab] = useState<'resume' | 'profiles' | 'certificates'>('resume');
  const [resumeViewMode, setResumeViewMode] = useState<'pdf' | 'text'>('pdf');

  // Refresh stats state
  const [latestSnapshot, setLatestSnapshot] = useState<Application['profileSnapshot'] | null>(null);
  const [activeSnapshotMode, setActiveSnapshotMode] = useState<'snapshot' | 'latest'>('snapshot');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Active snapshot to display
  const currentSnapshot = activeSnapshotMode === 'latest' && latestSnapshot ? latestSnapshot : initialSnapshot;
  const codingStats: CodingStats[] = (currentSnapshot?.codingStats || []) as CodingStats[];
  const links = currentSnapshot?.links || {};
  const linkedinInfo = links.linkedin as { url?: string; headline?: string; currentRole?: string; skills?: string[] } | undefined;

  const verifiedCertCount = certs.filter((c) => c.verificationStatus === 'verified').length;
  const totalSolved = codingStats.reduce((sum, s) => sum + (s.totalSolved || 0), 0);
  const bestRating = codingStats.reduce((max, s) => Math.max(max, s.rating || 0), 0);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleRefreshStats = async () => {
    if (cooldownSeconds > 0 || refreshing) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      const res = await refreshApplicantStats(application._id);
      setLatestSnapshot(res.latestSnapshot);
      setActiveSnapshotMode('latest');
      setCooldownSeconds(60); // 60s cooldown
    } catch (err) {
      setRefreshError(getErrorMessage(err, 'Failed to refresh stats'));
    } finally {
      setRefreshing(false);
    }
  };

  const resumeUrl = getCandidateResumeUrl(application._id);

  return (
    <div className="overlay" onClick={close} role="dialog" aria-modal="true" aria-labelledby="drawer-cand-name">
      <aside className="drawer applicant-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>Applicant Profile &amp; Résumé Viewer</span>
          <button type="button" onClick={close} aria-label="Close applicant details">
            <Icon name="x" />
          </button>
        </div>

        <div className="drawer-body">
          <div className="applicant-split-layout">
            {/* ════════ LEFT COLUMN: RESUME VIEWER ════════ */}
            <div className="applicant-resume-column">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--paper)', padding: '2px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <button
                    type="button"
                    onClick={() => setResumeViewMode('pdf')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: resumeViewMode === 'pdf' ? 'var(--white)' : 'transparent',
                      color: resumeViewMode === 'pdf' ? 'var(--teal)' : 'var(--muted)',
                      boxShadow: resumeViewMode === 'pdf' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    PDF Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumeViewMode('text')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: resumeViewMode === 'text' ? 'var(--white)' : 'transparent',
                      color: resumeViewMode === 'text' ? 'var(--teal)' : 'var(--muted)',
                      boxShadow: resumeViewMode === 'text' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Parsed Text
                  </button>
                </div>

                <a
                  href={resumeUrl}
                  download={application.resumeFile || 'resume.pdf'}
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none', fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Icon name="download" size={13} /> Download PDF
                </a>
              </div>

              {resumeViewMode === 'pdf' ? (
                <iframe
                  src={resumeUrl}
                  title={`${candidateName}'s Resume`}
                  className="applicant-resume-frame"
                />
              ) : (
                <div
                  className="applicant-resume-frame"
                  style={{
                    padding: '20px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--ink)',
                  }}
                >
                  {application.resumeText || 'No text extracted from this résumé.'}
                </div>
              )}
            </div>

            {/* ════════ RIGHT COLUMN: CANDIDATE PROFILE PANEL ════════ */}
            <div className="applicant-profile-column">
              {/* Candidate Hero */}
              <div className="candidate-hero">
                <div className="person-avatar large">{initials}</div>
                <div>
                  <Heading level={2} id="drawer-cand-name">
                    {candidateName}
                  </Heading>
                  <p>{candidateEmail || 'Candidate Profile'}</p>
                </div>
                <ScoreRing value={scores.total || 0} />
              </div>

              {/* Key numbers pill row */}
              {(totalSolved > 0 || bestRating > 0 || verifiedCertCount > 0) && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: '12px',
                    marginBottom: '10px',
                  }}
                >
                  {totalSolved > 0 && (
                    <span
                      style={{
                        background: 'var(--teal-light)',
                        color: 'var(--teal)',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {totalSolved} problems solved
                    </span>
                  )}
                  {bestRating > 0 && (
                    <span
                      style={{
                        background: '#fff8ed',
                        color: '#b45309',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Best rating {bestRating}
                    </span>
                  )}
                  {verifiedCertCount > 0 && (
                    <span
                      style={{
                        background: '#f0fdf4',
                        color: '#1a6b5e',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {verifiedCertCount} verified cert{verifiedCertCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="tabs" style={{ marginTop: '12px', marginBottom: '16px' }}>
                {(['resume', 'profiles', 'certificates'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={activeTab === t ? 'active' : ''}
                    onClick={() => setActiveTab(t)}
                  >
                    {t === 'resume' ? 'Resume' : t === 'profiles' ? 'Profiles & coding' : 'Certificates'}
                    {t === 'certificates' && certs.length > 0 && (
                      <Badge>{certs.length}</Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* ── TAB 1: Resume (Fit scores & reasoning) ── */}
              {activeTab === 'resume' && (
                <>
                  <div className="reasoning">
                    <Badge tone="lavender">
                      <Icon name="spark" size={14} /> AI-assisted reasoning
                    </Badge>
                    <p>
                      {scores.explanation ||
                        `${candidateName}'s application has been scored against this position's custom weight model and required technical competencies.`}
                    </p>
                  </div>

                  <Heading level={3}>Fit breakdown</Heading>

                  <div className="breakdown">
                    <div>
                      <strong>Skills competency</strong>
                      <Badge tone="teal">{scores.skills || 0} / 100</Badge>
                    </div>
                    <p>
                      {breakdown.skillsReason ||
                        `Matched ${application.skillGap?.matched?.length || 0} required skills.`}
                    </p>
                  </div>

                  <div className="breakdown">
                    <div>
                      <strong>Project evidence</strong>
                      <Badge tone="blue">{scores.projects || 0} / 100</Badge>
                    </div>
                    <p>
                      {breakdown.projectsReason ||
                        `Evaluated based on direct project descriptions in candidate's résumé.`}
                    </p>
                  </div>

                  <div className="breakdown">
                    <div>
                      <strong>Certifications &amp; proof</strong>
                      <Badge tone="lavender">{scores.certifications || 0} / 100</Badge>
                    </div>
                    <p>
                      {breakdown.certificationsReason ||
                        `${certs.length} credential(s) listed. Verified credentials receive maximum credit.`}
                    </p>
                  </div>

                  <div className="breakdown">
                    <div>
                      <strong>Experience alignment</strong>
                      <Badge tone="neutral">{scores.experience || 0} / 100</Badge>
                    </div>
                    <p>
                      {breakdown.experienceReason ||
                        `Professional timeline aligned with job seniority criteria.`}
                    </p>
                  </div>

                  {(strengths.length > 0 || gaps.length > 0) && (
                    <div className="strength-gap">
                      <div>
                        <small>Strengths</small>
                        <p>{strengths.join(', ') || 'Solid technical foundation'}</p>
                      </div>
                      <div>
                        <small>Explore further</small>
                        <p>{gaps.join(', ') || 'In-depth domain scenarios'}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB 2: Profiles & coding ── */}
              {activeTab === 'profiles' && (
                <>
                  {/* Refresh stats toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      {currentSnapshot?.snapshotAt && (
                        <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
                          Stats as of {new Date(currentSnapshot.snapshotAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleRefreshStats}
                      disabled={refreshing || cooldownSeconds > 0}
                      icon="refresh"
                    >
                      {refreshing
                        ? 'Fetching live stats...'
                        : cooldownSeconds > 0
                        ? `Refresh in ${cooldownSeconds}s`
                        : 'Refresh live stats'}
                    </Button>
                  </div>

                  {refreshError && (
                    <div style={{ color: 'var(--coral)', fontSize: '12px', marginBottom: '10px' }}>
                      {refreshError}
                    </div>
                  )}

                  {/* Toggle between snapshot and latest if both exist */}
                  {latestSnapshot && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Viewing:</span>
                      <button
                        type="button"
                        onClick={() => setActiveSnapshotMode('snapshot')}
                        style={{
                          background: activeSnapshotMode === 'snapshot' ? 'var(--white)' : 'transparent',
                          border: activeSnapshotMode === 'snapshot' ? '1px solid var(--line)' : 'none',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontWeight: activeSnapshotMode === 'snapshot' ? 600 : 400,
                        }}
                      >
                        Application Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSnapshotMode('latest')}
                        style={{
                          background: activeSnapshotMode === 'latest' ? 'var(--white)' : 'transparent',
                          border: activeSnapshotMode === 'latest' ? '1px solid var(--line)' : 'none',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontWeight: activeSnapshotMode === 'latest' ? 600 : 400,
                          color: 'var(--teal)',
                        }}
                      >
                        Latest Values (Refreshed)
                      </button>
                    </div>
                  )}

                  {/* LinkedIn */}
                  <SectionTitle title="LinkedIn" />
                  {linkedinInfo?.url ? (
                    <Card style={{ padding: '14px 16px', marginBottom: '18px' }}>
                      <a
                        href={linkedinInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--teal)', fontWeight: 600, wordBreak: 'break-all', fontSize: '13px' }}
                      >
                        {linkedinInfo.url}
                      </a>
                      {linkedinInfo.headline && (
                        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--muted)' }}>
                          {linkedinInfo.headline}
                        </p>
                      )}
                      {linkedinInfo.currentRole && (
                        <p style={{ fontSize: '13px', marginTop: '2px' }}>
                          <strong>Role:</strong> {linkedinInfo.currentRole}
                        </p>
                      )}
                      {linkedinInfo.skills && linkedinInfo.skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {linkedinInfo.skills.map((sk) => (
                            <Badge key={sk} tone="neutral" style={{ fontSize: '11px' }}>
                              {sk}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '18px', fontStyle: 'italic' }}>
                      Not provided
                    </p>
                  )}

                  {/* Coding platforms */}
                  <SectionTitle title="Coding platforms" />
                  {codingStats.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                      Not provided
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {codingStats.map((stat, idx) => {
                        const meta = PLATFORM_META[stat.platform] || { label: stat.platform, color: '#1a6b5e' };
                        const platformLink = (links[stat.platform] as { username?: string; profileUrl?: string }) || {};
                        const profileUrl = stat.profileUrl || platformLink.profileUrl;
                        const src = sourceLabel(stat);
                        const tone = sourceTone(stat);
                        const isFailed = stat.status === 'failed';

                        return (
                          <Card key={idx} style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '14px', color: meta.color, textTransform: 'capitalize' }}>
                                  {meta.label}
                                </strong>
                                <Badge tone={isFailed ? 'coral' : tone}>{isFailed ? 'Unavailable' : src}</Badge>
                              </div>
                              {profileUrl && (
                                <a
                                  href={profileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 500 }}
                                >
                                  @{stat.username}
                                </a>
                              )}
                            </div>

                            {isFailed ? (
                              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0' }}>
                                Live fetch failed for @{stat.username}. {stat.error ? `(${stat.error})` : ''}
                              </p>
                            ) : (
                              <>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
                                    gap: '8px',
                                    fontSize: '12px',
                                    marginBottom: '10px',
                                  }}
                                >
                                  {stat.totalSolved != null && (
                                    <div>
                                      <span style={{ color: 'var(--muted)' }}>Total solved</span>
                                      <br />
                                      <strong style={{ fontSize: '15px' }}>{stat.totalSolved}</strong>
                                    </div>
                                  )}
                                  {stat.rating != null && (
                                    <div>
                                      <span style={{ color: 'var(--muted)' }}>Rating</span>
                                      <br />
                                      <strong style={{ fontSize: '15px' }}>{stat.rating}</strong>
                                    </div>
                                  )}
                                  {stat.maxRating != null && (
                                    <div>
                                      <span style={{ color: 'var(--muted)' }}>Max rating</span>
                                      <br />
                                      <strong style={{ fontSize: '15px' }}>{stat.maxRating}</strong>
                                    </div>
                                  )}
                                  {stat.contestsAttended != null && (
                                    <div>
                                      <span style={{ color: 'var(--muted)' }}>Contests</span>
                                      <br />
                                      <strong style={{ fontSize: '15px' }}>{stat.contestsAttended}</strong>
                                    </div>
                                  )}
                                </div>

                                {(stat.easySolved != null || stat.mediumSolved != null || stat.hardSolved != null) && (
                                  <DifficultyBreakdownChart
                                    easy={stat.easySolved}
                                    medium={stat.mediumSolved}
                                    hard={stat.hardSolved}
                                  />
                                )}

                                {stat.activity && stat.activity.length > 0 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Recent activity</span>
                                    <ActivitySparkline activity={stat.activity} />
                                  </div>
                                )}
                              </>
                            )}

                            {stat.selfReported && (
                              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', fontStyle: 'italic' }}>
                                Self-reported stats — not independently verified.
                              </p>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── TAB 3: Certificates ── */}
              {activeTab === 'certificates' && (
                <>
                  {certs.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Not provided
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {certs.map((c) => (
                        <Card className="cert-mini" key={c._id}>
                          <div>
                            <Icon name="file" />
                            <span>
                              <strong>{c.name}</strong>
                              <small>
                                {c.issuer || 'Issuer'}
                                {c.credentialId && ` · ID: ${c.credentialId}`}
                              </small>
                              {c.credentialUrl && (
                                <small>
                                  <a
                                    href={c.credentialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--teal)' }}
                                  >
                                    Verify link
                                  </a>
                                </small>
                              )}
                            </span>
                          </div>
                          <Badge
                            tone={
                              c.verificationStatus === 'verified'
                                ? 'sage'
                                : c.verificationStatus === 'ai_checked'
                                ? 'lavender'
                                : c.verificationStatus === 'rejected'
                                ? 'coral'
                                : 'neutral'
                            }
                          >
                            {c.verificationStatus}
                          </Badge>
                          <Button variant="secondary" size="small" onClick={() => onVerify(c)}>
                            Review
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
