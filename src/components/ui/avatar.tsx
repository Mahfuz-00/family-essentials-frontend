import { useState } from 'react';
import { cn } from '@/lib/utils';

const tones = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-warning text-inverse-surface',
  'bg-tertiary text-on-tertiary',
  'bg-primary-container text-on-primary-container',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-[11px]',
    lg: 'h-14 w-14 text-body-lg',
  } as const;

  const tone = tones[(name.charCodeAt(0) + name.length) % tones.length];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        onError={() => setImgError(true)}
        className={cn(
          'inline-flex shrink-0 rounded-full object-cover shadow-xs',
          sizes[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        sizes[size],
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
