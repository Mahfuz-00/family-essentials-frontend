import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tones for a read-only status pill. There is no `Chip` button here any more:
 * the filter pills a page builds are local to that page and carry their own
 * pressed state, and nothing imported the interactive variant.
 */
type ChipTone = 'low' | 'normal' | 'high' | 'urgent' | 'neutral' | 'success' | 'info';

const tones: Record<ChipTone, { base: string; dot: string }> = {
  low: { base: 'bg-surface-container-low text-muted', dot: 'bg-outline' },
  normal: { base: 'bg-sage-soft text-secondary', dot: 'bg-secondary' },
  high: { base: 'bg-coral-soft text-error', dot: 'bg-error' },
  urgent: { base: 'bg-coral-soft text-tertiary', dot: 'bg-tertiary' },
  neutral: { base: 'bg-surface-container-low text-on-surface-variant', dot: 'bg-outline' },
  success: { base: 'bg-forest-soft text-secondary', dot: 'bg-success' },
  info: { base: 'bg-surface-container text-primary', dot: 'bg-primary' },
};

export function StaticChip({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
}) {
  const t = tones[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-md',
        t.base,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}
