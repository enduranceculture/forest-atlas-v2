# Sun Valley Poster Remix — Phase 1 Plan

Non-destructive visual art-direction pass. **No logic, data, routes, URL state, GPX, Field Kit behavior, USDA truthfulness, PWA, or tests will change.** Only tokens, styles, decorative primitives, and presentational JSX.

## 0. One open question before I build

The brief references a supplied Union Pacific Sun Valley map, but no image is attached to the thread. Options:
- **(a)** Drop the reference image in and I'll study it before touching code (recommended — the "authored" 1930s composition is very hard to fake from description alone).
- **(b)** Proceed from the written spec + my knowledge of the era's UP tourism cartography (Preissig / Bernhardt Wall-adjacent). Faster, slightly higher taste risk.

Tell me (a) or (b) when approving.

## 1. What stays untouched

- All route files' loaders, state, effects, handlers
- `src/data/**` (schemas, waypoints, fireshed placeholder, dataset-status)
- `src/lib/**` (gpx, field-kit-*, url-state, projection, pwa-*, error-*)
- `src/hooks/**`
- Leaflet map wiring in `IdahoMapClient.tsx` — only marker SVGs, tile filter, and popup styling change; zoom/pan/hit targets identical
- `scripts/`, `AGENTS.md`, `PROJECT_KNOWLEDGE.md`, tests, sync pipeline
- PWA manifest + service worker registration; icons left intact
- Route metadata strings

## 2. Design token overhaul (`src/styles.css`)

Replace the current dark-spruce semantic mapping with a warm paper system. Brand ramp variables (`--spruce`, `--bone`, etc.) stay defined so any straggler class keeps compiling, but semantic tokens (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--ring`, sidebar, chart) remap to:

| Token | Value (oklch) | Role |
|---|---|---|
| `--paper` | ~0.955 0.022 85 | canvas cream |
| `--paper-deep` | ~0.92 0.028 78 | inset / recessed paper |
| `--ink` | ~0.22 0.012 60 | warm charcoal type |
| `--ink-soft` | ~0.42 0.010 60 | secondary type |
| `--vermilion` | ~0.60 0.198 34 | frame, CTA, selection, red labels |
| `--vermilion-deep` | ~0.50 0.20 32 | pressed / hover ink |
| `--cobalt` | ~0.42 0.16 258 | water |
| `--hachure` | ~0.55 0.008 60 | mountain gray strokes |
| `--pine` | ~0.32 0.055 155 | forest fill |
| `--sage` | ~0.68 0.045 145 | muted forest overlay |
| `--mustard` | ~0.78 0.13 85 | rare secondary accent |

- `--radius` drops to `2px`; new tokens `--radius-clip` (clipped-corner via `clip-path`) and `--rule` (1px vermilion), `--rule-double` (double vermilion border pattern).
- New font tokens: `--font-display` (condensed slab — **Bricolage Grotesque Bold** or **Big Shoulders Display** from Google Fonts, loaded via `<link>` in `__root.tsx`), `--font-editorial` (keep Fraunces), `--font-field` (keep JetBrains Mono, uppercase tracked).
- Density ramp (`--density-1..9`) rebalanced onto cream ground: pale sage → deep pine, so existing `bg-density-*` classes on the Western map keep working with zero JSX changes.

## 3. New reusable primitives (`src/components/atlas/`)

Small, dumb, presentational. Each exports one component + is tree-shakeable.

1. `PaperBackdrop.tsx` — SVG fiber/grain overlay (single feTurbulence filter, ~4kb, `prefers-reduced-motion` safe, static).
2. `DoubleRuleFrame.tsx` — nested vermilion + charcoal border with optional clipped corners; slot for children; `variant="poster" | "inset" | "panel"`.
3. `VintagePlacard.tsx` — small red-inked label plate for region/site names (used for Idaho emphasis on the Western map and for panel titles).
4. `HachurePattern.tsx` — reusable `<defs><pattern>` of hand-cut mountain strokes (SVG only; declared once, referenced by id).
5. `FieldIcons/` — minimalist inline SVGs: `Elk`, `Bear`, `Tent`, `Lookout`, `Hiker`, `Pine`, `Compass`. ~40 lines each, current-color, single stroke weight. Used sparingly (not clutter).
6. `PrintedTab.tsx` — labeled tab used on inset panels and bottom-sheet handle.
7. `InkButton.tsx` — square/clipped button with off-register vermilion shadow on hover/focus; replaces rounded-pill CTAs.
8. `FieldMarker.ts` (Leaflet `divIcon` factory) — coherent vintage marker family: dot-in-circle, triangle-lookout, tent, waypoint pin, cluster badge. Selected state gets vermilion ink + 1px offset echo.

## 4. Western Atlas homepage (`src/routes/index.tsx` + `WesternAtlasMap.tsx`, `RegionCard.tsx`, `DensityLegend.tsx`, `AboutDrawer.tsx`, `AtlasUnavailable.tsx`)

- Wrap main in `PaperBackdrop` + outer `DoubleRuleFrame variant="poster"`.
- Header becomes a printed masthead: display-slab wordmark, tiny uppercase field metadata, vermilion `InkButton` for "Explore Idaho".
- `WesternAtlasMap` SVG:
  - Ocean/void → paper cream (transparent).
  - State fills → cream with subtle hachure overlay via `HachurePattern`.
  - Density ramp → pale-sage → deep-pine (already 9-step, just recolored).
  - Idaho — always outlined in vermilion double-rule, with a `VintagePlacard` label; on hover other regions get a thin vermilion outline echo instead of glow.
  - Add a small scattering (~8–12) of `FieldIcons` positioned via existing region centroids only; toggled off < 640px.
  - Waterways: a handful of major rivers/lakes as cobalt strokes (data added to `src/data/western/`? — **no**, this is presentational; I'll add a small static geographic decoration file `src/data/western/decorative-waters.ts` that is explicitly labeled non-authoritative and used only for visual composition. Confirm okay or I'll skip water on the Western map.)
- Right rail → printed inset legend panel (`DoubleRuleFrame variant="inset"` + `PrintedTab` headers). Same content, same interactions.
- Focus states: vermilion 2px outline offset, no more ember glow ring.

## 5. Idaho Explorer (`src/routes/idaho.tsx` + all `src/components/idaho/**`)

- Shell wrapped in the paper system; map framed by `DoubleRuleFrame variant="inset"`.
- Leaflet tiles: apply a CSS filter (`sepia(0.15) saturate(0.85) hue-rotate(-8deg) brightness(1.02)`) so the basemap sits in the cream palette without swapping providers.
- `MapControls`, `SiteFilters`, `DatasetSwitch`, `FixtureStatusStrip`, `ImportPanel`: rounded pills → clipped-corner printed keys; charcoal on cream; vermilion active states.
- Markers via new `FieldMarker` factory; selected = vermilion + 1px offset echo.
- `BottomSheet` + `WaypointDetail` + `InventoryDetail` + `InventoryShell`: ranger-notebook treatment — cream paper, double-rule top edge, `PrintedTab` label, editorial serif titles, mono metadata. Snap points and handle behavior unchanged.
- `FieldKitDrawer`: expedition-folio chrome — same header/tab structure, redressed. GPX import/export buttons become `InkButton`s. All handlers untouched.
- `InventoryUnavailable`: red-inked stamp + honest copy preserved verbatim. Nothing softened.
- `MethodologyDrawer`: kept as inset panel styling.
- `PwaShell` toasts (offline / update-ready): repainted as small printed telegrams (double-rule, mono type, vermilion for update-ready, cobalt for offline). Visibility increased, aria-live intact.

## 6. Motion

- `PrintedTab` and `VintagePlacard`: 120ms lift on hover (translateY -1px + shadow).
- Selected route/marker: 300ms `stroke-dashoffset` ink draw, one-shot.
- Everything guarded by `@media (prefers-reduced-motion: reduce)`.

## 7. Validation gates I'll run before reporting done

1. `bun run typecheck` (or tsgo) — must pass.
2. `bun run test:stage-a`, `bun run test:gates` (Gates 1–4) — must all pass, zero changes to inputs.
3. `bun run build` — production build clean.
4. Playwright smoke: `/` and `/idaho` at 1440, 1024, 768, 390. Screenshot each, view each, and specifically check: header overflow, Idaho placard placement, right-rail density, map controls collision, bottom-sheet snaps on 390, blocked-inventory state visible, offline toast visible.
5. Manual trace: click a region → RegionCard updates; open Field Kit → import a tiny GPX fixture → export → verify byte-identical round trip through unchanged `field-kit-gpx.ts`.
6. Deep-link check: `/idaho?...` URL-state params still hydrate.

## 8. Files touched (expected)

**New (~10):** `src/components/atlas/PaperBackdrop.tsx`, `DoubleRuleFrame.tsx`, `VintagePlacard.tsx`, `HachurePattern.tsx`, `PrintedTab.tsx`, `InkButton.tsx`, `FieldMarker.ts`, `FieldIcons/{Elk,Bear,Tent,Lookout,Hiker,Pine,Compass}.tsx` (barrel), optional `src/data/western/decorative-waters.ts`.

**Modified (visual only, ~20):** `src/styles.css`, `src/routes/__root.tsx` (font `<link>`), `src/routes/index.tsx`, `src/routes/idaho.tsx`, all `src/components/western/*`, all `src/components/idaho/*` and `idaho/inventory/*` and `idaho/field-kit/*`, `src/components/layout/TopoBackdrop.tsx` (repurposed or replaced by `PaperBackdrop`), `src/components/brand/AtlasMark.tsx`, `src/components/pwa/PwaShell.tsx`.

**Untouched:** everything in `src/data/**` (except optional decorative-waters), `src/lib/**`, `src/hooks/**`, `scripts/**`, all tests, PWA manifest/SW, route loaders.

## 9. Deliverables at end

- Exact file list changed, tokens/primitives added, test + build results, commit SHA.
- Playwright screenshots at all four widths for both routes.
- Honest visual verdict + ≤ 3 residual refinements.
- **No publish.** Project stays private.

## Decisions I need from you

1. **(a) attach reference image, or (b) proceed from spec?**
2. **Cobalt waterways on the Western map** — okay to add a small non-authoritative `decorative-waters.ts` for visual composition (clearly labeled), or omit water on that map?
3. **Display font** — Bricolage Grotesque Bold (my pick, closer to modernized period slab), or Big Shoulders Display (more explicitly WPA-poster)?
4. Anything in section 1 ("stays untouched") you'd actually like me to touch?

Reply with answers + "build" and I'll execute.
