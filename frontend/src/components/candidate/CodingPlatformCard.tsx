import { useState } from 'react';
import { Badge, Button, Icon } from '../ui';
import { DifficultyBreakdownChart, RatingTrendChart, ActivitySparkline } from './PlatformCharts';
import type { CodingStats, PlatformLink } from '../../types';

interface CodingPlatformCardProps {
  link: PlatformLink;
  stats?: CodingStats;
  onRefresh: (platform: string) => Promise<void>;
  onManualSave: (platform: string, data: any) => Promise<void>;
  onUnlink: (platform: string) => Promise<void>;
  refreshing?: boolean;
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string }> = {
  leetcode: { label: 'LeetCode', color: '#f89f1b', bg: 'rgba(248, 159, 27, 0.1)' },
  hackerrank: { label: 'HackerRank', color: '#2ec866', bg: 'rgba(46, 200, 102, 0.1)' },
  codechef: { label: 'CodeChef', color: '#5b4638', bg: 'rgba(91, 70, 56, 0.1)' },
  github: { label: 'GitHub', color: '#24292e', bg: 'rgba(36, 41, 46, 0.1)' },
};

export const CodingPlatformCard = ({
  link,
  stats,
  onRefresh,
  onManualSave,
  onUnlink,
  refreshing = false,
}: CodingPlatformCardProps) => {
  const [editingManual, setEditingManual] = useState(false);
  const [manualRating, setManualRating] = useState(stats?.rating?.toString() || '');
  const [manualSolved, setManualSolved] = useState(stats?.totalSolved?.toString() || '');
  const [manualEasy, setManualEasy] = useState(stats?.easySolved?.toString() || '');
  const [manualMed, setManualMed] = useState(stats?.mediumSolved?.toString() || '');
  const [manualHard, setManualHard] = useState(stats?.hardSolved?.toString() || '');
  const [savingManual, setSavingManual] = useState(false);

  const meta = PLATFORM_META[link.platform] || { label: link.platform, color: '#1a6b5e', bg: '#f0fdf4' };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);
    try {
      await onManualSave(link.platform, {
        rating: manualRating ? Number(manualRating) : null,
        totalSolved: manualSolved ? Number(manualSolved) : null,
        easySolved: manualEasy ? Number(manualEasy) : null,
        mediumSolved: manualMed ? Number(manualMed) : null,
        hardSolved: manualHard ? Number(manualHard) : null,
      });
      setEditingManual(false);
    } finally {
      setSavingManual(false);
    }
  };

  const isFailed = stats?.status === 'failed';
  const isManual = stats?.source === 'manual' || stats?.selfReported;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e8e4dc',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}
    >
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                color: meta.color,
                background: meta.bg,
              }}
            >
              {meta.label}
            </span>
            <a
              href={link.profileUrl || `https://${link.platform}.com/${link.username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#1a6b5e',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
              title="Open public profile"
            >
              @{link.username}
              <Icon name="external" size={13} />
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isFailed ? (
              <Badge tone="red">Sync Issue</Badge>
            ) : isManual ? (
              <Badge tone="amber">Manual Entry</Badge>
            ) : stats?.status === 'ok' ? (
              <Badge tone="green">Live Synced</Badge>
            ) : (
              <Badge tone="neutral">Pending</Badge>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {link.platform !== 'github' ? (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: link.platform === 'codechef' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: '12px',
                background: '#faf9f6',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              {link.platform !== 'codechef' && (
                <div>
                  <span style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Rating</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
                    {stats?.rating ? Math.round(stats.rating) : '—'}
                  </div>
                </div>
              )}

              <div>
                <span style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Solved</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
                  {stats?.totalSolved !== null && stats?.totalSolved !== undefined ? stats.totalSolved : '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Contests</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
                  {stats?.contestsAttended ? stats.contestsAttended : '—'}
                </div>
              </div>
            </div>

            {/* Difficulty Chart */}
            {(stats?.easySolved || stats?.mediumSolved || stats?.hardSolved) ? (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>Difficulty Breakdown</span>
                <DifficultyBreakdownChart
                  easy={stats.easySolved}
                  medium={stats.mediumSolved}
                  hard={stats.hardSolved}
                />
              </div>
            ) : null}

            {/* Rating Trend */}
            {link.platform !== 'codechef' && stats?.ratingHistory && stats.ratingHistory.length > 1 && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>Contest Rating Trend</span>
                <RatingTrendChart history={stats.ratingHistory} />
              </div>
            )}

            {/* Activity Chart */}
            {stats?.activity && stats.activity.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>Recent Submissions</span>
                <ActivitySparkline activity={stats.activity} />
              </div>
            )}

            {stats?.error && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#c0392b',
                  background: 'rgba(192, 57, 43, 0.08)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                }}
              >
                {stats.error}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px 0', color: '#666', fontSize: '13px' }}>
            GitHub repository data is integrated into project evaluation and proof verification.
          </div>
        )}

        {/* Manual stats edit drawer / form */}
        {editingManual && (
          <form
            onSubmit={handleSaveManual}
            style={{
              background: '#fcfbf9',
              border: '1px solid #e2ddd4',
              borderRadius: '8px',
              padding: '14px',
              marginTop: '12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#1a1a1a' }}>
              Self-Report Platform Stats
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: link.platform === 'codechef' ? '1fr' : 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
              {link.platform !== 'codechef' && (
                <div>
                  <label style={{ fontSize: '11px', color: '#666' }}>Rating</label>
                  <input
                    type="number"
                    value={manualRating}
                    onChange={(e) => setManualRating(e.target.value)}
                    className="field-input"
                    style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                    placeholder="e.g. 1750"
                  />
                </div>
              )}
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Total Solved</label>
                <input
                  type="number"
                  value={manualSolved}
                  onChange={(e) => setManualSolved(e.target.value)}
                  className="field-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                  placeholder="e.g. 240"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#2d9e6b' }}>Easy</label>
                <input
                  type="number"
                  value={manualEasy}
                  onChange={(e) => setManualEasy(e.target.value)}
                  className="field-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#d97706' }}>Medium</label>
                <input
                  type="number"
                  value={manualMed}
                  onChange={(e) => setManualMed(e.target.value)}
                  className="field-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#c0392b' }}>Hard</label>
                <input
                  type="number"
                  value={manualHard}
                  onChange={(e) => setManualHard(e.target.value)}
                  className="field-input"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setEditingManual(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={savingManual}>
                Save Stats
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f0ede6',
        }}
      >
        <span style={{ fontSize: '11px', color: '#999' }}>
          {stats?.fetchedAt
            ? `Synced ${new Date(stats.fetchedAt).toLocaleDateString()}`
            : 'Not yet synced'}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {link.platform !== 'github' && (
            <>
              <Button
                variant="ghost"
                icon="refresh"
                loading={refreshing}
                onClick={() => onRefresh(link.platform)}
                ariaLabel="Refresh platform stats"
              >
                Sync
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingManual(!editingManual)}
                ariaLabel="Edit stats manually"
              >
                Manual
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            icon="trash"
            onClick={() => onUnlink(link.platform)}
            ariaLabel="Unlink platform"
          />
        </div>
      </div>
    </div>
  );
};
