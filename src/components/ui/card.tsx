import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Resting surface: white on the warm cream canvas, slate-tinted ambient shadow
 * and a hairline border for crispness on varied displays (DESIGN.md, Level 1).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[rgba(43,45,66,0.05)] bg-surface shadow-e1',
        className,
      )}
      {...props}
    />
  );
}
