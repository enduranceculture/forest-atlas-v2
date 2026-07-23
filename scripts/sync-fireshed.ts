#!/usr/bin/env bun
// Manual ingestion of the USDA Forest Service Fireshed Mature and Old Growth
// Area (federal lands only) polygons that intersect Idaho.
//
// Usage: bun run sync:fireshed
//
// Writes:
//   src/data/idaho/fireshed/inventory.geojson
//   src/data/idaho/fireshed/provenance.json
//
// Exits non-zero on any drift, gap, or validation failure so a broken snapshot
// cannot land in the repo.

import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import booleanIntersects from "@turf/boolean-intersects";
import { feature as turfFeature } from "@turf/helpers";

import {
  arcgisQuery,
  esriPolygonToGeoJSON,
  isClosedRing,
  type EsriFeature,
  type EsriPolygonGeometry,
} from "./lib/arcgis";
import {
  FireshedInventoryCollectionSchema,
  FireshedProvenanceSchema,
  NINE_CLASS_VALUES,
  type FireshedInventoryFeature,
} from "../src/data/idaho/fireshed/schema";

const SCRIPT_VERSION = "2.0.0";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const BOUNDARY_PATH = resolve(HERE, "lib/idaho-boundary.geojson");
const OUT_DIR = resolve(REPO_ROOT, "src/data/idaho/fireshed");
const INVENTORY_PATH = resolve(OUT_DIR, "inventory.geojson");
const PROVENANCE_PATH = resolve(OUT_DIR, "provenance.json");

const SERVICE =
  "https://apps.fs.usda.gov/fsgisx02/rest/services/wo_nfs_gstc/WO_OSC_GapAnalysis_OldGrowthAndMatureForests/MapServer";
const LAYER_ID = 29 as const;
const ENDPOINT = `${SERVICE}/${LAYER_ID}/query`;
const LAYER_NAME =
  "Fireshed Mature and Old Growth Area, Federal Lands Only (polygon)";
const LAYER_DESCRIPTION =
  "USDA Forest Service national fireshed accounting units (~250,000 acres each) with landscape-scale mature and old-growth estimates from FIA plot data for federal lands within each fireshed.";
const SERVICE_CURRENT_VERSION = "11.5";
const NATIVE_SR_WKID = 5070;
const MAP_SERVICE_SR_WKID = 3857;
const REQUESTED_SR_WKID = 4326;

const REQUIRED_FIELDS = [
  "OBJECTID",
  "Fireshed_Name",
  "MajRegion",
  "MATURE_ACRES",
  "MATURE_SE_PERC",
  "OLD_GROWTH_ACRES",
  "OLD_GROWTH_SE_PERC",
  "ForestType",
  "Division",
  "Nine_Class",
  "Trimmed_Area",
] as const;

const IDAHO_BOUNDARY_META = {
  source: "US Census Bureau 2025 Cartographic Boundary Files, States, 1:500,000",
  sourceUrl:
    "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip",
  year: 2025 as const,
  scale: "1:500,000" as const,
  geoid: "16" as const,
  stateFipsCode: "16" as const,
  stateName: "Idaho" as const,
};

function die(msg: string): never {
  console.error(`\x1b[31m[sync-fireshed] ${msg}\x1b[0m`);
  process.exit(1);
}

function log(msg: string): void {
  console.log(`[sync-fireshed] ${msg}`);
}

type BoundaryEnvelope = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
};

type IdahoBoundary = {
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
  envelope: BoundaryEnvelope;
  sha256: string;
  byteLength: number;
  geometryType: "Polygon" | "MultiPolygon";
};

function loadIdahoBoundary(): IdahoBoundary {
  if (!existsSync(BOUNDARY_PATH)) {
    die(`Idaho boundary not found at ${BOUNDARY_PATH}`);
  }
  const buf = readFileSync(BOUNDARY_PATH);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const raw = JSON.parse(buf.toString("utf8")) as {
    type?: string;
    features?: Array<{
      properties?: Record<string, unknown>;
      geometry?: { type?: string; coordinates?: unknown };
    }>;
    geometry?: { type?: string; coordinates?: unknown };
  };
  let feat: { properties?: Record<string, unknown>; geometry?: any } | undefined;
  if (raw.type === "FeatureCollection" && raw.features) {
    feat = raw.features.find(
      (f) =>
        String(f.properties?.["GEOID"]) === "16" ||
        String(f.properties?.["STATEFP"]) === "16",
    );
    if (!feat) die("Idaho boundary FeatureCollection has no GEOID=16 feature");
  } else if (raw.type === "Feature") {
    feat = raw as any;
  } else {
    die(`Idaho boundary has unexpected top-level type: ${raw.type}`);
  }
  const g = feat!.geometry;
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) {
    die(`Idaho boundary geometry must be Polygon or MultiPolygon; got ${g?.type}`);
  }
  const env = {
    xmin: Infinity,
    ymin: Infinity,
    xmax: -Infinity,
    ymax: -Infinity,
  };
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) {
      if (typeof v[0] === "number" && typeof v[1] === "number") {
        const [x, y] = v as [number, number];
        if (x < env.xmin) env.xmin = x;
        if (y < env.ymin) env.ymin = y;
        if (x > env.xmax) env.xmax = x;
        if (y > env.ymax) env.ymax = y;
      } else v.forEach(visit);
    }
  };
  visit(g.coordinates);
  return {
    geometry: g as IdahoBoundary["geometry"],
    envelope: env,
    sha256,
    byteLength: buf.byteLength,
    geometryType: g.type as "Polygon" | "MultiPolygon",
  };
}

function envelopeToArcgis(env: BoundaryEnvelope): string {
  return JSON.stringify({ ...env, spatialReference: { wkid: 4326 } });
}

function polygonToArcgis(
  geom: IdahoBoundary["geometry"],
): { esri: string; asRings: number[][][] } {
  // Convert GeoJSON polygon/multipolygon to ESRI rings.
  // GeoJSON: outer ring CCW, holes CW. ESRI: outer CW, holes CCW. But the
  // service is tolerant of orientation for spatial queries, and we set
  // spatialRel=esriSpatialRelIntersects. Serialize as-is.
  const rings: number[][][] =
    geom.type === "Polygon"
      ? (geom.coordinates as number[][][])
      : (geom.coordinates as number[][][][]).flatMap((p) => p);
  const esri = JSON.stringify({
    rings,
    spatialReference: { wkid: 4326 },
  });
  return { esri, asRings: rings };
}

function assertRequiredFields(attrs: Record<string, unknown>): void {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in attrs)) {
      die(`Feature missing required field '${field}'`);
    }
  }
}

function coerceNumber(v: unknown, field: string, oid: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    die(
      `Feature OBJECTID=${oid} has non-finite numeric field '${field}': ${JSON.stringify(v)}`,
    );
  }
  return v;
}

function coerceString(v: unknown, field: string, oid: number): string {
  if (typeof v !== "string") {
    die(`Feature OBJECTID=${oid} field '${field}' is not a string`);
  }
  return v;
}

function normalizeFeature(f: EsriFeature): FireshedInventoryFeature {
  const attrs = f.attributes;
  assertRequiredFields(attrs);
  const oidRaw = attrs["OBJECTID"];
  if (typeof oidRaw !== "number" || !Number.isInteger(oidRaw) || oidRaw <= 0) {
    die(`Feature has invalid OBJECTID: ${JSON.stringify(oidRaw)}`);
  }
  const oid = oidRaw;

  const geom = f.geometry as EsriPolygonGeometry;
  if (!geom || !Array.isArray(geom.rings) || geom.rings.length === 0) {
    die(`Feature OBJECTID=${oid} has empty geometry`);
  }
  for (const ring of geom.rings) {
    if (!isClosedRing(ring)) {
      die(`Feature OBJECTID=${oid} has an open or short ring`);
    }
    for (const [x, y] of ring) {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < -180 ||
        x > 180 ||
        y < -90 ||
        y > 90
      ) {
        die(`Feature OBJECTID=${oid} has coord out of EPSG:4326 range`);
      }
    }
  }

  const gj = esriPolygonToGeoJSON(geom);
  // Source-faithful geometry: no rounding, no simplification.
  const geometry = gj as FireshedInventoryFeature["geometry"];

  const nineClass = coerceString(attrs["Nine_Class"], "Nine_Class", oid);
  if (!(NINE_CLASS_VALUES as readonly string[]).includes(nineClass)) {
    die(
      `Feature OBJECTID=${oid} has unknown Nine_Class '${nineClass}' (source classification drift — update NINE_CLASS_VALUES in schema.ts)`,
    );
  }

  return {
    type: "Feature",
    properties: {
      OBJECTID: oid,
      Fireshed_Name: coerceString(
        attrs["Fireshed_Name"],
        "Fireshed_Name",
        oid,
      ),
      MajRegion: coerceString(attrs["MajRegion"], "MajRegion", oid),
      MATURE_ACRES: coerceNumber(attrs["MATURE_ACRES"], "MATURE_ACRES", oid),
      MATURE_SE_PERC: coerceNumber(
        attrs["MATURE_SE_PERC"],
        "MATURE_SE_PERC",
        oid,
      ),
      OLD_GROWTH_ACRES: coerceNumber(
        attrs["OLD_GROWTH_ACRES"],
        "OLD_GROWTH_ACRES",
        oid,
      ),
      OLD_GROWTH_SE_PERC: coerceNumber(
        attrs["OLD_GROWTH_SE_PERC"],
        "OLD_GROWTH_SE_PERC",
        oid,
      ),
      ForestType: coerceString(attrs["ForestType"], "ForestType", oid),
      Division: coerceString(attrs["Division"], "Division", oid),
      Nine_Class: nineClass as FireshedInventoryFeature["properties"]["Nine_Class"],
      Trimmed_Area: coerceNumber(attrs["Trimmed_Area"], "Trimmed_Area", oid),
    },
    geometry,
  };
}

type SpatialParams = {
  geometry: string;
  geometryType: "esriGeometryEnvelope" | "esriGeometryPolygon";
};

async function tryCount(sp: SpatialParams): Promise<number | null> {
  try {
    const res = await arcgisQuery(
      ENDPOINT,
      {
        where: "OBJECTID>0",
        geometry: sp.geometry,
        geometryType: sp.geometryType,
        inSR: 4326,
        spatialRel: "esriSpatialRelIntersects",
        returnCountOnly: true,
        f: "json",
      },
      { retries: 6, backoffMs: 1200 },
    );
    return typeof res.count === "number" ? res.count : null;
  } catch {
    return null;
  }
}

async function fetchObjectIds(sp: SpatialParams): Promise<number[]> {
  // IDs-only: never include outFields or returnGeometry — service can 400.
  const res = await arcgisQuery(
    ENDPOINT,
    {
      where: "OBJECTID>0",
      geometry: sp.geometry,
      geometryType: sp.geometryType,
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      returnIdsOnly: true,
      f: "json",
    },
    { retries: 8, backoffMs: 1500 },
  );
  const ids = (res as unknown as { objectIds?: unknown }).objectIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    die(`returnIdsOnly produced no objectIds`);
  }
  const nums = ids.map((v) => {
    if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) {
      die(`objectIds contains non-integer or non-positive value: ${String(v)}`);
    }
    return v;
  });
  const uniq = new Set(nums);
  if (uniq.size !== nums.length) {
    die(`returnIdsOnly returned duplicate OBJECTIDs`);
  }
  return nums.slice().sort((a, b) => a - b);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchFeaturesByIds(ids: number[]): Promise<EsriFeature[]> {
  const chunks = chunk(ids, 200);
  log(`fetching ${ids.length} features in ${chunks.length} chunks of <=200`);
  const collected: EsriFeature[] = [];
  const seen = new Set<number>();
  const fieldList = REQUIRED_FIELDS.join(",");
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const res = await arcgisQuery(
      ENDPOINT,
      {
        objectIds: c.join(","),
        outFields: fieldList,
        returnGeometry: true,
        outSR: 4326,
        f: "json",
      },
      { retries: 8, backoffMs: 1500, timeoutMs: 120_000 },
    );
    const feats = res.features ?? [];
    log(`  chunk ${i + 1}/${chunks.length}: ${feats.length} features`);
    if (feats.length !== c.length) {
      die(
        `chunk ${i + 1}: requested ${c.length} OBJECTIDs, got ${feats.length} back`,
      );
    }
    for (const f of feats) {
      const oid = f.attributes?.["OBJECTID"];
      if (typeof oid !== "number" || !Number.isInteger(oid)) {
        die(`Feature returned without an integer OBJECTID`);
      }
      if (seen.has(oid)) {
        die(`Duplicate OBJECTID ${oid} across chunks (pagination gap)`);
      }
      seen.add(oid);
      collected.push(f);
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) {
      die(`Requested OBJECTID ${id} missing from response set`);
    }
  }
  return collected;
}

function stableStringify(value: unknown, indent = 2): string {
  // Deterministic key ordering for reviewable diffs.
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) throw new Error("cycle detected");
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      out[key] = walk((v as Record<string, unknown>)[key]);
    }
    return out;
  };
  return JSON.stringify(walk(value), null, indent) + "\n";
}

function boundaryAsGeoJSONFeature(b: IdahoBoundary): any {
  return turfFeature(b.geometry as any);
}

function assertAllIntersectIdaho(
  features: FireshedInventoryFeature[],
  boundary: IdahoBoundary,
): void {
  const bf = boundaryAsGeoJSONFeature(boundary);
  for (const f of features) {
    const ff = turfFeature(f.geometry as any);
    if (!booleanIntersects(bf as any, ff as any)) {
      die(
        `Independent assertion failed: OBJECTID=${f.properties.OBJECTID} does not geometrically intersect the real Idaho polygon`,
      );
    }
  }
}

async function main(): Promise<void> {
  log(`script v${SCRIPT_VERSION}`);
  mkdirSync(OUT_DIR, { recursive: true });
  // Ensure clean state — never let a stale snapshot leak into the run.
  if (existsSync(INVENTORY_PATH)) rmSync(INVENTORY_PATH);
  if (existsSync(PROVENANCE_PATH)) rmSync(PROVENANCE_PATH);

  const boundary = loadIdahoBoundary();
  const env = boundary.envelope;
  log(
    `Idaho envelope: xmin=${env.xmin} ymin=${env.ymin} xmax=${env.xmax} ymax=${env.ymax}`,
  );
  const envSp: SpatialParams = {
    geometry: envelopeToArcgis(env),
    geometryType: "esriGeometryEnvelope",
  };
  const poly = polygonToArcgis(boundary.geometry);
  const polySp: SpatialParams = {
    geometry: poly.esri,
    geometryType: "esriGeometryPolygon",
  };

  // Preferred: server-side exact polygon intersection.
  let selectionMethod:
    | "server-polygon-intersects"
    | "envelope-candidates+local-exact-polygon-intersection" =
    "server-polygon-intersects";
  let serverPolygonQueryError: string | null = null;
  let candidateCount: number | null = null;
  let objectIds: number[] = [];
  let spatialCount: number | null = null;

  try {
    spatialCount = await tryCount(polySp);
    if (spatialCount !== null) {
      log(`server polygon returnCountOnly = ${spatialCount}`);
    }
    objectIds = await fetchObjectIds(polySp);
    log(`server polygon returnIdsOnly returned ${objectIds.length} OBJECTIDs`);
  } catch (err) {
    serverPolygonQueryError = err instanceof Error ? err.message : String(err);
    log(
      `server polygon query rejected: ${serverPolygonQueryError}. Falling back to envelope candidates + local exact polygon intersection.`,
    );
    selectionMethod = "envelope-candidates+local-exact-polygon-intersection";
    spatialCount = await tryCount(envSp);
    if (spatialCount !== null)
      log(`envelope returnCountOnly = ${spatialCount}`);
    objectIds = await fetchObjectIds(envSp);
    log(`envelope returnIdsOnly returned ${objectIds.length} candidate OBJECTIDs`);
  }

  if (spatialCount !== null && spatialCount !== objectIds.length) {
    die(
      `count mismatch: returnCountOnly=${spatialCount}, returnIdsOnly=${objectIds.length}`,
    );
  }

  const raw = await fetchFeaturesByIds(objectIds);
  log(`Fetched ${raw.length} raw ESRI features`);
  if (raw.length !== objectIds.length) {
    die(
      `Fetched feature count ${raw.length} does not match id count ${objectIds.length}`,
    );
  }

  let features: FireshedInventoryFeature[] = raw
    .map(normalizeFeature)
    .sort((a, b) => a.properties.OBJECTID - b.properties.OBJECTID);

  candidateCount = objectIds.length;
  if (selectionMethod === "envelope-candidates+local-exact-polygon-intersection") {
    const bf = boundaryAsGeoJSONFeature(boundary);
    const before = features.length;
    features = features.filter((f) =>
      booleanIntersects(bf as any, turfFeature(f.geometry as any) as any),
    );
    log(
      `local exact polygon intersection: ${features.length}/${before} candidates retained`,
    );
  }

  // Independent post-hoc assertion — always run, regardless of selection path.
  assertAllIntersectIdaho(features, boundary);

  const collection = { type: "FeatureCollection" as const, features };
  const inv = FireshedInventoryCollectionSchema.safeParse(collection);
  if (!inv.success) {
    die(`Assembled collection failed Zod validation: ${inv.error.message}`);
  }

  const geojsonText = JSON.stringify(collection);
  const sha256 = createHash("sha256").update(geojsonText).digest("hex");
  const featureOids = features.map((f) => f.properties.OBJECTID);
  const objectIdsDigest = createHash("sha256")
    .update(featureOids.join(","))
    .digest("hex");

  const provenance = {
    scriptVersion: SCRIPT_VERSION,
    retrievedAt: new Date().toISOString(),
    source: {
      service: SERVICE,
      layerId: LAYER_ID,
      layerName: LAYER_NAME,
      description: LAYER_DESCRIPTION,
      capabilities: "Query",
      supportedQueryFormats: "JSON",
      currentVersion: SERVICE_CURRENT_VERSION,
      nativeSpatialReferenceWkid: NATIVE_SR_WKID,
      mapServiceSpatialReferenceWkid: MAP_SERVICE_SR_WKID,
      requestedSpatialReferenceWkid: REQUESTED_SR_WKID,
    },
    query: {
      endpoint: ENDPOINT,
      parameters: {
        countStep:
          "where=OBJECTID>0 + spatial + returnCountOnly=true (best-effort; retried)",
        idsStep:
          "where=OBJECTID>0 + spatial + returnIdsOnly=true (no outFields, no geometry)",
        featuresStep:
          "objectIds=<=200 per chunk + outFields=<11 preserved fields> + returnGeometry=true + outSR=4326 + f=json",
        geometryType:
          selectionMethod === "server-polygon-intersects"
            ? "esriGeometryPolygon"
            : "esriGeometryEnvelope (candidate set) + local exact polygon intersection",
        inSR: "4326",
        outSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        f: "json",
      },
      fields: [...REQUIRED_FIELDS],
      sourceSpatialReference: { wkid: NATIVE_SR_WKID },
      outputSpatialReference: { wkid: REQUESTED_SR_WKID },
      pagination: {
        strategy:
          "returnCountOnly (best-effort) -> returnIdsOnly (authoritative) -> objectIds chunks of <=200",
        maxRecordCount: 200,
      },
      selection: {
        method: selectionMethod,
        serverPolygonQueryError,
        localIntersectionLibrary:
          selectionMethod === "envelope-candidates+local-exact-polygon-intersection"
            ? "@turf/boolean-intersects@^7"
            : null,
      },
    },
    idahoBoundary: {
      ...IDAHO_BOUNDARY_META,
      envelope: env,
      sha256: boundary.sha256,
      byteLength: boundary.byteLength,
      geometryType: boundary.geometryType,
    },
    snapshot: {
      featureCount: features.length,
      spatialCountReported: spatialCount,
      candidateCount,
      objectIds: featureOids,
      objectIdsDigest,
      sha256,
      byteLength: Buffer.byteLength(geojsonText, "utf8"),
      coordinateTransform:
        "source-faithful; no rounding, quantization, or simplification",
    },
    notes: {
      scope:
        "USDA Forest Service FIA plot data summarized to fireshed accounting units (~250,000 acres) on federal lands. These are landscape-scale estimates, not surveyed stand boundaries or tree locations.",
      crossStateFeatures:
        "Some firesheds cross state lines. Displayed metrics apply to the full source fireshed, not to the portion inside Idaho. Geometry is not clipped.",
      accuracyLanguage:
        "MATURE_SE_PERC and OLD_GROWTH_SE_PERC are percent standard error values from FIA summaries. They are not confidence intervals or accuracy figures.",
      runtimeDependency:
        "The application never queries apps.fs.usda.gov at runtime. Only this script does, and only when manually invoked.",
    },
  };
  const provParse = FireshedProvenanceSchema.safeParse(provenance);
  if (!provParse.success) {
    die(`Assembled provenance failed Zod validation: ${provParse.error.message}`);
  }

  writeFileSync(INVENTORY_PATH, JSON.stringify(collection), "utf8");
  writeFileSync(PROVENANCE_PATH, stableStringify(provenance), "utf8");
  const invBytes = statSync(INVENTORY_PATH).size;
  log(`Wrote ${INVENTORY_PATH} (${invBytes} bytes, sha256=${sha256})`);
  log(`Wrote ${PROVENANCE_PATH}`);
  log(`Done. ${features.length} features.`);
}

main().catch((err) => {
  die(err instanceof Error ? err.stack ?? err.message : String(err));
});