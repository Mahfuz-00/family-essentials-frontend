import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Resting surface ("Soft Sage Clay"): white clay on the warm canvas with a
 * dual light/shadow depth and a near-invisible hairline so edges stay crisp
 * on low-contrast displays.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[1.25rem] border border-white/70 bg-surface shadow-e1 transition-shadow duration-300',
        className,
      )}
      {...props}
    />
  );
}
