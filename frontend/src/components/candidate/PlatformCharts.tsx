import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from 'recharts';
import type { ActivityPoint, RatingPoint } from '../../types';

interface DifficultyData {
  easy?: number | null;
  medium?: number | null;
  hard?: number | null;
}

const COLORS = {
  easy: '#2d9e6b',   // Sage green
  medium: '#d97706', // Amber
  hard: '#c0392b',   // Coral/Red
};

export const DifficultyBreakdownChart = ({ easy = 0, medium = 0, hard = 0 }: DifficultyData) => {
  const eVal = Math.max(0, Number(easy) || 0);
  const mVal = Math.max(0, Number(medium) || 0);
  const hVal = Math.max(0, Number(hard) || 0);
  const total = eVal + mVal + hVal;

  if (total === 0) {
    return (
      <div className="empty-chart-note" style={{ padding: '12px 0', fontSize: '13px', color: '#888' }}>
        No solved difficulty breakdown available
      </div>
    );
  }

  const data = [
    { name: 'Easy', value: eVal, color: COLORS.easy },
    { name: 'Medium', value: mVal, color: COLORS.medium },
    { name: 'Hard', value: hVal, color: COLORS.hard },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: 100, height: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={28}
              outerRadius={45}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${value} solved`, '']}
              contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e8e4dc' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.easy }} />
          <span style={{ color: '#555' }}>Easy:</span>
          <strong>{eVal}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.medium }} />
          <span style={{ color: '#555' }}>Med:</span>
          <strong>{mVal}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.hard }} />
          <span style={{ color: '#555' }}>Hard:</span>
          <strong>{hVal}</strong>
        </div>
      </div>
    </div>
  );
};

export const ActivitySparkline = ({ activity = [] }: { activity?: ActivityPoint[] }) => {
  if (!activity || activity.length === 0) return null;

  const data = activity.slice(-14).map(a => ({
    date: a.date.slice(5), // MM-DD
    solved: a.solved,
  }));

  return (
    <div style={{ width: '100%', height: 60, marginTop: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="solved" fill="#1a6b5e" radius={[2, 2, 0, 0]} />
          <Tooltip
            formatter={(value: any) => [`${value} solved`, 'Activity']}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e8e4dc' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RatingTrendChart = ({ history = [] }: { history?: RatingPoint[] }) => {
  if (!history || history.length < 2) return null;

  const data = history.slice(-12).map(h => ({
    date: h.date.slice(5),
    rating: h.rating,
  }));

  return (
    <div style={{ width: '100%', height: 70, marginTop: '8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#e05c3a"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
          <Tooltip
            formatter={(val: any) => [`${val}`, 'Rating']}
            contentStyle={{ fontSize: '11px', borderRadius: '4px', border: '1px solid #e8e4dc' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
