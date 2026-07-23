# Forest Atlas: West — Durable Project Knowledge

## Product architecture

- `/` is the editorial Western Atlas: deterministic, lightweight, visually rich, and stable.
- `/idaho` is the interactive field explorer: map-driven, filterable, mobile-friendly, and practical.
- Keep these rendering systems separate. Do not collapse both experiences into one giant map component.
- Maintain the dark alpine field-guide direction: deep spruce, bone, mineral gray, lichen green, restrained ember orange.
- Keep
## Datasets

- **Field Sites** (`src/data/idaho/waypoints.ts`): bundled fixture placeholders. Not authoritative.
- **Landscape Inventory** (`src/data/idaho/fireshed/`): USDA Forest Service *Fireshed Mature and Old Growth Area, Federal Lands Only (polygon)* (MapServer layer 29), selected by exact intersection with the US Census 2025 Idaho Polygon boundary (GEOID 16, 1:500,000). The Idaho envelope is never the final inclusion test — selection uses server-side `esriGeometryPolygon` intersects, with an envelope-candidate + local `@turf/boolean-intersects` fallback when the service rejects polygon queries. Source geometry is preserved as-returned by ArcGIS at `outSR=4326` (no rounding, quantization, or simplification). The app never queries `apps.fs.usda.gov` at runtime.

Refresh with `bun run sync:fireshed`; verify with `bun run test:stage-a`. See `scripts/README.md`. `MATURE_SE_PERC` / `OLD_GROWTH_SE_PERC` are percent standard error, never labeled as confidence or accuracy. Some firesheds cross the Idaho boundary; geometry is not clipped.
