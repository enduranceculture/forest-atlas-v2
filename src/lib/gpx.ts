// Browser-only GPX parser and serializer.
// Imported data is ephemeral: parsed once in the tab, never persisted or uploaded.
import type { ImportedBundle, ImportedLine, ImportedWaypoint, Waypoint } from "@/data/schema";

function safeNum(s: string | null | undefined): number | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isValidLat(n: number | null): n is number {
  return n != null && Number.isFinite(n) && n >= -90 && n <= 90;
}
function isValidLon(n: number | null): n is number {
  return n != null && Number.isFinite(n) && n >= -180 && n <= 180;
}

function textOrNull(el: Element | null | undefined, tag: string): string | null {
  if (!el) return null;
  const child = el.getElementsByTagName(tag)[0];
  return child?.textContent?.trim() || null;
}

let __gpxCounter = 0;
function uid(prefix: string) {
  __gpxCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${__gpxCounter}`;
}

export function parseGpx(text: string, fileName: string): ImportedBundle {
  const warnings: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("Not a valid XML file — could not parse GPX.");
  }
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "gpx") {
    throw new Error("Missing <gpx> root — file is not a GPX document.");
  }

  const waypoints: ImportedWaypoint[] = [];
  const lines: ImportedLine[] = [];

  const wptEls = Array.from(doc.getElementsByTagName("wpt"));
  let skippedWpts = 0;
  for (const el of wptEls) {
    const lat = safeNum(el.getAttribute("lat"));
    const lon = safeNum(el.getAttribute("lon"));
    if (lat == null || lon == null) {
      skippedWpts += 1;
      warnings.push("Skipped a <wpt>: missing or non-numeric lat/lon.");
      continue;
    }
    if (!isValidLat(lat) || !isValidLon(lon)) {
      skippedWpts += 1;
      warnings.push(
        `Skipped a <wpt>: coordinate out of range (lat ${lat}, lon ${lon}). Latitude must be in -90..90 and longitude in -180..180.`
      );
      continue;
    }
    waypoints.push({
      id: uid("iwpt"),
      name: textOrNull(el, "name") ?? "Imported waypoint",
      latitude: lat,
      longitude: lon,
      elevation: safeNum(textOrNull(el, "ele")),
      time: textOrNull(el, "time"),
      description: textOrNull(el, "desc") ?? textOrNull(el, "cmt"),
    });
  }

  const parseSeq = (el: Element, tag: string): Array<[number, number]> => {
    const pts = Array.from(el.getElementsByTagName(tag));
    const coords: Array<[number, number]> = [];
    let skipped = 0;
    for (const p of pts) {
      const lat = safeNum(p.getAttribute("lat"));
      const lon = safeNum(p.getAttribute("lon"));
      if (!isValidLat(lat) || !isValidLon(lon)) {
        skipped += 1;
        continue;
      }
      coords.push([lat, lon]);
    }
    if (skipped > 0) {
      warnings.push(`Skipped ${skipped} <${tag}> point(s) with missing or out-of-range coordinates.`);
    }
    return coords;
  };

  const rteEls = Array.from(doc.getElementsByTagName("rte"));
  for (const el of rteEls) {
    const coords = parseSeq(el, "rtept");
    if (coords.length < 2) {
      warnings.push("Skipped a <rte> with fewer than 2 points.");
      continue;
    }
    lines.push({
      id: uid("irte"),
      name: textOrNull(el, "name") ?? "Imported route",
      kind: "route",
      coordinates: coords,
    });
  }

  const trkEls = Array.from(doc.getElementsByTagName("trk"));
  for (const el of trkEls) {
    const name = textOrNull(el, "name") ?? "Imported track";
    const segs = Array.from(el.getElementsByTagName("trkseg"));
    if (segs.length === 0) {
      warnings.push(`Track "${name}" has no <trkseg>.`);
      continue;
    }
    for (const seg of segs) {
      const coords = parseSeq(seg, "trkpt");
      if (coords.length < 2) {
        warnings.push(`Track "${name}" contains a segment with fewer than 2 points.`);
        continue;
      }
      lines.push({ id: uid("itrk"), name, kind: "track", coordinates: coords });
    }
  }

  if (waypoints.length === 0 && lines.length === 0) {
    throw new Error("GPX contained no waypoints, routes, or tracks.");
  }
  if (skippedWpts > 0) {
    warnings.push(`Total waypoints skipped: ${skippedWpts}.`);
  }

  return {
    fileName,
    importedAt: new Date().toISOString(),
    waypoints,
    lines,
    warnings,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function waypointToGpxNode(w: Waypoint): string {
  const precisionTag = `[${w.precision.toUpperCase()}]`;
  const isFixture = w.sourceType === "fixture";
  const accuracyLine = w.accuracyMeters
    ? isFixture
      ? `Estimated uncertainty: ~${w.accuracyMeters} m (fixture estimate — not measured accuracy).`
      : `Reported accuracy: ~${w.accuracyMeters} m.`
    : null;
  const descParts = [
    `${precisionTag} ${w.significance}`,
    `Category: ${w.category}. Confidence: ${w.confidence}. Precision: ${w.precision}.`,
    accuracyLine,
    `Source: ${w.sourceName}${w.sourceUrl ? ` — ${w.sourceUrl}` : ""}`,
    w.notes ? `Notes: ${w.notes}` : null,
  ]
    .filter(Boolean)
    .join(" \n");
  return `  <wpt lat="${w.latitude}" lon="${w.longitude}">
    <name>${esc(w.name)} ${esc(precisionTag)}</name>
    <cmt>${esc(w.sourceName)}</cmt>
    <desc>${esc(descParts)}</desc>
    <src>${esc(w.sourceName)}</src>
    <type>${esc(w.category)}</type>
    <extensions>
      <forestAtlas:meta xmlns:forestAtlas="https://forest-atlas.local/gpx">
        <sourceId>${esc(w.sourceId)}</sourceId>
        <precision>${esc(w.precision)}</precision>
        <confidence>${esc(w.confidence)}</confidence>
        <geometryType>${esc(w.geometryType)}</geometryType>
        ${w.accuracyMeters ? `<accuracyMeters kind="${isFixture ? "fixture-estimate" : "reported"}">${w.accuracyMeters}</accuracyMeters>` : ""}
        ${w.captureDate ? `<captureDate>${esc(w.captureDate)}</captureDate>` : ""}
      </forestAtlas:meta>
    </extensions>
  </wpt>`;
}

function lineToGpxNode(l: ImportedLine): string {
  const inner = l.coordinates
    .map(([lat, lon]) => `      <${l.kind === "route" ? "rtept" : "trkpt"} lat="${lat}" lon="${lon}" />`)
    .join("\n");
  if (l.kind === "route") {
    return `  <rte>
    <name>${esc(l.name)} [IMPORTED]</name>
${inner}
  </rte>`;
  }
  return `  <trk>
    <name>${esc(l.name)} [IMPORTED]</name>
    <trkseg>
${inner}
    </trkseg>
  </trk>`;
}

export function buildGpx(
  waypoints: Waypoint[],
  importedLines: ImportedLine[] = [],
  meta: { name?: string; description?: string } = {}
): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Forest Atlas · West"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:forestAtlas="https://forest-atlas.local/gpx">
  <metadata>
    <name>${esc(meta.name ?? "Forest Atlas export")}</name>
    <desc>${esc(
      meta.description ??
        "Bundled Forest Atlas fixture data. Coordinates carry precision labels (exact / approximate / site-center); do not assume survey accuracy."
    )}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;
  const body = [...waypoints.map(waypointToGpxNode), ...importedLines.map(lineToGpxNode)].join("\n");
  return `${header}${body}
</gpx>`;
}

export function downloadFile(fileName: string, contents: string, mime = "application/gpx+xml") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}