import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-forest-soft/70', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[rgba(43,45,66,0.05)] bg-surface p-5 shadow-e1">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
