import { type ReactNode, type CSSProperties } from 'react';
import { Icon } from './Icon';

interface ButtonProps {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'coral' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}

export const Button = ({
  children,
  variant = 'primary',
  size,
  icon,
  disabled,
  loading,
  onClick,
  type = 'button',
  className = '',
  ariaLabel,
  style,
}: ButtonProps) => (
  <button
    className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`.trim()}
    disabled={disabled || loading}
    onClick={onClick}
    type={type}
    aria-label={ariaLabel}
    style={style}
  >
    {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
    {children}
  </button>
);
