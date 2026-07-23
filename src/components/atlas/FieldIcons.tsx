// Minimal inline SVG field illustrations — pine, tent, lookout, elk, bear,
// hiker, compass. Single stroke weight, currentColor, sparingly used on
// the poster map. Not "cute" — reads as printed cartography ephemera.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 14, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    focusable: false as const,
    ...rest,
  };
}

export function IconPine(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 L7 10 H10 L6 15 H10 L4 21 H20 L14 15 H18 L14 10 H17 Z" />
      <path d="M12 21 V22.5" />
    </svg>
  );
}

export function IconTent(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 20 L12 5 L21 20 Z" />
      <path d="M12 5 L12 20" />
      <path d="M10 20 L12 16 L14 20" />
    </svg>
  );
}

export function IconLookout(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 21 L12 4 L18 21" />
      <rect x="8.5" y="8" width="7" height="5" />
      <path d="M8.5 13 L15.5 13" />
    </svg>
  );
}

export function IconElk(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 20 L5 12 L8 10 L14 10 L17 12 L17 20" />
      <path d="M17 12 L20 10" />
      <path d="M8 10 L7 5 L5 6 M8 10 L9 5 L11 6" />
      <circle cx="19.5" cy="9.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function IconBear(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="13" r="6" />
      <circle cx="8" cy="6.5" r="1.6" />
      <circle cx="16" cy="6.5" r="1.6" />
      <circle cx="10" cy="12" r="0.6" fill="currentColor" />
      <circle cx="14" cy="12" r="0.6" fill="currentColor" />
      <path d="M11 15 Q12 16 13 15" />
    </svg>
  );
}

export function IconHiker(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M12 7 L10 13 L7 21 M12 7 L14 13 L15 21" />
      <path d="M10 13 L15 13" />
      <path d="M17 8 L17 21" />
    </svg>
  );
}

export function IconCompass(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 4 L14 12 L12 20 L10 12 Z" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}