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
  const defaultSubtitle = isPlatformAdmin ? 'Landlord Platform' : 'Shared Household OS';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Stitch Official FairShare Balanced Partners Emblem */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-sm transition-transform duration-200 hover:scale-105">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="fairShareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#376847" />
              <stop offset="100%" stopColor="#284E34" />
            </linearGradient>
            <linearGradient id="fairCoralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F28469" />
              <stop offset="100%" stopColor="#E76F51" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" rx="52" fill="url(#fairShareGrad)" />
          <rect x="2" y="2" width="196" height="196" rx="50" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="2" />

          {/* Two Partners Coming Together / Balanced Scale / Shared Responsibility */}
          <g transform="translate(100, 100) scale(1.4)">
            <circle cx="-21" cy="-25" r="8.5" fill="#FFFFFF" />
            <circle cx="21" cy="-25" r="8.5" fill="#FFFFFF" />

            {/* Subtle Aura Base */}
            <path
              d="M -31 18 C -33 -3, -28 -17, -19 -19 C -12 -21, -6 -13, 0 -6 C 6 -13, 12 -21, 19 -19 C 28 -17, 33 -3, 31 18 C 29 31, 18 36, 0 36 C -18 36, -29 31, -31 18 Z"
              fill="#FFFFFF"
              fillOpacity="0.22"
            />

            {/* Converging Silhouettes & Balanced Arch */}
            <path
              d="M -25 15 C -27 1, -23 -11, -15 -14 C -9 -16, -4 -9, 0 -3 C 4 -9, 9 -16, 15 -14 C 23 -11, 27 1, 25 15 C 23 27, 13 32, 0 32 C -13 32, -23 27, -25 15 Z"
              fill="#FFFFFF"
            />

            {/* Inner Negative Space forming Heart & Leaf Sprout Cutout */}
            <path
              d="M 0 5 C -6 -3, -14 -3, -14 6 C -14 14, 0 23, 0 23 C 0 23, 14 14, 14 6 C 14 -3, 6 -3, 0 5 Z"
              fill="url(#fairShareGrad)"
            />

            {/* Radiant Coral Accent Center */}
            <circle cx="0" cy="10" r="5" fill="url(#fairCoralGrad)" />
            <path
              d="M 0 4 C 2.2 2.3, 5 2.8, 5 5.8 C 5 8.2, 0 11.5, 0 11.5 C 0 11.5, -5 8.2, -5 5.8 C -5 2.8, -2.2 2.3, 0 4 Z"
              fill="url(#fairCoralGrad)"
            />
          </g>
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="truncate text-base font-extrabold tracking-tight text-on-surface">
              Fair
            </span>
            <span className="truncate text-base font-semibold tracking-tight text-secondary">
              Share
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
