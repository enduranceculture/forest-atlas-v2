## USDA Layer 29 health check — result

This was a read-only probe. No files were edited and no plan action is required unless you want to move on Stage A.

### Findings
- `where=OBJECTID=1` + `outFields=OBJECTID,Fireshed_Name,MajRegion` → HTTP 200, real feature returned (`OBJECTID=1`, `Fireshed_Name="Berlin, New Hampshire"`, `MajRegion="09"`).
- `where=1=1&resultRecordCount=1&orderByFields=OBJECTID ASC` → HTTP 200, real feature + `exceededTransferLimit:true` (pagination via offset is viable).
- `returnCountOnly=true` → HTTP 200, `count=2192`.
- `returnIdsOnly=true` → HTTP 200 with ArcGIS `error 400: Failed to execute query` (**still broken**).

### Interpretation
Attribute-record retrieval has recovered. Stage A in Issue #2 is eligible to rerun in principle, but `scripts/sync-fireshed.ts` uses `returnIdsOnly` as its authoritative pagination anchor (see `fetchObjectIds`), and that path is still failing. Running `bun run sync:fireshed` as-written today would still die at the ids step. Stage A is not complete.

### Options (no action taken)
1. Wait for `returnIdsOnly` to recover, then rerun Stage A unchanged.
2. Adjust the sync script to fall back to spatial-filtered `resultOffset`/`resultRecordCount` pagination ordered by `OBJECTID` when `returnIdsOnly` errors, keeping the count-reconciliation and duplicate/gap checks intact.

Tell me which path you want and I'll return with a build plan.
