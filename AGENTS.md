<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Fireshed inventory (Stage A)

- `src/data/idaho/fireshed/{schema.ts,classes.ts,index.ts,inventory.geojson,provenance.json}` — Zod-validated USDA layer 29 snapshot.
- `scripts/sync-fireshed.ts` — manual refresh (`bun run sync:fireshed`). Selection uses the actual Idaho Polygon geometry (server `esriGeometryPolygon` intersects; envelope + local exact `@turf/boolean-intersects` fallback). The Idaho envelope is never the final inclusion test. Source geometry is preserved as-returned (no rounding, no simplification).
- `scripts/test-stage-a.ts` — regression tests (`bun run test:stage-a`).
- Do not query USDA at runtime. Do not clip cross-state polygons. Never rename `Nine_Class`, `MATURE_SE_PERC`, `OLD_GROWTH_SE_PERC`, or reword them as confidence / accuracy / margin.
- Snapshot in tree may be a placeholder when USDA MapServer/29 is rejecting spatial queries; the runtime loader returns `{ ok: false }` in that case. Re-run `bun run sync:fireshed` when the service recovers.
- Stage B (dataset switch UI) is NOT yet implemented.
