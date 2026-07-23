// Bookmarkable, back/forward-safe URL state for /idaho.
// Keep the schema flat and string-friendly — the URL is the source of truth.
// Never encode imported GPX content or private notes.
import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";

export const IDAHO_MODES = ["sites", "inventory"] as const;
export type IdahoMode = (typeof IDAHO_MODES)[number];

export const IDAHO_BASEMAPS = ["dark", "light", "topo"] as const;
export type IdahoBasemap = (typeof IDAHO_BASEMAPS)[number];

export const idahoSearchSchema = z.object({
  mode: fallback(z.enum(IDAHO_MODES), "sites").default("sites"),
  sel: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  cats: fallback(z.string(), "").default(""),
  conf: fallback(z.string(), "").default(""),
  prec: fallback(z.string(), "").default(""),
  src: fallback(z.string(), "").default(""),
  // Hidden layer keys (CSV). Absence means "all visible".
  hide: fallback(z.string(), "").default(""),
  basemap: fallback(z.enum(IDAHO_BASEMAPS), "dark").default("dark"),
  // "lat,lon,zoom" — persisted map view. Empty means "let the map choose".
  c: fallback(z.string(), "").default(""),
  // Active saved-collection ID. Dormant param — Gate 3 will populate it.
  col: fallback(z.string(), "").default(""),
  // Inventory-only filters (dormant while snapshot is blocked upstream).
  ninec: fallback(z.string(), "").default(""),
  ftype: fallback(z.string(), "").default(""),
  div: fallback(z.string(), "").default(""),
  reg: fallback(z.string(), "").default(""),
});

export type IdahoSearch = z.infer<typeof idahoSearchSchema>;

export const IDAHO_SEARCH_DEFAULTS: IdahoSearch = {
  mode: "sites",
  sel: "",
  q: "",
  cats: "",
  conf: "",
  prec: "",
  src: "",
  hide: "",
  basemap: "dark",
  c: "",
  col: "",
  ninec: "",
  ftype: "",
  div: "",
  reg: "",
};

// ---------- CSV helpers ----------

export function parseCsv(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

// Canonicalize CSV: dedupe + sort so URL is stable across toggle order.
export function toCsv(values: readonly string[]): string {
  const dedup = Array.from(new Set(values.filter((v) => v.length > 0)));
  dedup.sort();
  return dedup.join(",");
}

// ---------- Map view (lat,lon,zoom) ----------

export type MapView = { lat: number; lon: number; zoom: number };

export function parseMapView(raw: string): MapView | null {
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length !== 3) return null;
  const [lat, lon, zoom] = parts.map((p) => Number(p));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(zoom)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;
  if (zoom < 0 || zoom > 22) return null;
  return { lat, lon, zoom };
}

export function formatMapView(v: MapView): string {
  const r4 = (n: number) => Number(n.toFixed(4)).toString();
  const r2 = (n: number) => Number(n.toFixed(2)).toString();
  return `${r4(v.lat)},${r4(v.lon)},${r2(v.zoom)}`;
}

// ---------- Filter/layer helpers ----------

export function isLayerHidden(hide: string, key: string): boolean {
  return parseCsv(hide).includes(key);
}

export function toggleInCsv(csv: string, value: string): string {
  const cur = new Set(parseCsv(csv));
  if (cur.has(value)) cur.delete(value);
  else cur.add(value);
  return toCsv(Array.from(cur));
}

// Merge a patch into an existing search object; empty strings collapse to
// defaults so the router's stripSearchParams middleware can shed them.
export function mergeSearch(
  prev: IdahoSearch,
  patch: Partial<IdahoSearch>,
): IdahoSearch {
  return { ...prev, ...patch };
}