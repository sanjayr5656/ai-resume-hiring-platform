import { type CSSProperties } from 'react';

interface ScoreRingProps {
  value: number;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

export const ScoreRing = ({ value, size = 'medium', label = 'fit', className = '' }: ScoreRingProps) => {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));
  const style = { '--score': safeValue } as CSSProperties;

  return (
    <div
      className={`score score-${size} ${className}`.trim()}
      style={style}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${safeValue}%`}
    >
      <div>
        <strong>{safeValue}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};
