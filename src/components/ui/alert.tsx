import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Alert({
  children,
  tone = 'error',
  className,
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info';
  className?: string;
}) {
  const tones = {
    error: 'bg-coral-soft text-tertiary',
    success: 'bg-forest-soft text-secondary',
    info: 'bg-sage-soft text-primary',
  } as const;

  return (
    <div className={cn('rounded-xl px-3.5 py-2.5 text-sm font-medium', tones[tone], className)}>
      {children}
    </div>
  );
}
