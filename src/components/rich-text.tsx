import { Fragment, type ReactNode } from 'react';

const inlinePattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/gi;

function inlineContent(value: string): ReactNode[] {
  return value.split(inlinePattern).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/i);
    if (link)
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function plainRichText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/gi, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^\s*-\s+/gm, '• ');
}

export function RichText({ value, className = '' }: { value: string; className?: string }) {
  return (
    <div className={`rich-text-content ${className}`.trim()}>
      {value.split('\n').map((line, index) => {
        const bullet = line.match(/^\s*-\s+(.+)/);
        return (
          <div className={bullet ? 'rich-text-bullet' : undefined} key={index}>
            {inlineContent(bullet ? bullet[1] : line)}
          </div>
        );
      })}
    </div>
  );
}
