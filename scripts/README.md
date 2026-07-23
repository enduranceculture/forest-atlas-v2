# Data sync scripts

Ingestion pipelines that produce the bundled `src/data/` snapshots. These
scripts are developer tools — they never run at build time, in the browser, or
on the deployed server. The app reads only the committed snapshot files.

## `bun run sync:fireshed`

Fetches the USDA Forest Service *Fireshed Mature and Old Growth Area, Federal
Lands Only (polygon)* features (MapServer layer 29) that exactly intersect the
Idaho Polygon boundary (never merely its bounding envelope), converts the ESRI
response to GeoJSON with source-faithful geometry (no rounding, quantization,
or simplification), validates with the runtime Zod schema, and writes:

- `src/data/idaho/fireshed/inventory.geojson` — validated `FeatureCollection`.
- `src/data/idaho/fireshed/provenance.json` — endpoint, query params, Idaho
  boundary source, feature count, ordered OBJECTID list, SHA-256, script
  version, and cross-state / scope notes.

### Refresh policy

Run manually when the USDA source is refreshed. The command exits non-zero on
any of the following, so a broken snapshot never lands in the repo:

- empty result
- pagination gap (missing or duplicate OBJECTID)
- feature count mismatch versus ArcGIS `returnCountOnly`
- any retained feature that does not intersect the real Idaho polygon
- schema drift (missing field, unknown `Nine_Class`, non-numeric numeric field)
- invalid geometry (non-polygon, out-of-range coord, open ring, ring < 4 pts)
- network exhaustion after retries

If `Nine_Class` gains a new value, update
`src/data/idaho/fireshed/schema.ts#NINE_CLASS_VALUES` in the same commit that
refreshes the snapshot.

### Sources

- **Fireshed layer**:
  `https://apps.fs.usda.gov/fsgisx02/rest/services/wo_nfs_gstc/WO_OSC_GapAnalysis_OldGrowthAndMatureForests/MapServer/29`
- **Idaho boundary**: US Census Bureau 2025 Cartographic Boundary Files,
  States, 1:500,000 —
  `https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_500k.zip`.
  Idaho GEOID / state FIPS `16`. The extracted single-state boundary lives at
  `scripts/lib/idaho-boundary.geojson`.

### Selection method

1. Preferred: server-side `geometryType=esriGeometryPolygon`, `inSR=4326`,
   `spatialRel=esriSpatialRelIntersects` for count and `returnIdsOnly`.
2. Fallback (recorded in `provenance.json`) when the service rejects polygon
   queries: envelope `returnIdsOnly` for candidates, then local exact polygon
   intersection with `@turf/boolean-intersects` against the Census Idaho
   Polygon.
3. An independent post-hoc assertion re-runs `booleanIntersects` on every
   retained feature regardless of path.

Feature retrieval uses `objectIds` chunks of ≤200 with `outFields=<11 preserved
fields>`, `returnGeometry=true`, `outSR=4326`, `f=json`.

## `bun run test:stage-a`

Offline regression tests: schema negative fixtures, snapshot ↔ provenance
SHA-256 + count agreement, Idaho boundary SHA-256, and a bbox-only
false-positive exclusion check.

### Notes

- Fireshed totals apply to the full source polygon; some firesheds cross the
  Idaho boundary and are intentionally not clipped.
- The MATURE / OLD_GROWTH SE_PERC fields are standard-error percentages from
  FIA plot summaries, not confidence intervals.
- The app has zero runtime dependency on `apps.fs.usda.gov`.
