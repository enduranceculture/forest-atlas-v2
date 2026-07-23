// Deterministic combined GPX export for a Field Kit collection.
// Only navigable data ships: Field Sites and imported GPX waypoints/routes/tracks.
// Inventory research references are NEVER exported. Private notes are omitted
// unless the caller explicitly opts in.
import type { Waypoint } from "@/data/schema";
import type { FieldKitCollection, FieldKitStop } from "./field-kit-types";
import { sortStops } from "./field-kit-types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type CombinedGpxOptions = {
  includePrivateNotes: boolean;
};

type NavStop =
  | { kind: "site"; stop: FieldKitStop; site: Waypoint }
  | {
      kind: "wpt";
      stop: FieldKitStop;
      lat: number;
      lon: number;
      name: string;
      elevation?: number | null;
      time?: string | null;
      description?: string | null;
    }
  | {
      kind: "line";
      stop: FieldKitStop;
      name: string;
      lineKind: "route" | "track";
      coordinates: Array<[number, number]>;
    };

function resolveStops(
  collection: FieldKitCollection,
  sitesById: Map<string, Waypoint>,
): NavStop[] {
  const resolved: NavStop[] = [];
  for (const stop of sortStops(collection.stops)) {
    if (stop.kind === "site" && stop.publicId) {
      const site = sitesById.get(stop.publicId);
      if (site) resolved.push({ kind: "site", stop, site });
      // stale publicId → silently skipped; validator reports elsewhere
    } else if (stop.kind === "imported-wpt" && stop.imported?.kind === "wpt") {
      const w = stop.imported;
      resolved.push({
        kind: "wpt",
        stop,
        lat: w.latitude,
        lon: w.longitude,
        name: stop.userName || w.name,
        elevation: w.elevation,
        time: w.time,
        description: w.description,
      });
    } else if (stop.kind === "imported-line" && stop.imported?.kind === "line") {
      const l = stop.imported;
      resolved.push({
        kind: "line",
        stop,
        name: stop.userName || l.name,
        lineKind: l.lineKind,
        coordinates: l.coordinates,
      });
    }
  }
  return resolved;
}

function wptFromSite(
  site: Waypoint,
  stop: FieldKitStop,
  opts: CombinedGpxOptions,
): string {
  const displayName = stop.userName || site.name;
  const precisionTag = `[${site.precision.toUpperCase()}]`;
  const isFixture = site.sourceType === "fixture";
  const accuracyLine = site.accuracyMeters
    ? isFixture
      ? `Estimated uncertainty: ~${site.accuracyMeters} m (fixture estimate — not measured accuracy).`
      : `Reported accuracy: ~${site.accuracyMeters} m.`
    : null;
  const noteLine =
    opts.includePrivateNotes && stop.userNotes ? `Private note: ${stop.userNotes}` : null;
  const descParts = [
    `${precisionTag} ${site.significance}`,
    `Category: ${site.category}. Confidence: ${site.confidence}. Precision: ${site.precision}.`,
    accuracyLine,
    `Source: ${site.sourceName}${site.sourceUrl ? ` — ${site.sourceUrl}` : ""}`,
    site.notes ? `Notes: ${site.notes}` : null,
    noteLine,
  ]
    .filter(Boolean)
    .join(" \n");
  return `  <wpt lat="${site.latitude}" lon="${site.longitude}">
    <name>${esc(displayName)} ${esc(precisionTag)}</name>
    <cmt>${esc(site.sourceName)}</cmt>
    <desc>${esc(descParts)}</desc>
    <src>${esc(site.sourceName)}</src>
    <type>${esc(site.category)}</type>
  </wpt>`;
}

function wptFromImported(n: Extract<NavStop, { kind: "wpt" }>, opts: CombinedGpxOptions): string {
  const parts = [n.description ?? null];
  if (opts.includePrivateNotes && n.stop.userNotes) parts.push(`Private note: ${n.stop.userNotes}`);
  const desc = parts.filter(Boolean).join(" \n");
  const ele = n.elevation != null && Number.isFinite(n.elevation) ? `\n    <ele>${n.elevation}</ele>` : "";
  const time = n.time ? `\n    <time>${esc(n.time)}</time>` : "";
  const descEl = desc ? `\n    <desc>${esc(desc)}</desc>` : "";
  return `  <wpt lat="${n.lat}" lon="${n.lon}">
    <name>${esc(n.name)} [IMPORTED]</name>${ele}${time}${descEl}
  </wpt>`;
}

function lineNode(n: Extract<NavStop, { kind: "line" }>): string {
  const inner = n.coordinates
    .map(([lat, lon]) => `      <${n.lineKind === "route" ? "rtept" : "trkpt"} lat="${lat}" lon="${lon}" />`)
    .join("\n");
  if (n.lineKind === "route") {
    return `  <rte>
    <name>${esc(n.name)} [IMPORTED]</name>
${inner}
  </rte>`;
  }
  return `  <trk>
    <name>${esc(n.name)} [IMPORTED]</name>
    <trkseg>
${inner}
    </trkseg>
  </trk>`;
}

function planRoute(
  points: Array<{ lat: number; lon: number; name: string }>,
  collectionName: string,
  description: string | undefined,
): string {
  if (points.length < 2) return "";
  const inner = points
    .map(
      (p) =>
        `      <rtept lat="${p.lat}" lon="${p.lon}"><name>${esc(p.name)}</name></rtept>`,
    )
    .join("\n");
  const descEl = description ? `\n    <desc>${esc(description)}</desc>` : "";
  return `  <rte>
    <name>${esc(collectionName)} — planned stops</name>${descEl}
${inner}
  </rte>`;
}

/**
 * Build a valid GPX 1.1 document for a Field Kit collection.
 * Output is deterministic: sorted stop order + stable serialization.
 */
export function buildCombinedGpx(
  collection: FieldKitCollection,
  sites: Waypoint[],
  opts: CombinedGpxOptions,
): string {
  const sitesById = new Map(sites.map((s) => [s.id, s]));
  const resolved = resolveStops(collection, sitesById);

  const wptNodes: string[] = [];
  const lineNodes: string[] = [];
  const routePoints: Array<{ lat: number; lon: number; name: string }> = [];

  for (const n of resolved) {
    if (n.kind === "site") {
      wptNodes.push(wptFromSite(n.site, n.stop, opts));
      routePoints.push({
        lat: n.site.latitude,
        lon: n.site.longitude,
        name: n.stop.userName || n.site.name,
      });
    } else if (n.kind === "wpt") {
      wptNodes.push(wptFromImported(n, opts));
      routePoints.push({ lat: n.lat, lon: n.lon, name: n.name });
    } else {
      lineNodes.push(lineNode(n));
    }
  }

  const metaDesc =
    (collection.description ?? "") +
    (opts.includePrivateNotes && collection.privateNotes
      ? `${collection.description ? " \n" : ""}Private note: ${collection.privateNotes}`
      : "");

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Forest Atlas · West — Field Kit"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(collection.name)}</name>
    <desc>${esc(
      metaDesc ||
        "Forest Atlas West Field Kit export. Coordinates carry precision labels; do not assume survey accuracy.",
    )}</desc>
    <time>${new Date(collection.updatedAt).toISOString()}</time>
  </metadata>
`;

  const body = [
    ...wptNodes,
    planRoute(routePoints, collection.name, collection.description),
    ...lineNodes,
  ]
    .filter((s) => s.length > 0)
    .join("\n");

  return `${header}${body}
</gpx>`;
}