import { type ReactNode, type CSSProperties } from 'react';

interface HeadingProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
  id?: string;
  style?: CSSProperties;
  title?: string;
}

export const Heading = ({ children, level = 2, className = '', id, style, title }: HeadingProps) => {
  const Tag = `h${level}` as const;
  return (
    <Tag className={className} id={id} style={style} title={title}>
      {children}
    </Tag>
  );
};
