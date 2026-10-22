import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge = ({ children, tone = 'neutral', className = '', style }: BadgeProps) => (
  <span className={`badge badge-${tone} ${className}`.trim()} style={style}>{children}</span>
);
