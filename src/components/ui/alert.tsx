import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Alert({
  children,
  tone = 'error',
  className,
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info' | 'warning';
  className?: string;
}) {
  const tones = {
    error: 'bg-coral-soft text-tertiary',
    success: 'bg-forest-soft text-secondary',
    info: 'bg-sage-soft text-primary',
    warning: 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  } as const;

  return (
    <div className={cn('rounded-xl px-3.5 py-2.5 text-sm font-medium', tones[tone], className)}>
      {children}
    </div>
  );
}
