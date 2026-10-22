import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getJobById, getMyApplications } from '../../api/jobs';
import { Badge, Card, Heading, Icon, PageHeader, ScoreRing } from '../../components/ui';
import type { Application, Job, SkillGapSuggestion } from '../../types';

export const Report = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [application, setApplication] = useState<Application | null>(
    (location.state as { application?: Application })?.application || null
  );
  const [job, setJob] = useState<Job | null>(null);
  const [tab, setTab] = useState<'matched' | 'missing' | 'grow'>('matched');
  const [loading, setLoading] = useState(!application);
  const [growthFilter, setGrowthFilter] = useState<'all' | 'high' | 'medium' | 'mastered'>('all');
  const [growthSearch, setGrowthSearch] = useState('');
  const [masteredSkills, setMasteredSkills] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [jobData, apps] = await Promise.all([
          id ? getJobById(id).catch(() => null) : null,
          getMyApplications().catch(() => []),
        ]);

        if (mounted) {
          if (jobData) setJob(jobData);
          if (!application) {
            const found = apps.find(
              (a) =>
                (typeof a.jobId === 'string' ? a.jobId : a.jobId?._id) === id ||
                a._id === id
            );
            if (found) {
              setApplication(found);
              if (!jobData) {
                if (typeof found.jobId === 'object' && found.jobId) {
                  setJob(found.jobId as Job);
                } else if (typeof found.jobId === 'string') {
                  getJobById(found.jobId)
                    .then((j) => {
                      if (mounted && j) setJob(j);
                    })
                    .catch(() => null);
                }
              }
            }
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [id, application]);

  // Synchronize mastered skills whenever the active application is loaded
  useEffect(() => {
    if (application?._id) {
      try {
        const stored = localStorage.getItem(`hirelens_mastered_${application._id}`);
        setMasteredSkills(stored ? JSON.parse(stored) : []);
      } catch {
        setMasteredSkills([]);
      }
    }
  }, [application?._id]);

  if (loading) {
    return (
      <main className="page report-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <span className="spinner" />
        </div>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="page report-page">
        <button
          type="button"
          className="back-link"
          onClick={() => navigate(id ? `/candidate/jobs/${id}` : '/candidate/jobs')}
        >
          <Icon name="back" /> Back to role
        </button>
        <Card style={{ padding: '36px', textAlign: 'center', marginTop: '24px' }}>
          <Heading level={3}>No application found</Heading>
          <p style={{ marginTop: '8px' }}>
            You haven't submitted an application for this role yet. Please apply with your résumé to generate an evidence-based fit report.
          </p>
        </Card>
      </main>
    );
  }

  const scoreTotal = application.scores?.total || 0;
  const matchedSkills = application.skillGap?.matched || [];
  const missingSkills = application.skillGap?.missing || [];
  const rawSuggestions = application.skillGap?.suggestions || [];

  const roleTitle = job?.title || (typeof application.jobId === 'object' && application.jobId ? (application.jobId as Job).title : '') || 'Engineering Role';
  const companyName = job?.company || (typeof application.jobId === 'object' && application.jobId ? (application.jobId as Job).company : '') || 'Company';
  const candidateSkills = application.parsed?.skills || [];

  // Normalize suggestions so they are always rich objects, never blank or raw strings
  const normalizedSuggestions: SkillGapSuggestion[] = (rawSuggestions || []).map((s: any) => {
    if (!s) return null;
    if (typeof s === 'string') {
      const cleanSkill = s
        .replace(/^Build a practical project (?:using|utilizing)\s+/i, '')
        .replace(/\s+and add measurable evidence.*$/i, '')
        .trim();
      return {
        skill: cleanSkill || 'Target Skill',
        category: 'Engineering Competency',
        priority: 'medium',
        currentStatus: candidateSkills.length
          ? `Derived from your resume's evidenced background in ${candidateSkills.slice(0, 3).join(', ')}.`
          : `Targeted growth area to meet requirements for ${roleTitle}.`,
        whyItMatters: `Mastering ${cleanSkill || 'this competency'} strengthens your profile for ${roleTitle} and aligns your technical foundation with industry expectations.`,
        nextStep: s.startsWith('Build')
          ? s
          : `Build a production-grade module demonstrating ${cleanSkill || 'this skill'} and include measurable results on your resume.`,
        projectIdea: `Create an end-to-end prototype integrating ${cleanSkill || 'this skill'} with public repository documentation.`,
        resources: [
          { title: `${cleanSkill || 'Skill'} Documentation & Guide`, url: `https://www.google.com/search?q=${encodeURIComponent((cleanSkill || 'skill') + ' documentation tutorial')}` }
        ],
        estimatedTime: '1 to 2 weeks',
        scoreImpact: '+10% match potential',
        difficulty: 'Intermediate',
        evidenceTip: `List ${cleanSkill} in technical skills and document specific architectural decisions in your project section.`,
      };
    }
    const skillName = s.skill || 'Recommended Skill';
    const cleanResources = Array.isArray(s.resources) && s.resources.length > 0
      ? s.resources.map((res: any) =>
          typeof res === 'string'
            ? { title: res, url: res }
            : { title: res?.title || res?.url || `${skillName} Resource`, url: res?.url || '#' }
        )
      : [
          { title: `${skillName} Documentation`, url: `https://www.google.com/search?q=${encodeURIComponent(skillName + ' documentation tutorial')}` }
        ];

    return {
      ...s,
      skill: skillName,
      category: s.category || 'Technical Competency',
      priority: s.priority || 'medium',
      whyItMatters: s.whyItMatters || `${skillName} is an essential competency for ${roleTitle} to build reliable, high-performance systems.`,
      nextStep: s.nextStep || `Build a practical feature utilizing ${skillName} and link the public repository on your resume.`,
      currentStatus: s.currentStatus || (candidateSkills.length ? `Based on your resume, you have proven experience in ${candidateSkills.slice(0, 3).join(', ')}. Growing ${skillName} gives your profile a strategic edge.` : undefined),
      estimatedTime: s.estimatedTime || '1 to 2 weeks',
      scoreImpact: s.scoreImpact || '+10% match potential',
      difficulty: s.difficulty || 'Intermediate',
      evidenceTip: s.evidenceTip || `Add ${skillName} to technical skills and quantify its impact in your project achievements.`,
      resources: cleanResources
    };
  }).filter(Boolean) as SkillGapSuggestion[];

  const toggleMastered = (skillName: string) => {
    if (!application?._id) return;
    const appId = application._id;
    setMasteredSkills((prev) => {
      const updated = prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName];
      try {
        localStorage.setItem(`hirelens_mastered_${appId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleAskHireLens = (skillName: string) => {
    window.dispatchEvent(
      new CustomEvent('hirelens:open-assistant', {
        detail: {
          message: `Can you create a step-by-step 7-day study and project plan to help me master ${skillName} for the ${roleTitle} position at ${companyName}? Include practical code examples and how to highlight this on my resume.`,
        },
      })
    );
  };

  const filteredSuggestions = normalizedSuggestions.filter((s) => {
    const isMastered = masteredSkills.includes(s.skill);
    if (growthFilter === 'high' && s.priority !== 'high') return false;
    if (growthFilter === 'medium' && s.priority !== 'medium') return false;
    if (growthFilter === 'mastered' && !isMastered) return false;
    if (growthSearch.trim()) {
      const q = growthSearch.toLowerCase();
      const matchSkill = s.skill.toLowerCase().includes(q);
      const matchCat = (s.category || '').toLowerCase().includes(q);
      const matchWhy = (s.whyItMatters || '').toLowerCase().includes(q);
      return matchSkill || matchCat || matchWhy;
    }
    return true;
  });

  const masteredCount = normalizedSuggestions.filter((s) => masteredSkills.includes(s.skill)).length;
  const progressPercent = normalizedSuggestions.length > 0 ? Math.round((masteredCount / normalizedSuggestions.length) * 100) : 0;

  return (
    <main className="page report-page">
      <button
        type="button"
        className="back-link"
        onClick={() => navigate(id ? `/candidate/jobs/${id}` : '/candidate/jobs')}
      >
        <Icon name="back" /> Back to role
      </button>

      <PageHeader
        eyebrow="Your skill-gap report"
        title="A strong foundation—with a few clear next steps."
        text={`For ${roleTitle} at ${companyName}`}
      />

      <Card className="fit-summary">
        <ScoreRing value={scoreTotal} size="large" />
        <div>
          <Badge tone={scoreTotal >= 70 ? 'sage' : scoreTotal >= 40 ? 'amber' : 'red'}>
            {scoreTotal >= 75 ? 'Strong match' : scoreTotal >= 50 ? 'Moderate match' : 'Developing alignment'}
          </Badge>
          <Heading level={2}>
            {scoreTotal >= 75
              ? 'You bring most of what this role needs.'
              : scoreTotal >= 50
              ? 'Good baseline competencies with actionable growth areas.'
              : 'Key technical competencies require further project evidence.'}
          </Heading>
          <p style={{ marginTop: '8px' }}>
            {application.scores?.explanation ||
              `Based on our algorithmic parsing and forensic comparison of your résumé against ${companyName}'s requirements.`}
          </p>
        </div>
      </Card>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'matched' ? 'active' : ''}
          onClick={() => setTab('matched')}
        >
          Matched skills <Badge tone="sage">{matchedSkills.length}</Badge>
        </button>
        <button
          type="button"
          className={tab === 'missing' ? 'active' : ''}
          onClick={() => setTab('missing')}
        >
          Missing skills <Badge tone="coral">{missingSkills.length}</Badge>
        </button>
        <button
          type="button"
          className={tab === 'grow' ? 'active' : ''}
          onClick={() => setTab('grow')}
        >
          Skills to grow <Badge>{normalizedSuggestions.length}</Badge>
        </button>
      </div>

      {tab === 'matched' && (
        <Card className="tab-content">
          <Heading level={3}>Your strongest evidence</Heading>
          {matchedSkills.length === 0 ? (
            <p style={{ marginTop: '12px' }}>No exact skill matches identified on this application.</p>
          ) : (
            <div className="skill-cloud" style={{ marginTop: '14px' }}>
              {matchedSkills.map((x) => (
                <Badge tone="sage" key={x}>
                  <Icon name="check" size={14} /> {x}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'missing' && (
        <Card className="tab-content">
          <Heading level={3}>Not identified in your current profile</Heading>
          {missingSkills.length === 0 ? (
            <p style={{ marginTop: '12px' }}>Great news! You meet all listed required skills for this position.</p>
          ) : (
            <>
              <div className="skill-cloud" style={{ marginTop: '14px' }}>
                {missingSkills.map((x) => (
                  <Badge tone="coral" key={x}>
                    {x}
                  </Badge>
                ))}
              </div>
              <p style={{ marginTop: '14px' }}>
                This does not automatically rule you out. Adjacent experience, independent projects, or certifications transfer well.
              </p>
            </>
          )}
        </Card>
      )}

      {tab === 'grow' && (
        <div>
          {/* Actionable Upskilling Header & Toolbar */}
          <div className="growth-toolbar">
            <div className="growth-filter-group">
              <button
                type="button"
                className={`growth-filter-btn ${growthFilter === 'all' ? 'active' : ''}`}
                onClick={() => setGrowthFilter('all')}
              >
                All growth areas ({normalizedSuggestions.length})
              </button>
              <button
                type="button"
                className={`growth-filter-btn ${growthFilter === 'high' ? 'active' : ''}`}
                onClick={() => setGrowthFilter('high')}
              >
                Critical gaps ({normalizedSuggestions.filter((s) => s.priority === 'high').length})
              </button>
              <button
                type="button"
                className={`growth-filter-btn ${growthFilter === 'medium' ? 'active' : ''}`}
                onClick={() => setGrowthFilter('medium')}
              >
                Strategic edges ({normalizedSuggestions.filter((s) => s.priority === 'medium').length})
              </button>
              {masteredCount > 0 && (
                <button
                  type="button"
                  className={`growth-filter-btn ${growthFilter === 'mastered' ? 'active' : ''}`}
                  onClick={() => setGrowthFilter('mastered')}
                >
                  Completed ({masteredCount})
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="growth-progress-bar">
                <span>{masteredCount}/{normalizedSuggestions.length} completed</span>
                <div className="growth-progress-track">
                  <div className="growth-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="growth-search-box">
                <span className="growth-search-icon">
                  <Icon name="search" size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={growthSearch}
                  onChange={(e) => setGrowthSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Growth Cards List */}
          <div className="growth-list">
            {normalizedSuggestions.length === 0 ? (
              <Card style={{ padding: '36px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', marginBottom: '12px' }}>
                  <Badge tone="sage">
                    <Icon name="check" size={14} /> 100% Core Competencies Met
                  </Badge>
                </div>
                <Heading level={3}>No critical skill gaps identified</Heading>
                <p style={{ marginTop: '8px', color: 'var(--muted)', maxWidth: '520px', marginInline: 'auto' }}>
                  Your résumé demonstrates strong alignment with all technical requirements evaluated for this role. Switch to the "Matched skills" tab to review your evidenced background.
                </p>
              </Card>
            ) : filteredSuggestions.length === 0 ? (
              <Card style={{ padding: '32px', textAlign: 'center' }}>
                <Heading level={3}>No skills match your filter</Heading>
                <p style={{ marginTop: '8px', color: 'var(--muted)' }}>
                  Try resetting the filter or search term to see all recommendations.
                </p>
                <button
                  type="button"
                  className="growth-filter-btn active"
                  style={{ marginTop: '16px', display: 'inline-block' }}
                  onClick={() => {
                    setGrowthFilter('all');
                    setGrowthSearch('');
                  }}
                >
                  Show all recommendations
                </button>
              </Card>
            ) : (
              filteredSuggestions.map((s) => {
                const isMastered = masteredSkills.includes(s.skill);
                const isHigh = s.priority === 'high';
                const priorityTone = isHigh ? 'coral' : 'blue';
                const priorityLabel = isHigh ? 'Critical gap' : 'Strategic edge';

                return (
                  <Card className={`growth-card ${isMastered ? 'is-mastered' : ''}`} key={s.skill}>
                    {/* Top Row: Title, Category, Badges, Metrics */}
                    <div className="growth-card-top">
                      <div className="growth-title-group">
                        <div className="growth-skill-header">
                          <Heading level={3}>{s.skill}</Heading>
                          <Badge tone={priorityTone}>{priorityLabel}</Badge>
                          {isMastered && <Badge tone="sage"><Icon name="check" size={13} /> Completed</Badge>}
                        </div>
                        {s.category && (
                          <span className="growth-category-pill">
                            <Icon name="briefcase" size={13} /> {s.category}
                          </span>
                        )}
                      </div>

                      <div className="growth-badges-group">
                        {s.estimatedTime && (
                          <span className="growth-meta-chip">
                            ⏱️ {s.estimatedTime}
                          </span>
                        )}
                        {s.scoreImpact && (
                          <span className="growth-meta-chip" style={{ color: 'var(--teal)', borderColor: '#c3e3dc' }}>
                            📈 {s.scoreImpact}
                          </span>
                        )}
                        {s.difficulty && (
                          <span className="growth-meta-chip">
                            Level: {s.difficulty}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Resume Evidence Context Banner */}
                    {s.currentStatus && (
                      <div className="growth-baseline-banner">
                        <span className="growth-baseline-icon">
                          <Icon name="spark" size={16} />
                        </span>
                        <div>
                          <strong>Your Profile Baseline:</strong> {s.currentStatus}
                        </div>
                      </div>
                    )}

                    {/* Multi-column Core Sections */}
                    <div className="growth-content-grid">
                      <div className="growth-col">
                        <div className="growth-section">
                          <span className="growth-section-label">
                            <Icon name="shield" size={14} /> Why It Matters For This Role
                          </span>
                          <p className="growth-section-text">{s.whyItMatters}</p>
                        </div>

                        {s.evidenceTip && (
                          <div className="growth-section" style={{ marginTop: 'auto' }}>
                            <span className="growth-section-label">
                              <Icon name="file" size={14} /> Resume & Interview Evidence Formula
                            </span>
                            <div className="growth-project-box" style={{ background: '#f5f8fa', borderColor: '#dbe5ec' }}>
                              <p className="growth-section-text" style={{ fontStyle: 'italic', fontSize: '.86rem' }}>
                                "{s.evidenceTip}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="growth-col">
                        <div className="growth-section">
                          <span className="growth-section-label">
                            <Icon name="arrow" size={14} /> Your Next Step & Action Plan
                          </span>
                          <p className="growth-section-text">{s.nextStep}</p>
                        </div>

                        {s.projectIdea && (
                          <div className="growth-project-box">
                            <strong>Recommended Portfolio Feature</strong>
                            <p className="growth-section-text">{s.projectIdea}</p>
                          </div>
                        )}

                        {s.resources && s.resources.length > 0 && (
                          <div className="growth-section">
                            <span className="growth-section-label">Curated Learning Tracks</span>
                            <div className="growth-resources">
                              {s.resources.map((res: { title: string; url: string }, idx: number) => (
                                <a
                                  key={idx}
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="growth-resource-link"
                                >
                                  {res.title} ↗
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="growth-card-footer">
                      <label className={`growth-toggle-action ${isMastered ? 'is-done' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isMastered}
                          onChange={() => toggleMastered(s.skill)}
                        />
                        <span>{isMastered ? 'Marked as mastered / in progress' : 'Mark as learning / completed'}</span>
                      </label>

                      <button
                        type="button"
                        className="growth-ask-btn"
                        onClick={() => handleAskHireLens(s.skill)}
                      >
                        <Icon name="spark" size={14} /> Ask HireLens for 7-day plan
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </main>
  );
};
