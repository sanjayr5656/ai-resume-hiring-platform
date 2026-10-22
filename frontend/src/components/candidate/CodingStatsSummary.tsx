import { Icon } from '../ui';
import type { CodingStats, PlatformLink } from '../../types';

interface CodingStatsSummaryProps {
  stats: CodingStats[];
  links: PlatformLink[];
}

export const CodingStatsSummary = ({ stats, links }: CodingStatsSummaryProps) => {
  const totalSolved = stats.reduce((acc, s) => acc + (Number(s.totalSolved) || 0), 0);
  const maxRating = stats.reduce((max, s) => {
    const r = Number(s.rating) || 0;
    return r > max ? r : max;
  }, 0);
  const totalContests = stats.reduce((acc, s) => acc + (Number(s.contestsAttended) || 0), 0);
  const platformsCount = links.length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        background: '#ffffff',
        border: '1px solid #e8e4dc',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: 'rgba(26, 107, 94, 0.1)',
            color: '#1a6b5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="code" size={22} />
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#777' }}>
            Total Problems Solved
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
            {totalSolved > 0 ? totalSolved.toLocaleString() : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: 'rgba(224, 92, 58, 0.1)',
            color: '#e05c3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="spark" size={22} />
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#777' }}>
            Peak Contest Rating
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
            {maxRating > 0 ? Math.round(maxRating) : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: 'rgba(45, 158, 107, 0.1)',
            color: '#2d9e6b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="shield" size={22} />
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#777' }}>
            Contests Attended
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
            {totalContests > 0 ? totalContests : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="link" size={22} />
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#777' }}>
            Linked Accounts
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
            {platformsCount} <span style={{ fontSize: '14px', fontWeight: 400, color: '#888' }}>/ 4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
