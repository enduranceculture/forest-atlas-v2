// Repurposed for the Sun Valley Poster direction: paper fibre grain +
// faint hachure contour lines in warm charcoal. Sits behind the poster
// composition to give the paper its "worked" feel without being loud.
export function TopoBackdrop({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id="atlasContour" width="140" height="140" patternUnits="userSpaceOnUse">
          <path
            d="M -10 40 Q 30 10 60 40 T 130 40 M -10 80 Q 30 55 60 82 T 130 80 M -10 20 Q 30 -5 60 20 T 130 20 M -10 100 Q 30 78 60 102 T 130 100"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#atlasContour)" />
    </svg>
  );
}