import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  iconOnly?: boolean;
  subtitle?: string;
  isPlatformAdmin?: boolean;
}

export function BrandLogo({
  className,
  iconOnly = false,
  subtitle,
  isPlatformAdmin = false,
}: BrandLogoProps) {
  const defaultSubtitle = isPlatformAdmin ? 'Landlord Platform' : 'Household Logistics';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-sm transition-transform duration-200 hover:scale-105">
        {/* Soft background glow */}
        <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-60" />
        {/* SVG emblem: Stylized cottage with a flourishing leaf accent */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative h-5 w-5 text-secondary"
        >
          {isPlatformAdmin ? (
            <>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </>
          ) : (
            <>
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
              <path d="M12 2a4 4 0 0 0-4 4c0 2 4 4 4 4s4-2 4-4a4 4 0 0 0-4-4z" className="fill-secondary/20 stroke-secondary" />
            </>
          )}
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-headline-sm font-bold tracking-tight text-on-surface">
            Family Essentials
          </span>
          <span className="truncate text-label-sm font-medium tracking-wide text-muted">
            {subtitle ?? defaultSubtitle}
          </span>
        </div>
      )}
    </div>
  );
}
