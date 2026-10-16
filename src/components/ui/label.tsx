import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Design: field labels are label-lg (14/600) in ink, not muted 12px.
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-label-lg text-on-surface', className)} {...props} />;
}
