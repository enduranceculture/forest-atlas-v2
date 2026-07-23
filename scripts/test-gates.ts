#!/usr/bin/env bun
// Gate 1 + Gate 2 regression tests. Runs offline.
// Usage: bun run test:gates

import {
  IDAHO_SEARCH_DEFAULTS,
  formatMapView,
  idahoSearchSchema,
  parseCsv,
  parseMapView,
  toCsv,
  toggleInCsv,
} from "../src/lib/url-state";
import {
  resolveFieldSitesStatus,
  resolveInventoryStatus,
} from "../src/data/dataset-status";
import { matchInventoryFeature } from "../src/components/idaho/inventory/InventoryShell";
import type { FireshedInventoryFeature } from "../src/data/idaho/fireshed/schema";

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

// ---------- Gate 1: search parsing / canonicalization ----------

console.log("Gate 1 — search parsing & canonicalization");

test("parses empty URL to defaults", () => {
  const parsed = idahoSearchSchema.parse({});
  for (const [k, v] of Object.entries(IDAHO_SEARCH_DEFAULTS)) {
    assert(
      (parsed as Record<string, unknown>)[k] === v,
      `default for ${k} should be ${JSON.stringify(v)}, got ${JSON.stringify((parsed as Record<string, unknown>)[k])}`,
    );
  }
});

test("rejects invalid mode via fallback", () => {
  const parsed = idahoSearchSchema.parse({ mode: "bogus" });
  assert(parsed.mode === "sites", `mode fallback failed: ${parsed.mode}`);
});

test("rejects invalid basemap via fallback", () => {
  const parsed = idahoSearchSchema.parse({ basemap: "satellite" });
  assert(parsed.basemap === "dark", `basemap fallback failed: ${parsed.basemap}`);
});

test("accepts full search state", () => {
  const parsed = idahoSearchSchema.parse({
    mode: "inventory",
    sel: "42",
    q: "cedar",
    cats: "Old-growth,Cultural",
    hide: "context,imports",
    basemap: "topo",
    c: "45.5,-114.5,7",
  });
  assert(parsed.mode === "inventory", "mode should stick");
  assert(parsed.sel === "42", "sel should stick");
  assert(parsed.q === "cedar", "q should stick");
});

test("toCsv canonicalizes order & dedupes", () => {
  assert(toCsv(["b", "a", "b", "c"]) === "a,b,c", "should sort + dedupe");
  assert(toCsv([]) === "", "empty stays empty");
});

test("parseCsv is inverse of toCsv (for canonical input)", () => {
  const arr = ["Alpha", "Beta", "Gamma"];
  const round = parseCsv(toCsv(arr));
  assert(JSON.stringify(round) === JSON.stringify(arr), `roundtrip failed: ${round}`);
});

test("toggleInCsv adds and removes", () => {
  let v = "";
  v = toggleInCsv(v, "x");
  assert(v === "x", `add x: ${v}`);
  v = toggleInCsv(v, "y");
  assert(v === "x,y", `add y: ${v}`);
  v = toggleInCsv(v, "x");
  assert(v === "y", `remove x: ${v}`);
});

test("parseMapView accepts valid & rejects invalid", () => {
  const ok = parseMapView("45.5,-114.5,7");
  assert(ok && ok.lat === 45.5 && ok.zoom === 7, "valid failed");
  assert(parseMapView("") === null, "empty should be null");
  assert(parseMapView("bad") === null, "malformed should be null");
  assert(parseMapView("95,-114.5,7") === null, "out-of-range lat should be null");
  assert(parseMapView("45,200,7") === null, "out-of-range lon should be null");
});

test("formatMapView roundtrips through parseMapView", () => {
  const v = { lat: 45.1234, lon: -114.6789, zoom: 8.5 };
  const round = parseMapView(formatMapView(v));
  assert(round && Math.abs(round.lat - v.lat) < 1e-3, "lat roundtrip drift");
  assert(round && Math.abs(round.lon - v.lon) < 1e-3, "lon roundtrip drift");
});

test("invalid selected ID doesn't crash resolver (numeric parse)", () => {
  // App-level: unknown sel just resolves to null selection; the parser accepts any string.
  const parsed = idahoSearchSchema.parse({ sel: "not-a-real-id" });
  assert(parsed.sel === "not-a-real-id", "sel is stored verbatim; UI ignores unknown IDs");
});

// ---------- Gate 2: dataset status ----------

console.log("\nGate 2 — dataset status");

test("Field Sites resolves to fixture status", () => {
  const s = resolveFieldSitesStatus();
  assert(s.kind === "fixture", `expected fixture, got ${s.kind}`);
  if (s.kind === "fixture") {
    assert(s.count > 0, "fixture count should be positive");
  }
});

test("Landscape Inventory resolves to blocked-upstream (current provenance)", () => {
  const s = resolveInventoryStatus();
  assert(
    s.kind === "blocked-upstream" || s.kind === "invalid",
    `expected blocked-upstream or invalid, got ${s.kind}`,
  );
});

// ---------- Gate 2: inventory feature matching (test-only fixture) ----------

console.log("\nGate 2 — inventory matcher (test-only fixture)");

function makeFeat(overrides: Partial<FireshedInventoryFeature["properties"]>): FireshedInventoryFeature {
  return {
    type: "Feature",
    properties: {
      OBJECTID: 1,
      Fireshed_Name: "Test Shed",
      MajRegion: "Northern",
      MATURE_ACRES: 100,
      MATURE_SE_PERC: 5,
      OLD_GROWTH_ACRES: 20,
      OLD_GROWTH_SE_PERC: 12,
      ForestType: "Cedar-Hemlock",
      Division: "Boreal",
      Nine_Class: "5",
      Trimmed_Area: 100,
      ...overrides,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-114, 45],
        [-113, 45],
        [-113, 46],
        [-114, 46],
        [-114, 45],
      ]],
    },
  };
}

test("no filters => match", () => {
  const f = makeFeat({});
  assert(
    matchInventoryFeature(f, "", {
      nineClass: new Set(),
      forestType: new Set(),
      division: new Set(),
      majRegion: new Set(),
    }),
    "should match empty filters",
  );
});

test("OR within family: two nineClass values", () => {
  const f = makeFeat({ Nine_Class: "3" });
  assert(
    matchInventoryFeature(f, "", {
      nineClass: new Set(["3", "7"] as ("3" | "7")[]),
      forestType: new Set(),
      division: new Set(),
      majRegion: new Set(),
    }),
    "OR within family should match",
  );
});

test("AND across families: mismatch on one excludes feature", () => {
  const f = makeFeat({ Nine_Class: "3", ForestType: "Cedar-Hemlock" });
  assert(
    !matchInventoryFeature(f, "", {
      nineClass: new Set(["3"] as ("3")[]),
      forestType: new Set(["Douglas-fir"]),
      division: new Set(),
      majRegion: new Set(),
    }),
    "AND across families should exclude",
  );
});

test("query matches Fireshed_Name case-insensitively", () => {
  const f = makeFeat({ Fireshed_Name: "Upper Priest" });
  assert(
    matchInventoryFeature(f, "priest", {
      nineClass: new Set(),
      forestType: new Set(),
      division: new Set(),
      majRegion: new Set(),
    }),
    "query should match",
  );
  assert(
    !matchInventoryFeature(f, "notfound", {
      nineClass: new Set(),
      forestType: new Set(),
      division: new Set(),
      majRegion: new Set(),
    }),
    "query miss should exclude",
  );
});

// ---------- results ----------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);