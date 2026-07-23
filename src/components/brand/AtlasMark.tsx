export function AtlasMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Forest Atlas mark" className="shrink-0">
      <circle cx="20" cy="20" r="19" fill="var(--spruce)" stroke="var(--lichen)" strokeOpacity="0.55" />
      <circle cx="20" cy="20" r="14" fill="none" stroke="var(--lichen)" strokeOpacity="0.35" />
      <circle cx="20" cy="20" r="9" fill="none" stroke="var(--lichen)" strokeOpacity="0.55" />
      <circle cx="20" cy="20" r="4" fill="var(--ember)" />
      <line x1="20" y1="3" x2="20" y2="8" stroke="var(--bone)" strokeWidth="1.2" />
    </svg>
  );
}