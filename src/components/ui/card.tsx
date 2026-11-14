import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Resting surface ("Soft Sage Clay"): warm matte ceramic card on the alabaster
 * canvas with dual light/shadow depth and a top-edge specular rim highlight.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'clay-card rounded-[1.25rem]',
        className,
      )}
      {...props}
    />
  );
}
