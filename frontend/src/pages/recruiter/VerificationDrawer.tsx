import { useEffect, useState } from 'react';
import { runAiCheck, verifyCertification } from '../../api/recruiter';
import { fetchProofBlobUrl } from '../../api/applications';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, Field, Heading, Icon, Progress } from '../../components/ui';
import type { Application, Certification } from '../../types';

interface VerificationDrawerProps {
  application: Application;
  certification: Certification;
  close: () => void;
  onSuccess: (updated: Application) => void;
}

export const VerificationDrawer = ({
  application,
  certification,
  close,
  onSuccess,
}: VerificationDrawerProps) => {
  const { toast } = useToast();

  const [currentCert, setCurrentCert] = useState<Certification>(certification);
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const [aiChecking, setAiChecking] = useState(false);
  const [rejectingMode, setRejectingMode] = useState(false);
  const [reviewerNote, setReviewerNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [verifying, setVerifying] = useState(false);

  const proofFiles = currentCert.proofFiles || [];
  const currentFile = proofFiles[activeProofIndex];

  // Load document blob URL with Authorization header
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadDoc() {
      if (!currentFile) {
        setBlobUrl(null);
        return;
      }
      setLoadingDoc(true);
      try {
        const { url } = await fetchProofBlobUrl(application._id, currentCert._id, currentFile.fileId);
        if (active) {
          createdUrl = url;
          setBlobUrl(url);
        }
      } catch (err) {
        if (active) {
          toast(getErrorMessage(err, 'Failed to stream authenticated proof document'), 'error');
        }
      } finally {
        if (active) setLoadingDoc(false);
      }
    }

    loadDoc();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [application._id, currentCert._id, currentFile]);

  // Run AI Check
  const handleRunAiCheck = async () => {
    setAiChecking(true);
    try {
      const updatedApp = await runAiCheck(application._id, currentCert._id);
      const updatedCert = updatedApp.parsed?.certifications?.find(
        (c) => c._id === currentCert._id
      );
      if (updatedCert) {
        setCurrentCert(updatedCert);
      }
      toast('AI Forensic Inspection completed');
      onSuccess(updatedApp);
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to complete AI check'), 'error');
    } finally {
      setAiChecking(false);
    }
  };

  // Confirm Verified
  const handleConfirmVerified = async () => {
    setVerifying(true);
    try {
      const updatedApp = await verifyCertification(
        application._id,
        currentCert._id,
        'verified',
        reviewerNote.trim() || 'Verified by recruiter after forensic document inspection.'
      );
      toast('Certificate marked as Verified');
      onSuccess(updatedApp);
      close();
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to verify certificate'), 'error');
    } finally {
      setVerifying(false);
    }
  };

  // Confirm Rejection
  const handleConfirmRejected = async () => {
    if (!rejectReason.trim()) {
      toast('A rejection reason is required.', 'error');
      return;
    }
    setVerifying(true);
    try {
      const updatedApp = await verifyCertification(
        application._id,
        currentCert._id,
        'rejected',
        rejectReason.trim()
      );
      toast('Certificate marked as Rejected');
      onSuccess(updatedApp);
      close();
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to reject certificate'), 'error');
    } finally {
      setVerifying(false);
    }
  };

  const aiResult = currentCert.aiCheckResult;
  const extracted = aiResult?.extracted;

  const getMatchState = (claimed?: string, ext?: string) => {
    if (!ext) return 'review';
    if (!claimed) return 'review';
    if (claimed.toLowerCase() === ext.toLowerCase()) return 'match';
    if (claimed.toLowerCase().includes(ext.toLowerCase()) || ext.toLowerCase().includes(claimed.toLowerCase())) {
      return 'match';
    }
    return 'mismatch';
  };

  return (
    <div className="overlay verification-overlay" onClick={close} role="dialog" aria-modal="true">
      <section className="verification-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <Badge tone="grey">Human review required</Badge>
            <strong>Certificate verification · {currentCert.name}</strong>
          </div>
          <button type="button" onClick={close} aria-label="Close verification">
            <Icon name="x" />
          </button>
        </div>

        <div className="verify-grid">
          {/* Document Viewer */}
          <div className="document-viewer">
            <div className="viewer-tools">
              <span>{currentFile ? currentFile.originalName : 'No file uploaded'}</span>
              {proofFiles.length > 0 && (
                <Badge>
                  {activeProofIndex + 1} / {proofFiles.length}
                </Badge>
              )}
            </div>

            <div className="document" style={{ position: 'relative', overflow: 'hidden' }}>
              {loadingDoc ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span className="spinner" />
                </div>
              ) : blobUrl ? (
                <iframe
                  src={blobUrl}
                  title="Proof Document"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div className="doc-seal">
                    <Icon name="shield" size={34} />
                  </div>
                  <Heading level={3}>{currentCert.name}</Heading>
                  <p>{currentCert.issuer || 'Issuer unverified'}</p>
                  {currentCert.credentialUrl && (
                    <p style={{ marginTop: '12px' }}>
                      <a href={currentCert.credentialUrl} target="_blank" rel="noreferrer" className="text-link">
                        Open credential verification URL ↗
                      </a>
                    </p>
                  )}
                  {proofFiles.length === 0 && (
                    <small style={{ display: 'block', marginTop: '12px' }}>
                      No direct document file attached. Review external credential URL.
                    </small>
                  )}
                </div>
              )}
            </div>

            {proofFiles.length > 1 && (
              <div className="thumb-strip">
                {proofFiles.map((file, idx) => (
                  <button
                    key={file.fileId}
                    type="button"
                    className={activeProofIndex === idx ? 'active' : ''}
                    onClick={() => setActiveProofIndex(idx)}
                  >
                    <Icon name="file" />
                    <span>{file.originalName.slice(0, 16)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verification Panel */}
          <div className="verify-panel">
            <div className="compare-head">
              <div>
                <Heading level={2}>Claimed vs. extracted</Heading>
                <p>Forensic inspection of claimed details against proof text.</p>
              </div>
              <Button
                variant="coral"
                icon="spark"
                loading={aiChecking}
                onClick={handleRunAiCheck}
              >
                Run AI check
              </Button>
            </div>

            {aiResult && extracted ? (
              <div className="compare-list">
                <CompareRow
                  label="Name"
                  claimed={
                    (typeof application.candidateId === 'object'
                      ? application.candidateId.name
                      : application.parsed?.name) || 'Candidate'
                  }
                  extracted={extracted.candidateName || '—'}
                  state={getMatchState(
                    typeof application.candidateId === 'object'
                      ? application.candidateId.name
                      : application.parsed?.name,
                    extracted.candidateName
                  )}
                />
                <CompareRow
                  label="Course / Title"
                  claimed={currentCert.name}
                  extracted={extracted.courseTitle || '—'}
                  state={getMatchState(currentCert.name, extracted.courseTitle)}
                />
                <CompareRow
                  label="Issuer"
                  claimed={currentCert.issuer || '—'}
                  extracted={extracted.issuer || '—'}
                  state={getMatchState(currentCert.issuer, extracted.issuer)}
                />
                <CompareRow
                  label="Issue date"
                  claimed={currentCert.auditTrail?.[0]?.at ? new Date(currentCert.auditTrail[0].at).toLocaleDateString() : 'Claimed'}
                  extracted={extracted.dateOrDuration || '—'}
                  state="review"
                />
                <CompareRow
                  label="Credential ID"
                  claimed={currentCert.credentialId || 'None'}
                  extracted={extracted.credentialId || '—'}
                  state={getMatchState(currentCert.credentialId, extracted.credentialId)}
                />
              </div>
            ) : (
              <Card style={{ padding: '16px', background: 'var(--paper)' }}>
                <p>Click "Run AI check" to perform automated optical text inspection and domain comparison.</p>
              </Card>
            )}

            {aiResult && (
              <Card className="verdict">
                <div>
                  <div className="verdict-icon">
                    <Icon name="shield" />
                  </div>
                  <span>
                    <Badge
                      tone={
                        aiResult.verdict === 'likely_valid'
                          ? 'sage'
                          : aiResult.verdict === 'needs_review'
                          ? 'amber'
                          : 'red'
                      }
                    >
                      {aiResult.verdict === 'likely_valid'
                        ? 'Likely valid'
                        : aiResult.verdict === 'needs_review'
                        ? 'Needs review'
                        : 'Suspicious'}
                    </Badge>
                    <strong>{aiResult.confidence}% confidence</strong>
                  </span>
                </div>
                <Progress
                  value={aiResult.confidence}
                  tone={aiResult.verdict === 'likely_valid' ? 'teal' : 'coral'}
                />
                {aiResult.findings?.length > 0 && (
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                    {aiResult.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            <label className="field">
              <span>Reviewer note</span>
              <textarea
                rows={3}
                placeholder="Add a private verification note for your recruiting team…"
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
              />
            </label>

            <div className="human-note">
              <Icon name="user" />
              <p>
                <strong>The final decision is yours.</strong>
                <br />
                AI findings are forensic supporting evidence, never automatic verification.
              </p>
            </div>

            {rejectingMode && (
              <div className="reject-box">
                <Field
                  label="Reason for rejection *"
                  placeholder="Explain what could not be verified from the document"
                  value={rejectReason}
                  onChange={setRejectReason}
                  required
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <Button variant="ghost" onClick={() => setRejectingMode(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    loading={verifying}
                    onClick={handleConfirmRejected}
                  >
                    Confirm rejection
                  </Button>
                </div>
              </div>
            )}

            {!rejectingMode && (
              <div className="verify-actions">
                <Button variant="danger" onClick={() => setRejectingMode(true)}>
                  Reject
                </Button>
                <Button
                  icon="check"
                  loading={verifying}
                  onClick={handleConfirmVerified}
                >
                  Confirm verified
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const CompareRow = ({
  label,
  claimed,
  extracted,
  state,
}: {
  label: string;
  claimed: string;
  extracted: string;
  state: 'match' | 'review' | 'mismatch';
}) => (
  <div className="compare-row">
    <span>{label}</span>
    <div>
      <small>Claimed</small>
      <strong>{claimed}</strong>
    </div>
    <div>
      <small>AI extracted</small>
      <strong>{extracted}</strong>
    </div>
    <Badge tone={state === 'match' ? 'sage' : state === 'review' ? 'amber' : 'red'}>
      {state === 'match' ? 'Match' : state === 'review' ? 'Review' : 'Differs'}
    </Badge>
  </div>
);
