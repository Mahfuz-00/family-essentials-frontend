import type { ReactNode } from 'react';

/**
 * Empty states teach the space: what belongs here, why it matters, what fills it.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-outline-variant/70 bg-surface/60 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <h3 className="text-headline-sm text-on-surface">{title}</h3>
      <p className="max-w-md text-body-md text-muted">{description}</p>
      {action}
    </div>
  );
}
