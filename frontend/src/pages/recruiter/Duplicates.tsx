import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { detectDuplicates, updateApplicationStatus } from '../../api/recruiter';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, Card, Heading, Icon, PageHeader } from '../../components/ui';
import type { DuplicateGroup } from '../../types';

export const Duplicates = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [threshold, setThreshold] = useState<number>(85);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissedGroupIndices, setDismissedGroupIndices] = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function loadDuplicates() {
      try {
        setError('');
        const res = await detectDuplicates(id!);
        if (mounted) {
          setThreshold(res.threshold);
          setGroups(res.groups || []);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to run duplicate detection'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDuplicates();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDismiss = (index: number) => {
    setDismissedGroupIndices((prev) => [...prev, index]);
    toast('Duplicate flag dismissed locally');
  };

  const handleRejectCandidate = async (applicationId: string, candidateName: string) => {
    try {
      await updateApplicationStatus(applicationId, 'rejected');
      toast(`${candidateName} marked as rejected`);
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to reject application'), 'error');
    }
  };

  const visibleGroups = groups.filter((_, i) => !dismissedGroupIndices.includes(i));

  return (
    <main className="page">
      <button
        type="button"
        className="back-link"
        onClick={() => navigate(id ? `/recruiter/jobs/${id}/applicants` : '/recruiter')}
      >
        <Icon name="back" /> Applicants
      </button>

      <PageHeader
        eyebrow="Duplicate detection"
        title="Similar résumés, shown side by side."
        text={`Automated shingling and contact hash detection (Threshold: ${threshold}%). Similarity is a forensic signal, not a verdict. Review the evidence before acting.`}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <span className="spinner" />
        </div>
      ) : error ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red-text)' }}>{error}</p>
        </Card>
      ) : visibleGroups.length === 0 ? (
        <Card style={{ padding: '36px', textAlign: 'center' }}>
          <Heading level={3}>No duplicate candidates flagged</Heading>
          <p style={{ marginTop: '8px' }}>
            All applicants for this position have unique contact information and distinct résumé text profiles.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {visibleGroups.map((group, groupIdx) => {
            const first = group.applications[0];
            const second = group.applications[1];

            return (
              <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Card className="duplicate-summary">
                  <div>
                    <Badge tone="coral">{group.similarity}% similar</Badge>
                    <Heading level={2}>
                      {first?.candidate || 'Candidate A'} & {second?.candidate || 'Candidate B'}
                    </Heading>
                    <p>Reason: {group.reason || 'High textual overlap across experience and contact sections.'}</p>
                  </div>
                  <div className="duplicate-actions">
                    <Button variant="secondary" onClick={() => handleDismiss(groupIdx)}>
                      Dismiss
                    </Button>
                  </div>
                </Card>

                <div className="comparison">
                  {group.applications.map((cand, candIdx) => {
                    const initials = (cand.candidate || 'C')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((x) => x[0].toUpperCase())
                      .join('');

                    return (
                      <Card key={cand.id}>
                        <div className="compare-person">
                          <div className={`person-avatar ${candIdx === 1 ? 'coral' : ''}`}>
                            {initials}
                          </div>
                          <div>
                            <Heading level={3}>{cand.candidate}</Heading>
                            <small>Application ID: {cand.id.slice(-6)}</small>
                          </div>
                          <Badge tone={candIdx === 0 ? 'neutral' : 'coral'}>
                            {candIdx === 0 ? 'Application #1' : 'Application #2'}
                          </Badge>
                        </div>

                        <div className="resume-content">
                          <small>Extracted preview text</small>
                          <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', marginTop: '6px' }}>
                            {cand.preview || 'No résumé text preview available.'}
                          </p>
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="danger"
                            onClick={() => handleRejectCandidate(cand.id, cand.candidate)}
                          >
                            Reject this application
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
