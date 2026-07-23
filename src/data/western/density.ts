export type DensityStop = { class: number; token: string; label: string };

export const DENSITY_SCALE: DensityStop[] = [
  { class: 1, token: "var(--density-1)", label: "Sparse mature canopy" },
  { class: 2, token: "var(--density-2)", label: "Recovering stands" },
  { class: 3, token: "var(--density-3)", label: "Mid mature" },
  { class: 4, token: "var(--density-4)", label: "Established mature" },
  { class: 5, token: "var(--density-5)", label: "Mature mixed conifer" },
  { class: 6, token: "var(--density-6)", label: "Late-successional" },
  { class: 7, token: "var(--density-7)", label: "Old-growth mosaic" },
  { class: 8, token: "var(--density-8)", label: "Dense old-growth" },
  { class: 9, token: "var(--density-9)", label: "Primary old-growth" },
];

export const densityColor = (c: number) =>
  DENSITY_SCALE[Math.max(0, Math.min(8, c - 1))].token;

export const densityLabel = (c: number) =>
  DENSITY_SCALE[Math.max(0, Math.min(8, c - 1))].label;