import { type ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  tone?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Chip = ({ children, tone = 'neutral', active, onClick, className = '' }: ChipProps) => (
  <button
    type="button"
    className={`chip chip-${tone} ${active ? 'active' : ''} ${className}`.trim()}
    onClick={onClick}
  >
    {children}
  </button>
);
