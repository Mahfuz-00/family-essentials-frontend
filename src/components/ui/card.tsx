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

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-3 p-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-headline-sm text-on-surface', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 border-t border-canvas px-5 py-3', className)}
      {...props}
    />
  );
}
