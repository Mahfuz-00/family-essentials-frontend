import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-container-low text-on-surface-variant',
  primary: 'bg-forest-soft text-secondary',
  success: 'bg-forest-soft text-secondary',
  warning: 'bg-sage-soft text-primary',
  danger: 'bg-coral-soft text-tertiary',
  info: 'bg-surface-container text-primary',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
