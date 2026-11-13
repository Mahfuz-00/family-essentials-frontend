import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-forest-soft/60', className)} />;
}

/** Generic shimmer panel: a card-shaped placeholder for chart or content blocks. */
export function SkeletonPanel({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-[1.25rem] border border-white/70 bg-surface p-5 shadow-e1 animate-pulse', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

/** Shimmer table: a header row plus placeholder rows for admin list screens. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.25rem] border border-white/70 bg-surface shadow-e1 animate-pulse',
        className,
      )}
    >
      <div className="flex items-center gap-4 border-b border-outline-variant/20 px-5 py-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-outline-variant/20 px-5 py-4 last:border-0"
        >
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton key={column} className={cn('h-3', column === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Shimmer list of stacked cards, for queues and inboxes. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-white/70 bg-surface p-4 shadow-e1">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Shimmer form: labelled fields and a submit button. */
export function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-[1.25rem] border border-white/70 bg-surface p-6 shadow-e1 animate-pulse',
        className,
      )}
    >
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[1.25rem] border border-white/70 bg-surface p-5 shadow-e1 animate-pulse',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded-md mt-1" />
      <Skeleton className="h-3 w-1/2 rounded-md" />
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 mt-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
