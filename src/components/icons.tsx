import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: ReactNode) {
  return function Icon({ size = 18, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </>
);

export const SparklesIcon = make(
  <path d="M12 3l1.9 5.8 5.8 1.9-5.8 1.9L12 18.4l-1.9-5.8-5.8-1.9 5.8-1.9L12 3z" />
);

export const TrendingUpIcon = make(
  <>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </>
);

export const ActivityIcon = make(<path d="M3 12h4l3 8 4-16 3 8h4" />);

export const StarIcon = make(
  <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />
);

export const ForkIcon = make(
  <>
    <circle cx="6" cy="5" r="2.4" />
    <circle cx="18" cy="5" r="2.4" />
    <circle cx="12" cy="19" r="2.4" />
    <path d="M6 7.4v2.1a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V7.4" />
    <path d="M12 13.5v3.1" />
  </>
);

export const SunIcon = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);

export const MoonIcon = make(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);

export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />);

export const ExternalLinkIcon = make(
  <>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </>
);

export const AlertCircleIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>
);

export const InboxIcon = make(
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" />
  </>
);

export const CopyIcon = make(
  <>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>
);

export const CheckIcon = make(<path d="M20 6 9 17l-5-5" />);

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="rr-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#rr-logo-grad)" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.9" />
      <circle cx="16" cy="16" r="2.2" fill="#fff" />
      <path d="M16 16 22 10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
