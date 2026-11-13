import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

export type StatTone = 'forest' | 'sage' | 'coral' | 'amber' | 'blue';

const chipTones: Record<StatTone, string> = {
  forest: 'bg-forest-soft text-secondary',
  sage: 'bg-sage-soft text-primary',
  coral: 'bg-coral-soft text-error',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
};

type HighlightTone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary';

const highlightTones: Record<HighlightTone, { base: string; dot: string }> = {
  success: { base: 'bg-forest-soft text-secondary', dot: 'bg-success' },
  primary: { base: 'bg-sage-soft text-primary', dot: 'bg-primary' },
  danger: { base: 'bg-coral-soft text-error', dot: 'bg-error' },
  warning: { base: 'bg-amber-50 text-amber-700', dot: 'bg-warning' },
  neutral: { base: 'bg-surface-container-low text-on-surface-variant', dot: 'bg-outline' },
};

/** Small status pill shown on the bottom line of a StatCard. */
export function StatHighlight({
  children,
  tone = 'success',
  pulse = false,
}: {
  children: ReactNode;
  tone?: HighlightTone;
  pulse?: boolean;
}) {
  const t = highlightTones[tone];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
        t.base,
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', t.dot)} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
}

const shell =
  'group relative flex h-full w-full min-h-[136px] flex-col rounded-[1.25rem] border border-white/70 bg-surface p-5 shadow-e1 transition-all duration-300';

/**
 * Unified "pulse" metric card.
 *
 *   TITLE (full width, never cramped by the icon)
 *   VALUE ........................ [icon]
 *   highlight pill
 */
export function StatCard({
  title,
  value,
  icon,
  tone = 'forest',
  highlight,
  to,
  valueClassName,
}: {
  title: string;
  value: ReactNode;
  icon: string;
  tone?: StatTone;
  highlight?: ReactNode;
  to?: string;
  valueClassName?: string;
}) {
  const body = (
    <div className={cn(shell, to && 'hover:-translate-y-0.5 hover:shadow-e2')}>
      <span className="block w-full text-[11px] font-bold uppercase leading-snug tracking-wider text-muted">
        {title}
      </span>

      <div className="my-3 flex items-center justify-between gap-3">
        <span
          className={cn(
            'min-w-0 truncate font-extrabold leading-tight tracking-tight text-on-surface',
            'text-[clamp(1.125rem,1.6vw,1.5rem)]',
            valueClassName,
          )}
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        >
          {value}
        </span>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[var(--shadow-inset-sm)] transition-transform duration-300 group-hover:scale-105',
            chipTones[tone],
          )}
        >
          <Icon name={icon} className="text-[22px]" />
        </span>
      </div>

      <div className="mt-auto min-h-[22px]">{highlight}</div>
    </div>
  );

  if (to) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} className="block h-full w-full rounded-[1.25rem]">
        {body}
      </Link>
    );
  }

  return body;
}

/** Shimmer placeholder with exactly the StatCard anatomy. */
export function StatCardSkeleton() {
  return (
    <div className={cn(shell, 'animate-pulse')} aria-hidden="true">
      <div className="h-3 w-2/3 rounded bg-forest-soft/70" />
      <div className="my-3 flex items-center justify-between gap-3">
        <div className="h-7 w-1/2 rounded-lg bg-forest-soft/80" />
        <div className="h-11 w-11 rounded-2xl bg-forest-soft/70 shadow-[var(--shadow-inset-sm)]" />
      </div>
      <div className="mt-auto h-5 w-24 rounded-full bg-forest-soft/60" />
    </div>
  );
}

/**
 * Equal-width, equal-height row of stat cards. Columns follow the number of
 * cards (2, 3 or 4) and collapse on smaller screens.
 */
export function StatGrid({ children, count = 4, className }: { children: ReactNode; count?: 2 | 3 | 4; className?: string }) {
  const cols =
    count === 2 ? 'sm:grid-cols-2' : count === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4';
  return <div className={cn('grid auto-rows-fr grid-cols-1 gap-5', cols, className)}>{children}</div>;
}

export function StatGridSkeleton({ count = 4 }: { count?: 2 | 3 | 4 }) {
  return (
    <StatGrid count={count}>
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </StatGrid>
  );
}
