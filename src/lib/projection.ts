// Simple equirectangular projection for the Western Atlas SVG.
export type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };

export const WESTERN_BOUNDS: Bounds = {
  minLon: -125.2,
  maxLon: -102.0,
  minLat: 31.0,
  maxLat: 49.2,
};

export const VIEW_W = 1000;
export const VIEW_H = 900;

const K = Math.cos((40 * Math.PI) / 180);

export function project(lon: number, lat: number, b: Bounds = WESTERN_BOUNDS) {
  const spanLon = (b.maxLon - b.minLon) * K;
  const spanLat = b.maxLat - b.minLat;
  const x = ((lon - b.minLon) * K / spanLon) * VIEW_W;
  const y = VIEW_H - ((lat - b.minLat) / spanLat) * VIEW_H;
  return { x, y };
}

export function ringToPath(ring: [number, number][], b?: Bounds) {
  if (ring.length === 0) return "";
  const p0 = project(ring[0][0], ring[0][1], b);
  let d = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`;
  for (let i = 1; i < ring.length; i++) {
    const p = project(ring[i][0], ring[i][1], b);
    d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d + " Z";
}