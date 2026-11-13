import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-forest-soft/70', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(43,45,66,0.08)] bg-surface p-5 shadow-e1">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-5 w-48 rounded-lg mt-1" />
      <div className="flex items-center gap-2 mt-2">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
    </div>
  );
}
