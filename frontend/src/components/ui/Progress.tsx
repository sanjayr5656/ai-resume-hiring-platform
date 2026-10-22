interface ProgressProps {
  value: number;
  tone?: string;
  className?: string;
}

export const Progress = ({ value, tone = 'teal', className = '' }: ProgressProps) => {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div
      className={`progress progress-${tone} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
};
