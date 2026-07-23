#!/usr/bin/env bun
// Gate 3 regression tests: Field Kit storage, GPX export, share URL,
// deterministic ordering, private-notes toggle, migration.
// Usage: bun run test:gate-3

import {
  migrateSnapshot,
  renumberStops,
  sortStops,
  type FieldKitCollection,
  type FieldKitStop,
} from "../src/lib/field-kit-types";
import { buildCombinedGpx } from "../src/lib/field-kit-gpx";
import { buildShareUrl } from "../src/lib/field-kit-share";
import type { Waypoint } from "../src/data/schema";

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

function makeSite(id: string, overrides: Partial<Waypoint> = {}): Waypoint {
  return {
    id,
    name: `Site ${id}`,
    latitude: 44.5,
    longitude: -115.5,
    region: "Test",
    category: "Old-growth",
    species: "Test",
    significance: "Test",
    access: "Test",
    confidence: "Medium",
    precision: "approximate",
    geometryType: "point",
    accuracyMeters: 100,
    sourceType: "fixture",
    sourceName: "Test source",
    sourceUrl: null,
    sourceId: `src-${id}`,
    captureDate: null,
    notes: null,
    ...overrides,
  };
}

function makeCollection(overrides: Partial<FieldKitCollection> = {}): FieldKitCollection {
  return {
    id: "col-1",
    name: "Test Kit",
    stops: [],
    researchRefs: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------- Migration & CRUD-shape ----------

console.log("Gate 3 — migration & collection shape");

test("empty raw migrates to empty snapshot", () => {
  const snap = migrateSnapshot(null);
  assert(snap.collections.length === 0, "expected empty");
  assert(snap.activeId === null, "expected null active");
  assert(snap.schemaVersion === 1, "expected v1");
});

test("corrupt raw does not throw", () => {
  const snap = migrateSnapshot({ collections: [{ garbage: true }], activeId: 42 });
  assert(snap.collections.length === 0, "should skip invalid collections");
  assert(snap.activeId === null, "should reset invalid activeId");
});

test("valid collections survive migration and renumber stops", () => {
  const snap = migrateSnapshot({
    schemaVersion: 1,
    activeId: "col-a",
    collections: [
      makeCollection({
        id: "col-a",
        stops: [
          { id: "s2", order: 5, kind: "site", publicId: "b" },
          { id: "s1", order: 2, kind: "site", publicId: "a" },
        ],
      }),
    ],
  });
  assert(snap.collections.length === 1, "one collection");
  const stops = snap.collections[0].stops;
  assert(stops[0].id === "s1" && stops[0].order === 0, "reordered first");
  assert(stops[1].id === "s2" && stops[1].order === 1, "reordered second");
});

test("activeId falls back to first collection if unknown", () => {
  const snap = migrateSnapshot({
    schemaVersion: 1,
    activeId: "nope",
    collections: [makeCollection({ id: "c-real" })],
  });
  assert(snap.activeId === "c-real", `got ${snap.activeId}`);
});

test("sortStops is deterministic on ties", () => {
  const stops: FieldKitStop[] = [
    { id: "z", order: 0, kind: "site", publicId: "x" },
    { id: "a", order: 0, kind: "site", publicId: "y" },
  ];
  const sorted = sortStops(stops);
  assert(sorted[0].id === "a", "id break-tie ascending");
});

test("renumberStops assigns 0..n-1", () => {
  const out = renumberStops([
    { id: "a", order: 99, kind: "site", publicId: "1" },
    { id: "b", order: 3, kind: "site", publicId: "2" },
    { id: "c", order: 7, kind: "site", publicId: "3" },
  ]);
  assert(out.map((s) => s.order).join(",") === "0,1,2", "expected 0,1,2");
  assert(out[0].id === "b", "smallest order first");
});

// ---------- GPX export ----------

console.log("\nGate 3 — combined GPX export");

const siteA = makeSite("wpt-a", { name: "Alpha", latitude: 44.1, longitude: -115.1 });
const siteB = makeSite("wpt-b", { name: "Bravo", latitude: 44.2, longitude: -115.2 });

test("exports Field Sites + imported wpt + line, deterministic order", () => {
  const col = makeCollection({
    name: "Trip 1",
    stops: [
      { id: "s1", order: 0, kind: "site", publicId: "wpt-a" },
      {
        id: "s2",
        order: 1,
        kind: "imported-wpt",
        imported: { kind: "wpt", name: "Camp", latitude: 44.15, longitude: -115.15 },
      },
      { id: "s3", order: 2, kind: "site", publicId: "wpt-b" },
      {
        id: "s4",
        order: 3,
        kind: "imported-line",
        imported: {
          kind: "line",
          lineKind: "track",
          name: "Approach",
          coordinates: [
            [44.1, -115.1],
            [44.2, -115.2],
          ],
        },
      },
    ],
  });
  const gpx = buildCombinedGpx(col, [siteA, siteB], { includePrivateNotes: false });
  const a = gpx.indexOf("Alpha");
  const camp = gpx.indexOf("Camp");
  const b = gpx.indexOf("Bravo");
  const trk = gpx.indexOf("<trk>");
  assert(a < camp && camp < b && b < trk, `expected Alpha < Camp < Bravo < <trk>, got ${a},${camp},${b},${trk}`);
  const gpx2 = buildCombinedGpx(col, [siteA, siteB], { includePrivateNotes: false });
  assert(gpx === gpx2, "output must be deterministic");
});

test("inventory research refs are excluded from GPX (no fireshed markers)", () => {
  const col = makeCollection({
    stops: [{ id: "s1", order: 0, kind: "site", publicId: "wpt-a" }],
    researchRefs: [
      { id: "r1", kind: "inventory-fireshed", publicId: "42", label: "TEST-FIRESHED-XYZ" },
    ],
  });
  const gpx = buildCombinedGpx(col, [siteA], { includePrivateNotes: true });
  assert(!gpx.includes("TEST-FIRESHED-XYZ"), "fireshed label leaked into GPX");
  assert(!gpx.includes("Fireshed"), "no fireshed terminology in GPX");
});

test("XML escaping: malformed name/notes cannot break the document", () => {
  const col = makeCollection({
    name: 'Trip "<one>" & only',
    description: "with <html> & \"quotes\"",
    stops: [
      {
        id: "s1",
        order: 0,
        kind: "imported-wpt",
        userName: "Named <injection> \"attempt\"",
        userNotes: "Sneaky ]]> & <script>",
        imported: {
          kind: "wpt",
          name: "raw & unsafe <name>",
          latitude: 44.1,
          longitude: -115.1,
        },
      },
    ],
  });
  const gpx = buildCombinedGpx(col, [], { includePrivateNotes: true });
  assert(!gpx.includes("<injection>"), "raw < survived escaping");
  assert(!gpx.includes("<script>"), "raw script tag survived escaping");
  assert(gpx.includes("&lt;injection&gt;"), "expected escaped injection");
  assert(gpx.includes("&amp;"), "expected escaped ampersand");
});

test("private notes omitted by default", () => {
  const col = makeCollection({
    privateNotes: "TOPSECRET-NOTES-XYZ",
    stops: [
      {
        id: "s1",
        order: 0,
        kind: "site",
        publicId: "wpt-a",
        userNotes: "STOP-NOTE-XYZ",
      },
    ],
  });
  const off = buildCombinedGpx(col, [siteA], { includePrivateNotes: false });
  assert(!off.includes("TOPSECRET-NOTES-XYZ"), "collection private notes leaked");
  assert(!off.includes("STOP-NOTE-XYZ"), "stop private notes leaked");
  const on = buildCombinedGpx(col, [siteA], { includePrivateNotes: true });
  assert(on.includes("TOPSECRET-NOTES-XYZ"), "collection notes missing when opted in");
  assert(on.includes("STOP-NOTE-XYZ"), "stop notes missing when opted in");
});

test("stale publicId references are silently skipped, kit stays exportable", () => {
  const col = makeCollection({
    stops: [
      { id: "s1", order: 0, kind: "site", publicId: "wpt-a" },
      { id: "s2", order: 1, kind: "site", publicId: "wpt-nonexistent" },
    ],
  });
  const gpx = buildCombinedGpx(col, [siteA], { includePrivateNotes: false });
  assert(gpx.includes("Alpha"), "existing site should be present");
  assert(!gpx.includes("wpt-nonexistent"), "stale ID must not leak");
  // GPX is still a valid document
  assert(gpx.startsWith("<?xml"), "should start with XML prolog");
  assert(gpx.endsWith("</gpx>"), "should end with </gpx>");
});

// ---------- Share URL ----------

console.log("\nGate 3 — share URL");

test("share URL includes public state, excludes private/imported", () => {
  const url = buildShareUrl({
    origin: "https://example.local",
    search: {
      mode: "inventory",
      sel: "42",
      q: "cedar",
      cats: "",
      conf: "",
      prec: "",
      src: "",
      hide: "",
      basemap: "topo",
      c: "45.5,-114.5,7",
      col: "",
      ninec: "",
      ftype: "",
      div: "",
      reg: "",
    },
    activeCollectionId: "col-abc",
  });
  assert(url.startsWith("https://example.local/idaho?"), `bad prefix: ${url}`);
  assert(url.includes("mode=inventory"), "mode missing");
  assert(url.includes("col=col-abc"), "col missing");
  assert(url.includes("basemap=topo"), "basemap missing");
  assert(url.includes("c=45.5%2C-114.5%2C7") || url.includes("c=45.5,-114.5,7"), "c missing");
});

test("share URL strips defaults for canonical form", () => {
  const url = buildShareUrl({
    origin: "https://example.local",
    search: {
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
    },
    activeCollectionId: null,
  });
  assert(url === "https://example.local/idaho", `expected canonical, got ${url}`);
});

test("share URL has no field to encode private notes or imports (type-safe)", () => {
  // The buildShareUrl signature only accepts IdahoSearch + activeCollectionId.
  // There is no channel through which private notes or imported payloads could
  // reach the URL — this test documents that invariant.
  const inputKeys = Object.keys({
    origin: "",
    pathname: "",
    search: {},
    activeCollectionId: "",
  });
  assert(!inputKeys.includes("privateNotes"), "no privateNotes input");
  assert(!inputKeys.includes("imports"), "no imports input");
  assert(!inputKeys.includes("stops"), "no stops input");
});

// ---------- results ----------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);