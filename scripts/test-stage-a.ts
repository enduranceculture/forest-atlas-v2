#!/usr/bin/env bun
// Stage A regression tests. Runs offline against the committed snapshot,
// exercises the Zod schemas with negative fixtures, and verifies exact
// polygon intersection excludes an envelope-only false positive.
//
// Usage: bun run test:stage-a

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import booleanIntersects from "@turf/boolean-intersects";
import { feature as turfFeature } from "@turf/helpers";

import {
  FireshedInventoryCollectionSchema,
  FireshedInventoryFeatureSchema,
  FireshedProvenanceSchema,
} from "../src/data/idaho/fireshed/schema";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const INV = resolve(REPO_ROOT, "src/data/idaho/fireshed/inventory.geojson");
const PROV = resolve(REPO_ROOT, "src/data/idaho/fireshed/provenance.json");
const BOUNDARY = resolve(HERE, "lib/idaho-boundary.geojson");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function assertFails(fn: () => void, msg: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(`expected failure: ${msg}`);
}

// ---------- load snapshot ----------
const invBuf = readFileSync(INV);
const provBuf = readFileSync(PROV);
const invRaw = JSON.parse(invBuf.toString("utf8"));
const provRaw = JSON.parse(provBuf.toString("utf8"));
const invParse = FireshedInventoryCollectionSchema.safeParse(invRaw);
const provParse = FireshedProvenanceSchema.safeParse(provRaw);

console.log("Stage A tests\n");

test("runtime Zod loader validates the real snapshot", () => {
  assert(invParse.success, `inventory failed: ${invParse.success ? "" : invParse.error.message}`);
  assert(provParse.success, `provenance failed: ${provParse.success ? "" : provParse.error.message}`);
});

const collection = invParse.success ? invParse.data : (null as any);
const provenance = provParse.success ? provParse.data : (null as any);

test("snapshot feature count matches provenance", () => {
  assert(collection && provenance, "load first");
  assert(
    provenance.snapshot.featureCount === collection.features.length,
    `count mismatch ${provenance.snapshot.featureCount} vs ${collection.features.length}`,
  );
});

test("snapshot SHA-256 matches provenance", () => {
  const sha = createHash("sha256").update(JSON.stringify(collection)).digest("hex");
  assert(sha === provenance.snapshot.sha256, `sha mismatch got=${sha} prov=${provenance.snapshot.sha256}`);
});

test("Idaho boundary SHA-256 matches provenance", () => {
  const bBuf = readFileSync(BOUNDARY);
  const sha = createHash("sha256").update(bBuf).digest("hex");
  assert(sha === provenance.idahoBoundary.sha256, `boundary sha mismatch`);
});

test("ordered OBJECTIDs match provenance", () => {
  const ids = collection.features.map((f: any) => f.properties.OBJECTID);
  assert(
    JSON.stringify(ids) === JSON.stringify(provenance.snapshot.objectIds),
    `objectIds diverge from snapshot`,
  );
  const digest = createHash("sha256").update(ids.join(",")).digest("hex");
  assert(digest === provenance.snapshot.objectIdsDigest, `objectIdsDigest mismatch`);
});

test("no duplicate OBJECTIDs", () => {
  const ids = collection.features.map((f: any) => f.properties.OBJECTID);
  assert(new Set(ids).size === ids.length, "duplicates present");
});

test("every retained feature exactly intersects the real Idaho polygon", () => {
  const raw = JSON.parse(readFileSync(BOUNDARY).toString("utf8"));
  const bFeat =
    raw.type === "FeatureCollection"
      ? raw.features.find((f: any) => String(f.properties?.GEOID) === "16")
      : raw;
  assert(bFeat, "no Idaho boundary");
  for (const f of collection.features) {
    if (!booleanIntersects(bFeat, turfFeature(f.geometry))) {
      throw new Error(`OBJECTID ${f.properties.OBJECTID} does not intersect Idaho`);
    }
  }
});

test("bbox-only false positive is excluded by exact polygon intersection", () => {
  // Idaho's bbox corner around (-117, 42) sits outside the actual polygon
  // (that corner is in Oregon/Nevada). A tiny polygon there must NOT
  // register as intersecting Idaho even though it falls inside the bbox.
  const raw = JSON.parse(readFileSync(BOUNDARY).toString("utf8"));
  const bFeat =
    raw.type === "FeatureCollection"
      ? raw.features.find((f: any) => String(f.properties?.GEOID) === "16")
      : raw;
  const fakeInBbox = turfFeature({
    type: "Polygon",
    coordinates: [
      [
        [-116.99, 42.01],
        [-116.98, 42.01],
        [-116.98, 42.02],
        [-116.99, 42.02],
        [-116.99, 42.01],
      ],
    ],
  });
  const insideIdaho = turfFeature({
    type: "Polygon",
    coordinates: [
      [
        [-114.5, 44.0],
        [-114.4, 44.0],
        [-114.4, 44.1],
        [-114.5, 44.1],
        [-114.5, 44.0],
      ],
    ],
  });
  assert(
    !booleanIntersects(bFeat, fakeInBbox),
    "bbox-only false positive was NOT excluded — exact intersection is broken",
  );
  assert(
    booleanIntersects(bFeat, insideIdaho),
    "known-inside polygon failed to intersect Idaho",
  );
});

// ---------- schema negative tests ----------
const sampleFeature = collection.features[0];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

test("schema rejects empty FeatureCollection", () => {
  assertFails(() => {
    const r = FireshedInventoryCollectionSchema.safeParse({
      type: "FeatureCollection",
      features: [],
    });
    if (!r.success) throw r.error;
  }, "empty must fail");
});

test("schema rejects missing required field", () => {
  const bad = clone(sampleFeature);
  delete bad.properties.MATURE_ACRES;
  const r = FireshedInventoryFeatureSchema.safeParse(bad);
  assert(!r.success, "missing field must fail");
});

test("schema rejects invalid numeric field", () => {
  const bad = clone(sampleFeature);
  bad.properties.MATURE_ACRES = "not a number";
  const r = FireshedInventoryFeatureSchema.safeParse(bad);
  assert(!r.success, "non-number must fail");
});

test("schema rejects unexpected Nine_Class", () => {
  const bad = clone(sampleFeature);
  bad.properties.Nine_Class = "10";
  const r = FireshedInventoryFeatureSchema.safeParse(bad);
  assert(!r.success, "bad Nine_Class must fail");
});

test("schema rejects coordinate out of range", () => {
  const bad = clone(sampleFeature);
  if (bad.geometry.type === "Polygon") bad.geometry.coordinates[0][0][0] = 999;
  else bad.geometry.coordinates[0][0][0][0] = 999;
  const r = FireshedInventoryFeatureSchema.safeParse(bad);
  assert(!r.success, "OOR coord must fail");
});

test("schema rejects open ring", () => {
  const bad = clone(sampleFeature);
  const ring =
    bad.geometry.type === "Polygon"
      ? bad.geometry.coordinates[0]
      : bad.geometry.coordinates[0][0];
  ring[ring.length - 1] = [ring[0][0] + 0.001, ring[0][1] + 0.001];
  const r = FireshedInventoryFeatureSchema.safeParse(bad);
  assert(!r.success, "open ring must fail");
});

test("schema rejects non-polygon geometry", () => {
  const bad = clone(sampleFeature);
  bad.geometry = { type: "LineString", coordinates: [[0, 0], [1, 1]] };
  const r = FireshedInventoryFeatureSchema.safeParse(bad);
  assert(!r.success, "line geom must fail");
});

test("pagination: id set with a duplicate/missing entry would fail digest check", () => {
  const ids = collection.features.map((f: any) => f.properties.OBJECTID);
  const withDup = [...ids, ids[0]];
  const digestDup = createHash("sha256").update(withDup.join(",")).digest("hex");
  assert(digestDup !== provenance.snapshot.objectIdsDigest, "dup must break digest");
  const withGap = ids.slice(0, -1);
  const digestGap = createHash("sha256").update(withGap.join(",")).digest("hex");
  assert(digestGap !== provenance.snapshot.objectIdsDigest, "missing id must break digest");
});

test("*_SE_PERC values are non-negative percentages", () => {
  for (const f of collection.features) {
    assert(f.properties.MATURE_SE_PERC >= 0, `MATURE_SE_PERC negative on ${f.properties.OBJECTID}`);
    assert(f.properties.OLD_GROWTH_SE_PERC >= 0, `OLD_GROWTH_SE_PERC negative on ${f.properties.OBJECTID}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);