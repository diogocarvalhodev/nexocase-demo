'use client';

interface NexoCaseLogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon';
}

/**
 * NexoCase inline SVG logo.
 * A modern "N" monogram within a rounded container with a subtle nexus/connection motif.
 */
export default function NexoCaseLogo({ size = 40, className = '', variant = 'icon' }: NexoCaseLogoProps) {
  if (variant === 'full') {
    return (
      <svg
        width={size * 3.2}
        height={size}
        viewBox="0 0 160 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Icon */}
        <rect x="2" y="5" width="40" height="40" rx="10" fill="url(#logo-gradient-full)" />
        <path
          d="M14 32V18h2.4l8.4 10.2V18H27v14h-2.4L16.2 21.8V32H14Z"
          fill="white"
        />
        <circle cx="33" cy="13" r="3.5" fill="white" fillOpacity="0.3" />

        {/* Text */}
        <text x="50" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="700" fill="#1e293b">
          Nexo
        </text>
        <text x="93" y="23" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="700" fill="#2563eb">
          Case
        </text>
        <text x="50" y="38" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fontWeight="400" fill="#94a3b8" letterSpacing="0.5">
          Gestão de Ocorrências
        </text>

        <defs>
          <linearGradient id="logo-gradient-full" x1="2" y1="5" x2="42" y2="45" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563eb" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="url(#logo-gradient-icon)" />
      {/* Letter N */}
      <path
        d="M12 28V14h2.4l8.4 10.2V14H25v14h-2.4L14.2 17.8V28H12Z"
        fill="white"
      />
      {/* Accent dot — connection/nexus motif */}
      <circle cx="31" cy="11" r="3" fill="white" fillOpacity="0.35" />

      <defs>
        <linearGradient id="logo-gradient-icon" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
