import { cn } from '@/lib/utils';

/**
 * Material Symbols glyph, as used throughout the Stitch mockups.
 * Always aria-hidden: the icon decorates a label that is already in the DOM.
 */
export function Icon({
  name,
  className,
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('material-symbols-outlined shrink-0 select-none text-[20px]', className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
