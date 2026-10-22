import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { getMyApplications } from '../../api/jobs';
import {
  addCertification,
  deleteCertification,
  deleteProofFile,
  uploadProof,
  fetchProofBlobUrl,
} from '../../api/applications';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, Field, Heading, Icon, PageHeader, Progress } from '../../components/ui';
import type { Application, Certification } from '../../types';

export const Certificates = () => {
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // New certificate modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certId, setCertId] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [newProofFiles, setNewProofFiles] = useState<File[]>([]);
  const [submittingCert, setSubmittingCert] = useState(false);

  // Active proof viewing state
  const [previewingDoc, setPreviewingDoc] = useState<{ url: string; name: string } | null>(null);

  const newFileInputRef = useRef<HTMLInputElement>(null);

  const fetchApps = async () => {
    try {
      const apps = await getMyApplications();
      setApplications(apps);
      if (apps.length > 0 && !selectedAppId) {
        setSelectedAppId(apps[0]._id);
      }
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to load certifications'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreateCertificate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !certName.trim() || submittingCert) return;

    setSubmittingCert(true);
    try {
      await addCertification(selectedAppId, {
        name: certName.trim(),
        issuer: certIssuer.trim(),
        credentialId: certId.trim(),
        credentialUrl: certUrl.trim(),
        proofs: newProofFiles,
      });
      toast('Certificate added successfully');
      setShowAddModal(false);
      setCertName('');
      setCertIssuer('');
      setCertId('');
      setCertUrl('');
      setNewProofFiles([]);
      await fetchApps();
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to add certificate'), 'error');
    } finally {
      setSubmittingCert(false);
    }
  };

  const handleUploadAdditionalProof = async (appId: string, certItem: Certification, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    try {
      await uploadProof(appId, certItem._id, { proofs: fileArray });
      toast(`${fileArray.length} proof document(s) uploaded successfully`);
      await fetchApps();
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to upload proof documents'), 'error');
    }
  };

  const handleDeleteCert = async (appId: string, certItemId: string) => {
    if (!window.confirm('Are you sure you want to remove this certificate?')) return;
    try {
      await deleteCertification(appId, certItemId);
      toast('Certificate removed');
      await fetchApps();
    } catch (err) {
      toast(getErrorMessage(err, 'Cannot remove certificate'), 'error');
    }
  };

  const handleDeleteProof = async (appId: string, certItemId: string, fileId: string) => {
    try {
      await deleteProofFile(appId, certItemId, fileId);
      toast('Proof document removed');
      await fetchApps();
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to remove proof file'), 'error');
    }
  };

  const handlePreviewProof = async (appId: string, certItemId: string, fileId: string, fileName: string) => {
    try {
      const { url } = await fetchProofBlobUrl(appId, certItemId, fileId);
      setPreviewingDoc({ url, name: fileName });
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to open proof document'), 'error');
    }
  };

  // Group all certificates with their parent applicationId
  const allCertsWithApp = applications.flatMap((app) =>
    (app.parsed?.certifications || []).map((c) => ({
      cert: c,
      appId: app._id,
      jobTitle: typeof app.jobId === 'object' ? app.jobId?.title : 'Applied role',
    }))
  );

  return (
    <main className="page">
      <PageHeader
        eyebrow="Certificates & proof"
        title="Show the verified evidence behind your skills"
        text="Add proof for your certifications to boost your AI trust score and stand out to hiring managers."
        action={
          applications.length > 0 ? (
            <Button icon="plus" onClick={() => setShowAddModal(true)}>
              Add certificate
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <span className="spinner" />
        </div>
      ) : applications.length === 0 ? (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <Heading level={3}>No active applications</Heading>
          <p style={{ marginTop: '8px' }}>
            Submit an application to an open role first. Certifications and evidence are verified in context with the positions you apply for.
          </p>
        </Card>
      ) : allCertsWithApp.length === 0 ? (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <Heading level={3}>No certificates added yet</Heading>
          <p style={{ marginTop: '8px' }}>
            Boost your candidate ranking by adding licenses, certificates, and proof documents.
          </p>
          <Button
            style={{ marginTop: '16px' }}
            icon="plus"
            onClick={() => setShowAddModal(true)}
          >
            Add your first certificate
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {allCertsWithApp.map(({ cert, appId, jobTitle }) => (
            <CertificateCardItem
              key={cert._id}
              cert={cert}
              appId={appId}
              jobTitle={jobTitle}
              onPreviewProof={handlePreviewProof}
              onDeleteProof={handleDeleteProof}
              onDeleteCert={handleDeleteCert}
              onUploadProof={handleUploadAdditionalProof}
              onRefresh={fetchApps}
            />
          ))}
        </div>
      )}

      {/* Add Certificate Modal */}
      {showAddModal && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              margin: 'auto',
              background: 'white',
              padding: '28px',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <Heading level={2}>Add certificate</Heading>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icon name="x" />
              </button>
            </div>

            <form onSubmit={handleCreateCertificate}>
              <label className="field" style={{ marginBottom: '14px' }}>
                <span>Associate with application *</span>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    background: 'white',
                    font: 'inherit',
                  }}
                >
                  {applications.map((app) => (
                    <option key={app._id} value={app._id}>
                      {typeof app.jobId === 'object' ? app.jobId?.title : 'Role'} (
                      {new Date(app.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Certificate name"
                placeholder="e.g. AWS Certified Solutions Architect"
                value={certName}
                onChange={setCertName}
                required
              />

              <Field
                label="Issuer"
                placeholder="e.g. Amazon Web Services, Google, Coursera"
                value={certIssuer}
                onChange={setCertIssuer}
              />

              <Field
                label="Credential ID"
                placeholder="e.g. AWS-PSA-108291"
                value={certId}
                onChange={setCertId}
              />

              <Field
                label="Credential verification link"
                placeholder="https://..."
                value={certUrl}
                onChange={setCertUrl}
              />

              <label className="field" style={{ marginTop: '12px' }}>
                <span>Upload proof documents (PDF or image)</span>
                <input
                  ref={newFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setNewProofFiles(Array.from(e.target.files || []))}
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submittingCert} disabled={!certName.trim()}>
                  Save certificate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {previewingDoc && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewingDoc(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '850px',
              height: '80vh',
              background: 'white',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <strong>{previewingDoc.name}</strong>
              <button
                type="button"
                onClick={() => setPreviewingDoc(null)}
                aria-label="Close document preview"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Icon name="x" />
              </button>
            </div>
            <iframe
              src={previewingDoc.url}
              title={previewingDoc.name}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}
    </main>
  );
};

interface CertificateCardItemProps {
  cert: Certification;
  appId: string;
  jobTitle: string;
  onPreviewProof: (appId: string, certId: string, fileId: string, fileName: string) => void;
  onDeleteProof: (appId: string, certId: string, fileId: string) => void;
  onDeleteCert: (appId: string, certId: string) => void;
  onUploadProof: (appId: string, cert: Certification, files: FileList | null) => void;
  onRefresh: () => Promise<void>;
}

const CertificateCardItem = ({
  cert,
  appId,
  jobTitle,
  onPreviewProof,
  onDeleteProof,
  onDeleteCert,
  onUploadProof,
  onRefresh,
}: CertificateCardItemProps) => {
  const { toast } = useToast();
  const [credentialId, setCredentialId] = useState(cert.credentialId || '');
  const [credentialUrl, setCredentialUrl] = useState(cert.credentialUrl || '');
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();

  useEffect(() => {
    setCredentialId(cert.credentialId || '');
    setCredentialUrl(cert.credentialUrl || '');
  }, [cert.credentialId, cert.credentialUrl]);

  const isVerified = cert.verificationStatus === 'verified';
  const hasChanges =
    credentialId.trim() !== (cert.credentialId || '').trim() ||
    credentialUrl.trim() !== (cert.credentialUrl || '').trim();

  const handleSaveCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving || isVerified) return;

    let targetUrl = credentialUrl.trim();
    if (targetUrl) {
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
        setCredentialUrl(targetUrl);
      }
      try {
        new URL(targetUrl);
      } catch {
        setUrlError('Please enter a valid URL (e.g. https://...)');
        return;
      }
    }
    setUrlError(undefined);
    setSaving(true);
    try {
      await uploadProof(appId, cert._id, {
        credentialId: credentialId.trim(),
        credentialUrl: targetUrl,
      });
      toast('Credential details saved successfully');
      await onRefresh();
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to update credentials'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toneMap: Record<string, string> = {
    claimed: 'grey',
    proof_provided: 'blue',
    ai_checked: 'lavender',
    verified: 'sage',
    rejected: 'red',
  };
  const labelMap: Record<string, string> = {
    claimed: 'Claimed',
    proof_provided: 'Proof provided',
    ai_checked: 'AI checked',
    verified: 'Verified',
    rejected: 'Rejected',
  };

  const fileInputId = `upload-proof-${cert._id}`;

  return (
    <Card className="certificate">
      <div className="cert-head">
        <div>
          <Heading level={3}>{cert.name}</Heading>
          <p>
            {cert.issuer || 'Professional Issuer'} · For: {jobTitle}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge tone={toneMap[cert.verificationStatus] || 'neutral'}>
            {labelMap[cert.verificationStatus] || cert.verificationStatus}
          </Badge>
          {!isVerified && (
            <button
              type="button"
              aria-label="Remove certificate"
              className="icon-btn"
              onClick={() => onDeleteCert(appId, cert._id)}
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="cert-grid">
        <div className="upload-preview">
          {cert.proofFiles && cert.proofFiles.length > 0 ? (
            cert.proofFiles.map((f) => (
              <div className="doc-thumb" key={f.fileId}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => onPreviewProof(appId, cert._id, f.fileId, f.originalName)}
                >
                  <Icon name="file" size={28} />
                  <small
                    style={{
                      display: 'block',
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.originalName}
                  </small>
                </button>
                {!isVerified && (
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Remove ${f.originalName}`}
                    onClick={() => onDeleteProof(appId, cert._id, f.fileId)}
                  >
                    <Icon name="x" size={12} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              No proof documents attached yet.
            </p>
          )}
        </div>

        <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <Field
              label="Credential ID"
              placeholder="Enter credential / license ID"
              value={credentialId}
              onChange={setCredentialId}
              disabled={isVerified || saving}
            />
          </div>

          <div>
            <Field
              label="Credential URL"
              placeholder="https://..."
              value={credentialUrl}
              onChange={(v) => {
                setCredentialUrl(v);
                setUrlError(undefined);
              }}
              error={urlError}
              disabled={isVerified || saving}
            />
            {cert.credentialUrl && /^https?:\/\//i.test(cert.credentialUrl) && (
              <div style={{ marginTop: '4px' }}>
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#1a6b5e',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Visit Credential Link <Icon name="external" size={12} />
                </a>
              </div>
            )}
          </div>

          {!isVerified && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <Button
                type="submit"
                variant={hasChanges ? 'primary' : 'secondary'}
                size="small"
                loading={saving}
                disabled={saving || !hasChanges}
              >
                Save Credentials
              </Button>
            </div>
          )}
        </form>
      </div>

      {!isVerified && (
        <div style={{ marginTop: '14px' }}>
          <input
            id={fileInputId}
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => onUploadProof(appId, cert, e.target.files)}
          />
          <div
            className="drop-zone"
            onClick={() => document.getElementById(fileInputId)?.click()}
            role="button"
            tabIndex={0}
          >
            <Icon name="upload" />
            <strong>Drop proof files here or click to browse</strong>
            <small>PDF or image (PNG, JPG, WebP) showing badge, transcript, or certificate</small>
          </div>
        </div>
      )}
    </Card>
  );
};

