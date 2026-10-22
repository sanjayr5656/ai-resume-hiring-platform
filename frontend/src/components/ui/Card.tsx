import { type ReactNode, type KeyboardEvent, type CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  title?: string;
}

export const Card = ({ children, className = '', onClick, role, ariaLabel, style, title }: CardProps) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`card ${onClick ? 'card-clickable' : ''} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={role || (onClick ? 'button' : undefined)}
      aria-label={ariaLabel}
      style={style}
      title={title}
    >
      {children}
    </div>
  );
};
