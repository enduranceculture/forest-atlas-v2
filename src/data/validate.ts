import { RegionCollectionSchema, WaypointSchema, type RegionCollection, type Waypoint } from "./schema";

export type Validated<T> = { ok: true; data: T } | { ok: false; error: string };

export function validateRegions(raw: unknown): Validated<RegionCollection> {
  const parsed = RegionCollectionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  if (parsed.data.features.length === 0) return { ok: false, error: "No forest regions available." };
  return { ok: true, data: parsed.data };
}

export function validateWaypoints(raw: unknown): Validated<Waypoint[]> {
  const parsed = WaypointSchema.array().safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  if (parsed.data.length === 0) return { ok: false, error: "No waypoints available." };
  return { ok: true, data: parsed.data };
}