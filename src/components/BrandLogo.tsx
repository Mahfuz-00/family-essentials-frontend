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
      {/* Stitch Official Brand Emblem */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-sm transition-transform duration-200 hover:scale-105">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="brandLogoGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#376847" />
              <stop offset="100%" stopColor="#2D553A" />
            </linearGradient>
            <linearGradient id="brandAccentGrad" x1="100" y1="50" x2="160" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E76F51" />
              <stop offset="100%" stopColor="#D95D3E" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" rx="46" fill="url(#brandLogoGrad)" />
          {/* Bag & Home Structure */}
          <path
            d="M100 38 L154 76 C158 79 160 84 158 89 L148 152 C146 160 140 166 131 166 L69 166 C60 166 54 160 52 152 L42 89 C40 84 42 79 46 76 Z"
            fill="#FFFFFF"
            fillOpacity="0.12"
          />
          {/* Handle / Roof loop */}
          <path
            d="M78 68 C78 54 88 44 100 44 C112 44 122 54 122 68"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Solid White Base */}
          <path
            d="M100 52 L150 86 C153 88 154 91 153 95 L144 146 C143 152 138 157 131 157 L69 157 C62 157 57 152 56 146 L47 95 C46 91 47 88 50 86 Z"
            fill="#FFFFFF"
          />
          {/* Green Checkmark */}
          <path
            d="M84 110 L98 124 L132 88"
            stroke="#376847"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Coral Sprout Accent */}
          <circle cx="132" cy="74" r="9" fill="url(#brandAccentGrad)" />
          <path
            d="M132 83 C138 83 144 79 144 73 C144 67 132 58 132 58 C132 58 120 67 120 73 C120 79 126 83 132 83 Z"
            fill="url(#brandAccentGrad)"
          />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="truncate text-base font-extrabold tracking-tight text-on-surface">
              Family
            </span>
            <span className="truncate text-base font-medium tracking-tight text-secondary">
              Essentials
            </span>
          </div>
          <span className="truncate text-[11px] font-medium tracking-wide text-muted mt-0.5">
            {subtitle ?? defaultSubtitle}
          </span>
        </div>
      )}
    </div>
  );
}
