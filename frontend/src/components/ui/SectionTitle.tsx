import { type ReactNode, type CSSProperties } from 'react';
import { Heading } from './Heading';

interface SectionTitleProps {
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const SectionTitle = ({ title, text, action, className, style }: SectionTitleProps) => (
  <div className={`section-title ${className || ''}`} style={style}>
    <div>
      <Heading level={2}>{title}</Heading>
      {text && <p>{text}</p>}
    </div>
    {action}
  </div>
);
