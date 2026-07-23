import type { CSSProperties } from "react";

/**
 * Extremely subtle paper-fibre grain overlay for the poster surface.
 * Static SVG turbulence, one texture, ~1kb inlined. No animation, no motion.
 * Sits above the base body background-image so the composition doesn't
 * flatten into a solid cream fill.
 */
export function PaperBackdrop({
  opacity = 0.35,
  className = "",
  style,
}: {
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity, mixBlendMode: "multiply", ...style }}
    >
      <defs>
        <filter id="paperFibre">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            values="0 0 0 0 0.30
                    0 0 0 0 0.22
                    0 0 0 0 0.14
                    0 0 0 0.09 0"
          />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#paperFibre)" />
    </svg>
  );
}