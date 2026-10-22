import { useState, useEffect } from 'react';
import { PageHeader, Card, Button, SectionTitle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { getProfile } from '../../api/profile';
import { updateNotificationPreferences } from '../../api/notifications';

export const NotificationSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emailStatusUpdates, setEmailStatusUpdates] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [jobAlertsMode, setJobAlertsMode] = useState<'instant' | 'digest' | 'off'>('instant');
  const [minFitScore, setMinFitScore] = useState(40);

  useEffect(() => {
    async function loadPrefs() {
      try {
        setLoading(true);
        const profile = await getProfile();
        const p = profile.notificationPreferences;
        if (p) {
          setEmailStatusUpdates(p.emailStatusUpdates ?? true);
          setJobAlerts(p.jobAlerts ?? true);
          setJobAlertsMode(p.jobAlertsMode || 'instant');
          setMinFitScore(p.minFitScore ?? 40);
        }
      } catch {
        toast('Could not load preferences', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateNotificationPreferences({
        emailStatusUpdates,
        jobAlerts,
        jobAlertsMode,
        minFitScore,
      });
      toast('Notification preferences saved successfully!');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
        <PageHeader title="Notification Preferences" text="Loading settings..." />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
      <PageHeader
        title="Notification Preferences"
        text="Control how and when you receive email alerts and status updates."
      />

      <form onSubmit={handleSave}>
        <Card style={{ padding: '24px', marginBottom: '24px' }}>
          <SectionTitle title="Email Alerts" />

          {/* Status Updates */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: '1px solid #f0ede6',
            }}
          >
            <div>
              <strong style={{ fontSize: '15px', color: '#1a1a1a', display: 'block', marginBottom: '4px' }}>
                Application Status Updates
              </strong>
              <span style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                Receive instant email notification when a recruiter shortlists your application or updates its status.
              </span>
            </div>
            <label className="switch" style={{ marginLeft: '16px', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={emailStatusUpdates}
                onChange={(e) => setEmailStatusUpdates(e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>

          {/* Job Alerts Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: '1px solid #f0ede6',
            }}
          >
            <div>
              <strong style={{ fontSize: '15px', color: '#1a1a1a', display: 'block', marginBottom: '4px' }}>
                Matching Role Alerts
              </strong>
              <span style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                Get notified when hiring managers post new jobs that match your skills and experience profile.
              </span>
            </div>
            <label className="switch" style={{ marginLeft: '16px', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={jobAlerts}
                onChange={(e) => setJobAlerts(e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>

          {/* Delivery Mode */}
          {jobAlerts && (
            <div style={{ padding: '16px 0', borderBottom: '1px solid #f0ede6' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                Delivery Frequency
              </label>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px 0' }}>
                Choose whether to get notified immediately or in a digest
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['instant', 'digest', 'off'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setJobAlertsMode(mode)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: jobAlertsMode === mode ? '2px solid #1a6b5e' : '1px solid #e2ddd4',
                      background: jobAlertsMode === mode ? 'rgba(26, 107, 94, 0.08)' : '#fff',
                      color: jobAlertsMode === mode ? '#1a6b5e' : '#333',
                      fontWeight: jobAlertsMode === mode ? 600 : 400,
                      textTransform: 'capitalize',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Minimum Fit Score Slider */}
          {jobAlerts && (
            <div style={{ padding: '16px 0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                Minimum Fit Score Threshold ({minFitScore}%)
              </label>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px 0' }}>
                Only send alerts for jobs where your estimated skill overlap meets or exceeds this threshold.
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minFitScore}
                onChange={(e) => setMinFitScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#1a6b5e', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginTop: '4px' }}>
                <span>0% (All jobs)</span>
                <span>50% (Moderate fit)</span>
                <span>100% (Exact match)</span>
              </div>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" type="submit" loading={saving}>
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
