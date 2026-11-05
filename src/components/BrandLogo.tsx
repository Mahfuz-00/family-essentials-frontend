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
      {/* Stitch Official KinSync Two-People Converging Emblem */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-sm transition-transform duration-200 hover:scale-105">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="kinSyncGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#376847" />
              <stop offset="100%" stopColor="#284E34" />
            </linearGradient>
            <linearGradient id="kinCoralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F28469" />
              <stop offset="100%" stopColor="#E76F51" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" rx="52" fill="url(#kinSyncGrad)" />
          <rect x="2" y="2" width="196" height="196" rx="50" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="2" />

          {/* Two Partners Converging Silhouettes / Roof Arch / Heart-Leaf */}
          <g transform="translate(100, 100) scale(1.4)">
            {/* Partner 1 (Left Head) */}
            <circle cx="-19" cy="-26" r="8.5" fill="#FFFFFF" />
            
            {/* Partner 2 (Right Head) */}
            <circle cx="19" cy="-26" r="8.5" fill="#FFFFFF" />

            {/* Subtle Aura Base */}
            <path
              d="M -30 20 C -32 -2, -26 -16, -18 -18 C -12 -19, -6 -12, 0 -4 C 6 -12, 12 -19, 18 -18 C 26 -16, 32 -2, 30 20 C 28 32, 16 38, 0 38 C -16 38, -28 32, -30 20 Z"
              fill="#FFFFFF"
              fillOpacity="0.2"
            />

            {/* Converging Bodies & Mutual Embrace Arch */}
            <path
              d="M -24 16 C -26 2, -22 -10, -14 -14 C -8 -16, -3 -10, 0 -2 C 3 -10, 8 -16, 14 -14 C 22 -10, 26 2, 24 16 C 22 28, 12 34, 0 34 C -12 34, -22 28, -24 16 Z"
              fill="#FFFFFF"
            />

            {/* Inner Negative Space forming Heart & Leaf Sprout */}
            <path
              d="M 0 6 C -6 -2, -14 -2, -14 7 C -14 15, 0 24, 0 24 C 0 24, 14 15, 14 7 C 14 -2, 6 -2, 0 6 Z"
              fill="url(#kinSyncGrad)"
            />

            {/* Radiant Coral Accent Center: Synchronized Heart Core */}
            <circle cx="0" cy="11" r="5" fill="url(#kinCoralGrad)" />
            <path
              d="M 0 5 C 2.2 2.5, 5 3, 5 6 C 5 8.5, 0 12, 0 12 C 0 12, -5 8.5, -5 6 C -5 3, -2.2 2.5, 0 5 Z"
              fill="url(#kinCoralGrad)"
            />
          </g>
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="truncate text-base font-extrabold tracking-tight text-on-surface">
              Kin
            </span>
            <span className="truncate text-base font-semibold tracking-tight text-secondary">
              Sync
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#E76F51]" />
          </div>
          <span className="truncate text-[11px] font-medium tracking-wide text-muted mt-0.5">
            {subtitle ?? defaultSubtitle}
          </span>
        </div>
      )}
    </div>
  );
}
