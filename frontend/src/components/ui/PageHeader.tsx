import { type ReactNode } from 'react';
import { Heading } from './Heading';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  text?: string;
  action?: ReactNode;
}

export const PageHeader = ({ eyebrow, title, text, action }: PageHeaderProps) => (
  <div className="page-header">
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Heading level={1}>{title}</Heading>
      {text && <p>{text}</p>}
    </div>
    {action}
  </div>
);
