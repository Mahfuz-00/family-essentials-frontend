import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative min-w-0 max-w-full">
      <select
        className={cn(
          'h-12 w-full min-w-0 max-w-full box-border cursor-pointer appearance-none rounded-xl bg-canvas px-3.5 pr-9 text-[15px] text-on-surface shadow-[var(--shadow-inset)] border border-transparent',
          'outline-none transition-colors',
          'focus:border-primary focus:ring-2 focus:ring-primary/40',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
