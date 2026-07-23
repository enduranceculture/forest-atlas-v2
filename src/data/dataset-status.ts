// Typed dataset status model. Derived from data + provenance, not hard-coded
// UI copy. Every /idaho dataset resolves to exactly one of these variants.
import { fireshedInventory } from "./idaho/fireshed";
import { IDAHO_WAYPOINTS } from "./idaho/waypoints";
import { validateWaypoints } from "./validate";

export type DatasetKind = "inventory" | "sites";

export type DatasetStatus =
  | { kind: "ready"; count: number; retrievedAt: string; sourceLabel: string }
  | { kind: "syncing"; sourceLabel: string }
  | {
      kind: "blocked-upstream";
      sourceLabel: string;
      reason: string;
      lastAttemptAt: string | null;
    }
  | { kind: "invalid"; sourceLabel: string; error: string }
  | { kind: "fixture"; count: number; sourceLabel: string; note: string }
  | { kind: "unavailable"; sourceLabel: string; reason: string };

export const INVENTORY_SOURCE_LABEL =
  "USDA Forest Service — Fireshed Mature & Old-Growth (MapServer / Layer 29)";
export const SITES_SOURCE_LABEL =
  "Bundled fixture — hand-authored Idaho waypoints";

export function resolveInventoryStatus(): DatasetStatus {
  const load = fireshedInventory;
  if (load.ok) {
    return {
      kind: "ready",
      count: load.collection.features.length,
      retrievedAt: load.provenance.retrievedAt,
      sourceLabel: INVENTORY_SOURCE_LABEL,
    };
  }
  if (load.blockedUpstream) {
    return {
      kind: "blocked-upstream",
      sourceLabel: INVENTORY_SOURCE_LABEL,
      reason: load.blockedUpstream.reason,
      lastAttemptAt: load.blockedUpstream.lastAttemptAt,
    };
  }
  return {
    kind: "invalid",
    sourceLabel: INVENTORY_SOURCE_LABEL,
    error: load.error,
  };
}

export function resolveFieldSitesStatus(): DatasetStatus {
  const result = validateWaypoints(IDAHO_WAYPOINTS);
  if (!result.ok) {
    return {
      kind: "invalid",
      sourceLabel: SITES_SOURCE_LABEL,
      error: result.error,
    };
  }
  return {
    kind: "fixture",
    count: result.data.length,
    sourceLabel: SITES_SOURCE_LABEL,
    note:
      "Every seeded waypoint is a hand-authored placeholder. Coordinates are not surveyed. Any accuracy value is a fixture uncertainty estimate.",
  };
}

export function statusHeadline(s: DatasetStatus): string {
  switch (s.kind) {
    case "ready":
      return `Ready · ${s.count.toLocaleString()} features`;
    case "syncing":
      return "Syncing from upstream…";
    case "blocked-upstream":
      return "Upstream unavailable";
    case "invalid":
      return "Snapshot failed validation";
    case "fixture":
      return `Fixture · ${s.count.toLocaleString()} placeholder waypoints`;
    case "unavailable":
      return "Unavailable";
  }
}