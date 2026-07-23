// Sun Valley Poster mark — compass rose stamped in vermilion on paper.
// Reads well at 20–48px.
export function AtlasMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Forest Atlas mark"
      className="shrink-0"
    >
      {/* Outer paper disc with vermilion double-rule */}
      <circle cx="20" cy="20" r="19" fill="var(--paper)" stroke="var(--vermilion)" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="16.4" fill="none" stroke="var(--vermilion)" strokeWidth="0.5" />
      {/* Compass points — N/S/E/W diamonds */}
      <path
        d="M 20 4 L 22.6 20 L 20 36 L 17.4 20 Z"
        fill="var(--ink)"
      />
      <path
        d="M 4 20 L 20 17.4 L 36 20 L 20 22.6 Z"
        fill="var(--ink)"
        opacity="0.55"
      />
      {/* Center vermilion pip */}
      <circle cx="20" cy="20" r="2.6" fill="var(--vermilion)" />
      {/* Cardinal N notch */}
      <line x1="20" y1="2" x2="20" y2="6" stroke="var(--vermilion)" strokeWidth="1.4" />
    </svg>
  );
}