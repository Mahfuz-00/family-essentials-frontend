import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  // Deep forest teal is the single call-to-action colour.
  primary: 'bg-secondary text-on-secondary shadow-e1 hover:bg-primary active:scale-[0.97]',
  // Soft sage secondary, zero shadow.
  soft: 'bg-sage-soft text-secondary hover:bg-forest-soft active:scale-[0.97]',
  outline:
    'border border-[rgba(43,45,66,0.06)] bg-surface text-ink shadow-e1 hover:bg-sage-soft active:scale-[0.97]',
  ghost: 'text-ink hover:bg-sage-soft',
  danger: 'bg-error text-on-error hover:bg-tertiary active:scale-[0.97]',
};

// Design: default control radius is rounded-xl (12px); the auth CTA is larger type.
const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-label-md',
  md: 'h-9 gap-2 rounded-xl px-3.5 text-label-lg',
  lg: 'h-11 gap-2 rounded-xl px-4 text-label-lg',
  xl: 'h-12 gap-2 rounded-xl px-4 text-headline-sm',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  // Defaults to "button" so a Button inside a form never submits it by accident;
  // real submit buttons pass type="submit" explicitly.
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center font-semibold transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
