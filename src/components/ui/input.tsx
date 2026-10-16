import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Design: inputs sit on the warm canvas fill with an inset shadow rather than a
 * border, and gain a sage focus ring. Cards stay surface-white, so an input
 * inside a card still reads as a well against it.
 */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-xl bg-canvas px-3.5 text-[15px] text-on-surface shadow-inner',
        'outline-none transition-all placeholder:text-muted',
        'focus:ring-2 focus:ring-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/40',
        className,
      )}
      {...props}
    />
  );
}
