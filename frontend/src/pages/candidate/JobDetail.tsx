import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applyToJob, getJobById, getMyApplications } from '../../api/jobs';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, Heading, Icon } from '../../components/ui';
import type { Application, Job } from '../../types';

export const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [applying, setApplying] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function loadJobAndApp() {
      try {
        const [jobData, myApps] = await Promise.all([
          getJobById(id!),
          getMyApplications().catch(() => []),
        ]);
        if (mounted) {
          setJob(jobData);
          const found = myApps.find(
            (a) => (typeof a.jobId === 'string' ? a.jobId : a.jobId?._id) === id
          );
          setExistingApp(found || null);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Could not find this open role.'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadJobAndApp();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setFileError('Please select a PDF document (.pdf).');
      return;
    }

    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      setFileError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed is ${maxMb} MB.`);
      return;
    }

    setSelectedFile(file);
    toast('Résumé selected successfully');
  };

  const handleApply = async () => {
    if (!id || !selectedFile || applying) return;

    setApplying(true);
    setFileError('');

    try {
      const createdApp = await applyToJob(id, selectedFile);
      toast('Application submitted successfully!');
      navigate(`/candidate/jobs/${id}/report`, { state: { application: createdApp } });
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to submit application.');
      if (msg.toLowerCase().includes('already applied')) {
        toast("You've already applied to this role. Showing your fit report.", 'info');
        navigate(`/candidate/jobs/${id}/report`);
      } else {
        setFileError(msg);
      }
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="page detail-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <span className="spinner" />
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="page detail-page">
        <button type="button" className="back-link" onClick={() => navigate('/candidate/jobs')}>
          <Icon name="back" /> All jobs
        </button>
        <Card style={{ padding: '36px', textAlign: 'center', marginTop: '24px' }}>
          <Heading level={3}>Role not found</Heading>
          <p style={{ marginTop: '8px' }}>{error || 'This job is no longer accepting applications.'}</p>
          <Button variant="secondary" style={{ marginTop: '16px' }} onClick={() => navigate('/candidate/jobs')}>
            Browse open jobs
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="page detail-page">
      <button type="button" className="back-link" onClick={() => navigate('/candidate/jobs')}>
        <Icon name="back" /> All jobs
      </button>

      <div className="detail-grid">
        <article className="job-description">
          <div className="company-mark large">{(job.company || 'C').slice(0, 1).toUpperCase()}</div>
          <Badge tone="sage">{job.status === 'open' ? 'Actively hiring' : 'Closed'}</Badge>
          <Heading level={1}>{job.title}</Heading>
          <p className="lede">{job.company} · Remote · Full-time</p>

          <div className="chip-row">
            {job.requiredSkills?.map((s) => (
              <Badge tone="teal" key={s}>
                {s}
              </Badge>
            ))}
            {job.niceToHaveSkills?.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>

          <hr />

          <Heading level={2}>The role</Heading>
          <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>

          {job.minExperience > 0 && (
            <>
              <Heading level={2}>Experience requirement</Heading>
              <p>Minimum {job.minExperience} years of relevant professional engineering experience.</p>
            </>
          )}

          <Heading level={2}>Required competencies</Heading>
          <ul>
            {job.requiredSkills?.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </article>

        <aside className="apply-panel">
          {existingApp ? (
            <>
              <Badge tone="teal">{existingApp.scores?.total || 0}% match score</Badge>
              <Heading level={2}>Already applied</Heading>
              <p>
                You applied to this role on{' '}
                {new Date(existingApp.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                . Your status is <strong>{existingApp.status}</strong>.
              </p>
              <Button
                variant="coral"
                icon="spark"
                onClick={() =>
                  navigate(`/candidate/jobs/${id}/report`, {
                    state: { application: existingApp },
                  })
                }
              >
                View your fit report
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/candidate/certificates')}
              >
                Add proof documents
              </Button>
            </>
          ) : (
            <>
              <Badge tone="teal">Ready to apply</Badge>
              <Heading level={2}>Take a closer look</Heading>
              <p>Upload your résumé (PDF, max 10 MB) to apply and see your private fit report.</p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div
                className={`upload-box ${selectedFile ? 'uploaded' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
              >
                {selectedFile ? (
                  <>
                    <div className="file-icon">
                      <Icon name="file" />
                    </div>
                    <div>
                      <strong>{selectedFile.name}</strong>
                      <small>
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready to submit
                      </small>
                    </div>
                    <Icon name="check" />
                  </>
                ) : (
                  <>
                    <div className="upload-icon">
                      <Icon name="upload" />
                    </div>
                    <strong>Drop your résumé here</strong>
                    <small>or click to browse · PDF format up to 10 MB</small>
                  </>
                )}
              </div>

              {fileError && (
                <div
                  role="alert"
                  style={{
                    color: 'var(--red-text)',
                    fontSize: '0.85rem',
                    marginTop: '8px',
                  }}
                >
                  {fileError}
                </div>
              )}

              <Button
                disabled={!selectedFile || applying}
                loading={applying}
                onClick={handleApply}
              >
                Apply now
              </Button>

              <small className="privacy">
                <Icon name="shield" /> Your résumé is private and shared only with the hiring team.
              </small>
            </>
          )}
        </aside>
      </div>
    </main>
  );
};
