// Minimal typed ArcGIS REST client used by scripts/sync-fireshed.ts.
// This module intentionally lives OUTSIDE src/ so no client bundle can import it.

export type EsriEnvelope = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  spatialReference: { wkid: number };
};

export type EsriRing = Array<[number, number]>;

export type EsriPolygonGeometry = {
  rings: EsriRing[];
  spatialReference?: { wkid: number };
};

export type EsriFeature = {
  attributes: Record<string, unknown>;
  geometry: EsriPolygonGeometry;
};

export type EsriQueryResult = {
  displayFieldName?: string;
  fields?: Array<{ name: string; type: string; alias?: string }>;
  spatialReference?: { wkid: number };
  exceededTransferLimit?: boolean;
  features?: EsriFeature[];
  count?: number;
  error?: { code: number; message: string; details?: unknown };
};

export type QueryParams = Record<string, string | number | boolean>;

export type FetchOptions = {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
};

function toForm(params: QueryParams): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) u.set(k, String(v));
  return u.toString();
}

export async function arcgisQuery(
  endpoint: string,
  params: QueryParams,
  opts: FetchOptions = {},
): Promise<EsriQueryResult> {
  const retries = opts.retries ?? 3;
  const backoffMs = opts.backoffMs ?? 800;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // POST form-encoded: GET with large geometry/objectIds intermittently
      // triggers "socket closed" and code-400 flakes from this service.
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: toForm(params),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status >= 500) {
        throw new Error(`HTTP ${res.status} from ArcGIS`);
      }
      const json = (await res.json()) as EsriQueryResult;
      if (json.error) {
        // 400-class errors are surfaced immediately (not retried).
        throw new Error(
          `ArcGIS error ${json.error.code}: ${json.error.message}`,
        );
      }
      return json;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient =
        msg.includes("HTTP 5") ||
        msg.includes("aborted") ||
        msg.includes("ECONN") ||
        msg.includes("fetch failed") ||
        msg.includes("network") ||
        msg.includes("socket") ||
        msg.includes("EAI_AGAIN") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("terminated") ||
        // USDA layer 29 intermittently returns HTTP 200 with
        // {"error":{"code":400,"message":"Failed to execute query."}} for
        // otherwise-valid requests. Treat that transient service flake as
        // retryable; a truly malformed query fails on every attempt and
        // still surfaces after retries exhaust.
        msg.includes("ArcGIS error 400: Failed to execute query");
      if (!transient || attempt === retries - 1) throw err;
      const jitter = Math.floor(Math.random() * 500);
      await new Promise((r) =>
        setTimeout(r, backoffMs * (attempt + 1) + jitter),
      );
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("arcgisQuery failed");
}

// Compute signed area to determine ring orientation (clockwise = outer).
function ringSignedArea(ring: EsriRing): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[i][1] + ring[j][1]);
  }
  return sum / 2;
}

export function isClosedRing(ring: EsriRing): boolean {
  if (ring.length < 4) return false;
  const a = ring[0];
  const b = ring[ring.length - 1];
  return a[0] === b[0] && a[1] === b[1];
}

export function ringIsClockwise(ring: EsriRing): boolean {
  return ringSignedArea(ring) > 0;
}

// Point-in-polygon (ray casting) on a single ring.
function pointInRing(pt: [number, number], ring: EsriRing): boolean {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Convert an ESRI polygon (rings) to a GeoJSON Polygon or MultiPolygon.
// Follows the arcgis-to-geojson-utils orientation rules: clockwise = outer,
// counter-clockwise = hole. Holes are assigned to the smallest enclosing outer.
export function esriPolygonToGeoJSON(
  geom: EsriPolygonGeometry,
):
  | { type: "Polygon"; coordinates: EsriRing[] }
  | { type: "MultiPolygon"; coordinates: EsriRing[][] } {
  const outers: EsriRing[] = [];
  const holes: EsriRing[] = [];
  for (const ring of geom.rings) {
    if (ring.length < 4) continue;
    if (ringIsClockwise(ring)) outers.push(ring);
    else holes.push(ring);
  }
  const polys: EsriRing[][] = outers.map((o) => [o]);
  for (const hole of holes) {
    // Assign to the first outer that contains one of the hole's vertices.
    // (Firesheds don't nest, so ambiguity is not expected.)
    let assigned = false;
    for (let i = 0; i < outers.length; i++) {
      if (pointInRing(hole[0], outers[i])) {
        polys[i].push(hole);
        assigned = true;
        break;
      }
    }
    if (!assigned) polys.push([hole]); // fallback: standalone
  }
  if (polys.length === 1) {
    return { type: "Polygon", coordinates: polys[0] };
  }
  return { type: "MultiPolygon", coordinates: polys };
}

// Coordinate rounding intentionally removed. Source-faithful geometry is
// preserved exactly as returned by the ArcGIS service with outSR=4326.