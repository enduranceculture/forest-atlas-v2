/**
 * Reusable SVG <defs> block: hand-cut mountain hachures, cobalt water,
 * and forest hatch density stamps. Declared once per SVG and referenced
 * by id (fill="url(#hachureMountain)" / fill="url(#hachureForest)" /
 * fill="url(#waterHatch)").
 */
export function AtlasSvgPatterns() {
  return (
    <defs>
      {/* Mountain hachure — short diagonal strokes, weathered gray */}
      <pattern
        id="hachureMountain"
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(38)"
      >
        <line x1="0" y1="0" x2="0" y2="4.5" stroke="var(--hachure)" strokeWidth="0.7" />
      </pattern>
      {/* Denser hachure — used for high country / range spines */}
      <pattern
        id="hachureMountainDense"
        width="4.5"
        height="4.5"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(38)"
      >
        <line x1="0" y1="0" x2="0" y2="3" stroke="var(--ink)" strokeWidth="0.55" opacity="0.55" />
      </pattern>
      {/* Forest cluster hatch — small pine wedges laid on cream */}
      <pattern id="hachureForest" width="10" height="10" patternUnits="userSpaceOnUse">
        <path
          d="M 3 8 L 5 3 L 7 8 M 5 3 L 5 8"
          fill="none"
          stroke="var(--pine)"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
      </pattern>
      {/* Sage overlay hatch */}
      <pattern id="hachureSage" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="0.6" fill="var(--sage)" opacity="0.55" />
      </pattern>
      {/* Cobalt water — parallel wave lines */}
      <pattern id="waterHatch" width="10" height="6" patternUnits="userSpaceOnUse">
        <path
          d="M 0 3 Q 2.5 1.5 5 3 T 10 3"
          fill="none"
          stroke="var(--cobalt)"
          strokeWidth="0.55"
          opacity="0.85"
        />
      </pattern>
      {/* Vermilion outer double-rule for the SVG poster frame */}
      <pattern id="paperGrain" width="80" height="80" patternUnits="userSpaceOnUse">
        <rect width="80" height="80" fill="var(--paper)" />
      </pattern>
    </defs>
  );
}