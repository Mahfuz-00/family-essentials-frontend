import { Children, type CSSProperties, type ReactNode } from 'react';
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

const ambientGlows: Record<StatTone, string> = {
  forest: 'from-secondary/10 via-secondary/3 to-transparent',
  sage: 'from-primary/10 via-primary/3 to-transparent',
  coral: 'from-error/12 via-error/3 to-transparent',
  amber: 'from-amber-500/12 via-amber-500/3 to-transparent',
  blue: 'from-blue-500/10 via-blue-500/3 to-transparent',
};

type HighlightTone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary' | StatTone;

const highlightTones: Record<HighlightTone, { base: string; dot: string }> = {
  success: { base: 'bg-forest-soft text-secondary', dot: 'bg-secondary' },
  forest: { base: 'bg-forest-soft text-secondary', dot: 'bg-secondary' },
  primary: { base: 'bg-sage-soft text-primary', dot: 'bg-primary' },
  sage: { base: 'bg-sage-soft text-primary', dot: 'bg-primary' },
  danger: { base: 'bg-coral-soft text-error', dot: 'bg-error' },
  coral: { base: 'bg-coral-soft text-error', dot: 'bg-error' },
  warning: { base: 'bg-amber-50 text-amber-700', dot: 'bg-warning' },
  amber: { base: 'bg-amber-50 text-amber-700', dot: 'bg-warning' },
  neutral: { base: 'bg-surface-container-low text-on-surface-variant', dot: 'bg-outline' },
  blue: { base: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};

/** Small status pill shown on the bottom line of a StatCard. */
export function StatHighlight({
  children,
  label,
  tone = 'success',
  pulse = false,
}: {
  children?: ReactNode;
  label?: ReactNode;
  icon?: string;
  tone?: HighlightTone;
  pulse?: boolean;
}) {
  const t = highlightTones[tone];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
        t.base,
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', t.dot)} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
      </span>
      <span className="truncate">{children ?? label}</span>
    </span>
  );
}

const shell =
  'clay-card stagger-item group relative flex h-full w-full min-h-[140px] flex-col overflow-hidden rounded-[1.25rem] p-5';

/**
 * Unified "pulse" metric card with tactile spring lift and ambient corner glow.
 *
 *   TITLE (full width, never cramped by the icon)
 *   VALUE ........................ [icon]
 *   highlight pill ............... [arrow cue on hover]
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
  subtitle?: ReactNode;
  icon: string;
  tone?: StatTone;
  highlight?: ReactNode;
  to?: string;
  valueClassName?: string;
}) {
  const body = (
    <div className={cn(shell, to && 'clay-card-interactive')}>
      {/* Soft radial ambient accent in top-right corner */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-radial opacity-70 transition-transform duration-500 group-hover:scale-125',
          ambientGlows[tone],
        )}
      />

      <span className="relative z-10 block w-full text-[11px] font-bold uppercase leading-snug tracking-[0.06em] text-muted">
        {title}
      </span>

      <div className="relative z-10 my-3 flex items-center justify-between gap-3">
        <span
          className={cn(
            'min-w-0 truncate font-extrabold leading-tight tracking-tight text-on-surface tabular-nums',
            'text-[clamp(1.25rem,1.7vw,1.625rem)]',
            valueClassName,
          )}
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        >
          {value}
        </span>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[var(--shadow-inset-sm)] transition-transform duration-500 ease-[var(--spring-easing)] group-hover:scale-110 group-hover:-rotate-3',
            chipTones[tone],
          )}
        >
          <Icon name={icon} className="text-[22px]" />
        </span>
      </div>

      <div className="relative z-10 mt-auto flex min-h-[24px] items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{highlight}</div>
        {to && (
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-muted opacity-0 shadow-[var(--shadow-inset-sm)] transition-all duration-300 ease-[var(--spring-easing)] group-hover:translate-x-0.5 group-hover:text-secondary group-hover:opacity-100"
          >
            <Icon name="arrow_forward" className="text-[13px]" />
          </span>
        )}
      </div>
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
 * cards (2, 3 or 4) and collapse on smaller screens. Sets `--sibling-index`
 * on each child for choreographed staggered entry.
 */
export function StatGrid({ children, count = 4, className }: { children: ReactNode; count?: 2 | 3 | 4; className?: string }) {
  const cols =
    count === 2 ? 'sm:grid-cols-2' : count === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4';
  const items = Children.toArray(children);
  return (
    <div className={cn('grid auto-rows-fr grid-cols-1 gap-5', cols, className)}>
      {items.map((child, index) => (
        <div
          key={index}
          className="h-full"
          style={{ '--sibling-index': index } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
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
