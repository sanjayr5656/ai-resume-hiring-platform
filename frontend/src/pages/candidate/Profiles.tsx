import { useState, useEffect } from 'react';
import { PageHeader, Card, Button, Badge, Icon, SectionTitle, Field } from '../../components/ui';
import { CodingStatsSummary } from '../../components/candidate/CodingStatsSummary';
import { CodingPlatformCard } from '../../components/candidate/CodingPlatformCard';
import { useToast } from '../../context/ToastContext';
import {
  getProfile,
  addProfileLink,
  deleteProfileLink,
  refreshPlatformStats,
  submitManualStats,
  updateProfileLink,
} from '../../api/profile';
import type { UserProfile, CodingPlatform } from '../../types';

export const Profiles = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingPlatform, setRefreshingPlatform] = useState<string | null>(null);

  // Link Platform Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<CodingPlatform>('leetcode');
  const [platformUsername, setPlatformUsername] = useState('');
  const [addingPlatform, setAddingPlatform] = useState(false);

  // LinkedIn State
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [savingLinkedin, setSavingLinkedin] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      if (data.linkedin) {
        setLinkedinUrl(data.linkedin.url || '');
        setHeadline(data.linkedin.headline || '');
        setCurrentRole(data.linkedin.currentRole || '');
        setSkills(data.linkedin.skills || []);
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformUsername.trim()) {
      toast('Please enter a username or profile URL', 'error');
      return;
    }

    setAddingPlatform(true);
    try {
      const trimmed = platformUsername.trim();
      const payload: any = {
        platform: selectedPlatform,
        url: trimmed,
        username: trimmed,
      };

      const updated = await addProfileLink(payload);
      setProfile(updated);
      setShowAddModal(false);
      setPlatformUsername('');
      toast(`Connected & live-synced ${selectedPlatform} successfully!`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to connect platform', 'error');
    } finally {
      setAddingPlatform(false);
    }
  };

  const handleRefreshStats = async (platform: string) => {
    setRefreshingPlatform(platform);
    try {
      const fresh = await refreshPlatformStats(platform);
      setProfile((prev) => {
        if (!prev) return prev;
        const nextStats = [...prev.codingStats];
        const idx = nextStats.findIndex((s) => s.platform === platform);
        if (idx !== -1) nextStats[idx] = fresh;
        else nextStats.push(fresh);
        return { ...prev, codingStats: nextStats };
      });
      toast(`Updated ${platform} stats!`);
    } catch (err: any) {
      toast(err.response?.data?.error || `Failed to refresh ${platform}`, 'error');
    } finally {
      setRefreshingPlatform(null);
    }
  };

  const handleManualSave = async (platform: string, manualData: any) => {
    try {
      const updated = await submitManualStats(platform, manualData);
      setProfile((prev) => {
        if (!prev) return prev;
        const nextStats = [...prev.codingStats];
        const idx = nextStats.findIndex((s) => s.platform === platform);
        if (idx !== -1) nextStats[idx] = updated;
        else nextStats.push(updated);
        return { ...prev, codingStats: nextStats };
      });
      toast('Manual stats recorded');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save stats', 'error');
    }
  };

  const handleUnlink = async (platform: string) => {
    if (!confirm(`Are you sure you want to unlink ${platform}?`)) return;
    try {
      const updated = await deleteProfileLink(platform);
      setProfile(updated);
      toast(`Unlinked ${platform}`);
    } catch (err: any) {
      toast(err.response?.data?.error || `Failed to unlink ${platform}`, 'error');
    }
  };

  const handleSaveLinkedin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLinkedin(true);
    try {
      const updated = await updateProfileLink('linkedin', {
        url: linkedinUrl,
        headline,
        currentRole,
        skills,
      });
      setProfile(updated);
      toast('LinkedIn details updated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update LinkedIn details', 'error');
    } finally {
      setSavingLinkedin(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 16px' }}>
        <PageHeader title="Profiles & Coding Stats" text="Loading your profile data..." />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const linkedPlatforms = profile?.platformLinks || [];
  const codingStats = profile?.codingStats || [];
  const linkedPlatformTypes = linkedPlatforms.map((l) => l.platform);
  const availableToLink: CodingPlatform[] = (['leetcode', 'hackerrank', 'codechef', 'github'] as CodingPlatform[]).filter(
    (p) => !linkedPlatformTypes.includes(p)
  );

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 16px' }}>
      <PageHeader
        title="Profiles & Coding Stats"
        text="Connect your competitive programming accounts and professional links. These are automatically attached to your job applications."
        action={
          availableToLink.length > 0 ? (
            <Button variant="primary" icon="plus" onClick={() => setShowAddModal(true)}>
              Connect Account
            </Button>
          ) : undefined
        }
      />

      {/* Top summary strip across all coding platforms */}
      <CodingStatsSummary stats={codingStats} links={linkedPlatforms} />

      {/* Grid of connected coding platforms */}
      <div style={{ marginBottom: '40px' }}>
        <SectionTitle
          title="Competitive Programming & Code Profiles"
          text={`${linkedPlatforms.length} account(s) connected and ready to attach to applications`}
        />

        {linkedPlatforms.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '48px 24px', marginTop: '16px' }}>
            <div style={{ color: '#1a6b5e', marginBottom: '12px' }}>
              <Icon name="code" size={36} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1a1a1a' }}>
              No Coding Accounts Connected Yet
            </h3>
            <p style={{ color: '#666', fontSize: '14px', maxWidth: 460, margin: '0 auto 20px' }}>
              Connect your LeetCode, HackerRank, or CodeChef profiles to verify problem-solving metrics and stand out to recruiters automatically.
            </p>
            <Button variant="primary" icon="plus" onClick={() => setShowAddModal(true)}>
              Connect Your First Platform
            </Button>
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              marginTop: '16px',
            }}
          >
            {linkedPlatforms.map((link) => {
              const stats = codingStats.find((s) => s.platform === link.platform);
              return (
                <CodingPlatformCard
                  key={link.platform}
                  link={link}
                  stats={stats}
                  refreshing={refreshingPlatform === link.platform}
                  onRefresh={handleRefreshStats}
                  onManualSave={handleManualSave}
                  onUnlink={handleUnlink}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Professional Presence / LinkedIn Card */}
      <div style={{ marginBottom: '40px' }}>
        <SectionTitle
          title="Professional Presence & LinkedIn"
          text="Highlight your role, headline, and core verified competencies"
        />
        <Card style={{ padding: '24px', marginTop: '16px' }}>
          <form onSubmit={handleSaveLinkedin}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <Field
                label="LinkedIn Profile URL"
                placeholder="https://www.linkedin.com/in/..."
                value={linkedinUrl}
                onChange={setLinkedinUrl}
                hint="Your public LinkedIn URL"
              />

              <Field
                label="Current Professional Role / Title"
                placeholder="e.g. Senior Software Engineer"
                value={currentRole}
                onChange={setCurrentRole}
                hint="e.g. Full Stack Developer at Acme Corp"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Field
                label="Professional Headline / Bio"
                placeholder="e.g. Passionate about distributed systems and cloud architecture"
                value={headline}
                onChange={setHeadline}
                hint="Brief overview of your experience and interests"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                Top Endorsed Skills
              </label>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px 0' }}>
                Add key skills shown on your LinkedIn profile
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Type skill and press Add or Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #dcd7ce',
                    fontSize: '14px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button variant="secondary" onClick={handleAddSkill}>
                  Add
                </Button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f4f2ee',
                      color: '#2d3748',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: '#718096',
                        display: 'flex',
                      }}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
                {skills.length === 0 && (
                  <span style={{ fontSize: '13px', color: '#999' }}>No skills added yet</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" type="submit" loading={savingLinkedin}>
                Save LinkedIn Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Connect Account Modal */}
      {showAddModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="modal-card" style={{ maxWidth: 440, width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                Connect Coding Platform
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPlatform}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'block', marginBottom: '6px' }}>
                  Select Platform
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {availableToLink.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlatform(p)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: selectedPlatform === p ? '2px solid #1a6b5e' : '1px solid #e2ddd4',
                        background: selectedPlatform === p ? 'rgba(26, 107, 94, 0.06)' : '#fff',
                        fontWeight: selectedPlatform === p ? 600 : 400,
                        color: selectedPlatform === p ? '#1a6b5e' : '#333',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {p === 'leetcode'
                        ? 'LeetCode'
                        : p === 'hackerrank'
                        ? 'HackerRank'
                        : p === 'codechef'
                        ? 'CodeChef'
                        : 'GitHub'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <Field
                  label={`${selectedPlatform === 'github' ? 'GitHub' : selectedPlatform === 'leetcode' ? 'LeetCode' : selectedPlatform === 'hackerrank' ? 'HackerRank' : 'CodeChef'} Profile URL or Username`}
                  placeholder={
                    selectedPlatform === 'github'
                      ? 'https://github.com/your-username'
                      : selectedPlatform === 'leetcode'
                      ? 'https://leetcode.com/your-username'
                      : selectedPlatform === 'hackerrank'
                      ? 'https://www.hackerrank.com/your-username'
                      : 'https://www.codechef.com/users/your-username'
                  }
                  value={platformUsername}
                  onChange={setPlatformUsername}
                  hint="Paste your profile URL directly (or just your username) — live stats sync automatically"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={addingPlatform}>
                  Connect & Sync
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
