import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger' | 'surface';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  // Deep forest teal is the single call-to-action colour, rendered as a clay pill.
  primary:
    'bg-secondary text-on-secondary shadow-[0_6px_14px_-4px_rgba(55,104,71,0.45)] hover:brightness-110 active:translate-y-px active:shadow-[var(--shadow-inset-sm)]',
  // Soft sage secondary: raised clay chip.
  soft: 'bg-sage-soft text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft active:shadow-[var(--shadow-inset-sm)]',
  outline:
    'border border-white/70 bg-surface text-ink shadow-[var(--shadow-clay-sm)] hover:bg-sage-soft active:shadow-[var(--shadow-inset-sm)]',
  ghost: 'text-ink hover:bg-sage-soft active:shadow-[var(--shadow-inset-sm)]',
  danger:
    'bg-error text-on-error shadow-[0_6px_14px_-4px_rgba(231,111,81,0.45)] hover:bg-tertiary active:translate-y-px active:shadow-[var(--shadow-inset-sm)]',
  // High-contrast warm white CTA pill for dark/green (`bg-secondary`) sections.
  surface:
    'bg-surface text-secondary shadow-e2 hover:bg-canvas active:translate-y-px active:shadow-[var(--shadow-inset-sm)]',
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
  // Only apply the dark green gradient image when primary isn't overridden with a custom `bg-*` utility.
  const hasCustomBg = Boolean(
    className && /\bbg-(?!opacity|clip|origin|repeat|position|size|none)/.test(className),
  );

  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center font-semibold transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        variant === 'primary' && !hasCustomBg && 'clay-btn-primary',
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
