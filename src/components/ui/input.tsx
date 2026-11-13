import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Design: inputs sit on the warm canvas fill with an inset shadow and border,
 * and gain a sage focus ring. Cards stay surface-white, so an input
 * inside a card still reads as a well against it.
 *
 * Includes min-w-0, max-w-full, and box-border to prevent inputs from expanding
 * horizontally and overflowing flex/grid parent containers when typing.
 */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full min-w-0 max-w-full box-border rounded-xl bg-canvas px-3.5 text-[15px] text-on-surface shadow-[var(--shadow-inset)] border border-transparent',
        'outline-none transition-colors placeholder:text-muted',
        'focus:border-primary focus:ring-2 focus:ring-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-error aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/40',
        className,
      )}
      {...props}
    />
  );
}
