import { createFileRoute, Link } from "@tanstack/react-router";
import { stripSearchParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Briefcase, X } from "lucide-react";
import type {
  Category,
  Confidence,
  ImportedBundle,
  PrecisionClass,
  SourceType,
  Waypoint,
} from "@/data/schema";
import { IDAHO_WAYPOINTS } from "@/data/idaho/waypoints";
import { validateWaypoints } from "@/data/validate";
import { AtlasMark } from "@/components/brand/AtlasMark";
import { IdahoMap } from "@/components/idaho/IdahoMap";
import type { Basemap, LayerFlags } from "@/components/idaho/IdahoMapClient";
import { SiteFilters, type FilterState } from "@/components/idaho/SiteFilters";
import { SiteList } from "@/components/idaho/SiteList";
import { WaypointDetail } from "@/components/idaho/WaypointDetail";
import { BottomSheet } from "@/components/idaho/BottomSheet";
import { BasemapSwitcher, LayerToggles, MapActionButtons } from "@/components/idaho/MapControls";
import { ImportPanel } from "@/components/idaho/ImportPanel";
import { MethodologyDrawer } from "@/components/idaho/MethodologyDrawer";
import { AtlasUnavailable } from "@/components/western/AtlasUnavailable";
import { DatasetSwitch } from "@/components/idaho/DatasetSwitch";
import { FixtureStatusStrip } from "@/components/idaho/FixtureStatusStrip";
import { InventoryUnavailable } from "@/components/idaho/inventory/InventoryUnavailable";
import { InventoryShell } from "@/components/idaho/inventory/InventoryShell";
import { FieldKitDrawer } from "@/components/idaho/field-kit/FieldKitDrawer";
import { useFieldKit } from "@/hooks/use-field-kit";
import {
  IDAHO_SEARCH_DEFAULTS,
  formatMapView,
  idahoSearchSchema,
  isLayerHidden,
  parseCsv,
  parseMapView,
  toCsv,
  toggleInCsv,
  type IdahoBasemap,
  type IdahoMode,
  type IdahoSearch,
  type MapView,
} from "@/lib/url-state";
import {
  resolveFieldSitesStatus,
  resolveInventoryStatus,
} from "@/data/dataset-status";
import { fireshedInventory } from "@/data/idaho/fireshed";
import type { FireshedInventoryFeature } from "@/data/idaho/fireshed/schema";

export const Route = createFileRoute("/idaho")({
  validateSearch: (input: Record<string, unknown>): IdahoSearch =>
    idahoSearchSchema.parse(input),
  search: {
    middlewares: [stripSearchParams(IDAHO_SEARCH_DEFAULTS)],
  },
  head: () => ({
    meta: [
      { title: "Idaho Field Explorer — Forest Atlas · West" },
      { name: "description", content: "Interactive field guide to significant forest sites and trees across Idaho." },
      { property: "og:title", content: "Idaho Field Explorer — Forest Atlas · West" },
      { property: "og:description", content: "Interactive field guide to significant forest sites and trees across Idaho." },
    ],
  }),
  component: IdahoPage,
});

function IdahoPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const result = validateWaypoints(IDAHO_WAYPOINTS);
  const kit = useFieldKit();

  const sitesStatus = useMemo(() => resolveFieldSitesStatus(), []);
  const inventoryStatus = useMemo(() => resolveInventoryStatus(), []);

  const mode: IdahoMode = search.mode;
  const basemap: Basemap = search.basemap as IdahoBasemap;
  const initialView: MapView | null = useMemo(
    () => parseMapView(search.c),
    // Only resolve initial view once — subsequent URL updates from map moves
    // shouldn't refit. We depend on empty deps to lock the mount-time value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const layers: LayerFlags = useMemo(
    () => ({
      sites: !isLayerHidden(search.hide, "sites"),
      halos: !isLayerHidden(search.hide, "halos"),
      imports: !isLayerHidden(search.hide, "imports"),
      context: !isLayerHidden(search.hide, "context"),
    }),
    [search.hide],
  );

  const filters: FilterState = useMemo(
    () => ({
      categories: new Set(parseCsv(search.cats) as Category[]),
      confidences: new Set(parseCsv(search.conf) as Confidence[]),
      precisions: new Set(parseCsv(search.prec) as PrecisionClass[]),
      sources: new Set(parseCsv(search.src) as SourceType[]),
    }),
    [search.cats, search.conf, search.prec, search.src],
  );

  const updateSearch = useCallback(
    (patch: Partial<IdahoSearch>, opts?: { replace?: boolean }) => {
      navigate({
        to: ".",
        search: (prev: IdahoSearch) => ({ ...prev, ...patch }),
        replace: opts?.replace ?? false,
      });
    },
    [navigate],
  );

  const [sheet, setSheet] = useState<"peek" | "half" | "full">("peek");
  const [mobileTab, setMobileTab] = useState<"sites" | "imports">("sites");
  const [imports, setImports] = useState<ImportedBundle[]>([]);
  const [locateKey, setLocateKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [inventoryHoverOid, setInventoryHoverOid] = useState<number | null>(null);
  const [kitOpen, setKitOpen] = useState(false);
  const [mobileTabExtra, setMobileTabExtra] = useState<null | "kit">(null);
  void mobileTabExtra;

  // Resolve selected waypoint from URL; unknown IDs fail gracefully.
  const selected: Waypoint | null = useMemo(() => {
    if (mode !== "sites" || !result.ok) return null;
    if (!search.sel) return null;
    return result.data.find((w) => w.id === search.sel) ?? null;
  }, [mode, result, search.sel]);

  // Sync URL `col` with active kit collection when both are known and differ.
  useEffect(() => {
    if (!kit.ready) return;
    const activeId = kit.active?.id ?? "";
    if (search.col !== activeId) {
      // If URL has a col that matches an existing collection, adopt it.
      if (search.col && kit.snapshot.collections.some((c) => c.id === search.col)) {
        kit.setActive(search.col);
      } else if (activeId) {
        updateSearch({ col: activeId }, { replace: true });
      } else if (search.col) {
        // Stale col in URL — drop silently.
        updateSearch({ col: "" }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit.ready, kit.active?.id, kit.snapshot.collections.length, search.col]);

  const savedResearchOids = useMemo(() => {
    const s = new Set<number>();
    if (!kit.active) return s;
    for (const r of kit.active.researchRefs) {
      if (r.kind === "inventory-fireshed") {
        const n = Number(r.publicId);
        if (Number.isFinite(n)) s.add(n);
      }
    }
    return s;
  }, [kit.active]);

  const activeSiteIds = useMemo(() => {
    const s = new Set<string>();
    if (!kit.active) return s;
    for (const st of kit.active.stops) {
      if (st.kind === "site" && st.publicId) s.add(st.publicId);
    }
    return s;
  }, [kit.active]);

  const addSiteToKit = useCallback(
    (w: Waypoint) => {
      const r = kit.addSiteStop(w);
      setToast(
        r.existed ? `“${w.name}” is already in this kit.` : `Added “${w.name}” to Field Kit.`,
      );
    },
    [kit],
  );

  const addFireshedRef = useCallback(
    (feature: FireshedInventoryFeature) => {
      const r = kit.addResearchRef({
        kind: "inventory-fireshed",
        publicId: String(feature.properties.OBJECTID),
        label: feature.properties.Fireshed_Name,
      });
      setToast(
        r.existed
          ? "Already saved as a research reference."
          : `Saved “${feature.properties.Fireshed_Name}” as a research reference.`,
      );
    },
    [kit],
  );

  const viewAllOnMap = useCallback(
    (points: { lat: number; lon: number }[] | null) => {
      if (!points || points.length === 0) return;
      const lats = points.map((p) => p.lat);
      const lons = points.map((p) => p.lon);
      const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
      updateSearch({ c: formatMapView({ lat, lon, zoom: 7 }) });
      setResetKey((k) => k + 1);
    },
    [updateSearch],
  );

  // Mobile sheet snap → CSS var consumed by styles.css to lift leaflet
  // attribution + scale above the sheet's top edge.
  const sheetOffset = sheet === "peek" ? "22vh" : sheet === "half" ? "56vh" : "90vh";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (!result.ok) return [];
    const q = search.q.trim().toLowerCase();
    return result.data.filter((w) => {
      if (filters.categories.size > 0 && !filters.categories.has(w.category)) return false;
      if (filters.confidences.size > 0 && !filters.confidences.has(w.confidence)) return false;
      if (filters.precisions.size > 0 && !filters.precisions.has(w.precision)) return false;
      if (filters.sources.size > 0 && !filters.sources.has(w.sourceType)) return false;
      if (!q) return true;
      return [w.name, w.species, w.region, w.sourceName, w.notes ?? ""]
        .some((s) => s.toLowerCase().includes(q));
    });
  }, [result, filters, search.q]);

  const toggleFilter = useCallback((kind: keyof FilterState, value: string) => {
    const csvKey =
      kind === "categories"
        ? "cats"
        : kind === "confidences"
        ? "conf"
        : kind === "precisions"
        ? "prec"
        : "src";
    updateSearch({ [csvKey]: toggleInCsv(search[csvKey], value) } as Partial<IdahoSearch>);
  }, [search, updateSearch]);

  const onSelect = (w: Waypoint) => {
    updateSearch({ sel: w.id });
    setSheet("half");
  };

  const clearAll = () => {
    updateSearch({ cats: "", conf: "", prec: "", src: "", q: "" });
  };

  const setBasemap = (b: Basemap) => updateSearch({ basemap: b as IdahoBasemap });
  const setLayers = (v: LayerFlags) => {
    const hidden: string[] = [];
    (["sites", "halos", "imports", "context"] as const).forEach((k) => {
      if (!v[k]) hidden.push(k);
    });
    updateSearch({ hide: toCsv(hidden) });
  };
  const setMode = (m: IdahoMode) => {
    // Clear selection when swapping datasets — IDs are dataset-scoped.
    updateSearch({ mode: m, sel: "" });
  };

  const hasFilters =
    filters.categories.size + filters.confidences.size + filters.precisions.size + filters.sources.size > 0 ||
    search.q.length > 0;

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-spruce-deep p-8">
        <AtlasUnavailable message={result.error} />
      </div>
    );
  }

  const inventoryReady =
    inventoryStatus.kind === "ready" && fireshedInventory.ok;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-spruce-deep text-bone">
      {/* Top bar */}
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            aria-label="Back to Western Atlas"
            title="Western Atlas"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2 py-1.5 font-field text-[10px] uppercase tracking-widest text-mineral transition hover:border-white/25 hover:text-bone sm:px-3"
          >
            <ArrowLeft size={12} />
            <span className="hidden sm:inline">Western Atlas</span>
          </Link>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <AtlasMark size={22} />
            <div className="truncate font-editorial text-sm text-bone">
              Idaho <span className="text-mineral">·</span>{" "}
              {mode === "inventory" ? "Landscape Inventory" : "Field Explorer"}
            </div>
          </div>
          <div className="ml-2 hidden md:block">
            <DatasetSwitch value={mode} onChange={setMode} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {mode === "sites" && (
            <div className="hidden font-field text-[10px] uppercase tracking-widest text-mineral sm:block">
              {filtered.length} / {result.data.length} sites
            </div>
          )}
          {mode === "inventory" && inventoryReady && (
            <div className="hidden font-field text-[10px] uppercase tracking-widest text-mineral sm:block">
              {fireshedInventory.ok ? fireshedInventory.collection.features.length : 0} firesheds
            </div>
          )}
          <button
            onClick={() => setKitOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-2.5 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/20 focus:outline-none focus:ring-2 focus:ring-ember sm:px-3"
          >
            <Briefcase size={12} />
            <span>Field Kit</span>
            {kit.active && kit.active.stops.length > 0 && (
              <span className="rounded-full bg-ember/30 px-1.5 py-0.5 text-[9px] text-bone sm:ml-1">
                {kit.active.stops.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMethodologyOpen(true)}
            aria-label="Methodology"
            title="Methodology"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2 py-1.5 font-field text-[10px] uppercase tracking-widest text-mineral transition hover:border-white/25 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember sm:px-3"
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">Methodology</span>
          </button>
        </div>
      </header>

      {/* Mobile dataset switch */}
      <div className="border-b border-white/5 bg-spruce/40 px-4 py-2 md:hidden">
        <DatasetSwitch value={mode} onChange={setMode} />
      </div>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left rail (desktop) */}
        <aside className="hidden w-[380px] min-h-0 shrink-0 flex-col border-r border-white/5 bg-spruce/50 md:flex">
          {mode === "sites" ? (
            <>
              <div className="max-h-[45vh] shrink-0 space-y-4 overflow-y-auto border-b border-white/5 p-4">
                <FixtureStatusStrip
                  status={sitesStatus}
                  onOpenMethodology={() => setMethodologyOpen(true)}
                />
                <SiteFilters
                  state={filters}
                  onToggle={toggleFilter}
                  query={search.q}
                  onQuery={(q) => updateSearch({ q })}
                />
                {hasFilters && (
                  <button
                    onClick={clearAll}
                    className="font-field text-[10px] uppercase tracking-widest text-mineral underline-offset-4 hover:text-bone hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <SiteList
                  waypoints={filtered}
                  selectedId={selected?.id ?? null}
                  hoverId={hoverId}
                  onSelect={onSelect}
                  onHover={setHoverId}
                  onClearFilters={clearAll}
                />
              </div>
              <div className="max-h-[35vh] shrink-0 overflow-y-auto border-t border-white/5 p-4">
                <ImportPanel
                  imports={imports}
                  filtered={filtered}
                  onImport={(b) => {
                    setImports((prev) => [...prev, b]);
                    setToast(`Imported ${b.waypoints.length} wpt · ${b.lines.length} lines from ${b.fileName}`);
                  }}
                  onRemove={(idx) => setImports((prev) => prev.filter((_, i) => i !== idx))}
                  onError={(msg) => setToast(msg)}
                  onAddBundleToKit={(b) => {
                    for (const w of b.waypoints) {
                      kit.addImportedWpt({
                        kind: "wpt",
                        name: w.name,
                        latitude: w.latitude,
                        longitude: w.longitude,
                        elevation: w.elevation,
                        time: w.time,
                        description: w.description,
                      });
                    }
                    for (const l of b.lines) {
                      kit.addImportedLine({
                        kind: "line",
                        lineKind: l.kind,
                        name: l.name,
                        coordinates: l.coordinates,
                      });
                    }
                    setToast(`Added ${b.waypoints.length + b.lines.length} imported item(s) to Field Kit.`);
                  }}
                />
              </div>
            </>
          ) : inventoryReady && fireshedInventory.ok ? (
            <InventoryShell
              collection={fireshedInventory.collection}
              provenance={fireshedInventory.provenance}
              search={search}
              onUpdateSearch={updateSearch}
              onOpenMethodology={() => setMethodologyOpen(true)}
              onSaveResearchRef={addFireshedRef}
              savedResearchOids={savedResearchOids}
            />
          ) : (
            <div className="flex h-full flex-col gap-3 p-4">
              <div className="rounded-xl border border-white/10 bg-spruce-deep/60 p-4 text-xs leading-relaxed text-bone-dim">
                <div className="font-field text-[10px] uppercase tracking-widest text-ember">
                  Landscape Inventory unavailable
                </div>
                <p className="mt-2">
                  The USDA source is currently refusing record retrieval. No substitute
                  or fixture inventory is being shown. Switch to Field Sites to keep exploring.
                </p>
                <button
                  onClick={() => setMode("sites")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ember/50 bg-ember/15 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/25 focus:outline-none focus:ring-2 focus:ring-ember"
                >
                  Switch to Field Sites
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Map */}
        <div
          className="relative min-w-0 flex-1"
          style={{ ["--sheet-offset" as string]: sheetOffset }}
        >
          <IdahoMap
            waypoints={mode === "sites" ? filtered : []}
            selectedId={mode === "sites" ? selected?.id ?? null : null}
            hoverId={mode === "sites" ? hoverId : null}
            onSelect={onSelect}
            onHover={setHoverId}
            basemap={basemap}
            layers={layers}
            imports={mode === "sites" ? imports : []}
            locateRequestKey={locateKey}
            onLocateError={(msg) => setToast(msg)}
            resetKey={resetKey}
            initialView={initialView}
            onViewChange={(v) => updateSearch({ c: formatMapView(v) }, { replace: true })}
            showSites={mode === "sites"}
            inventoryFeatures={
              mode === "inventory" && fireshedInventory.ok
                ? fireshedInventory.collection.features
                : undefined
            }
            inventorySelectedOid={
              mode === "inventory" && search.sel ? Number(search.sel) || null : null
            }
            inventoryHoverOid={mode === "inventory" ? inventoryHoverOid : null}
            onInventorySelect={(oid) => updateSearch({ sel: String(oid) })}
            onInventoryHover={setInventoryHoverOid}
          />

          {mode === "inventory" &&
            (inventoryStatus.kind === "blocked-upstream" ||
              inventoryStatus.kind === "invalid" ||
              inventoryStatus.kind === "unavailable" ||
              inventoryStatus.kind === "syncing") && (
              <InventoryUnavailable
                status={inventoryStatus}
                onSwitchToSites={() => setMode("sites")}
                onOpenMethodology={() => setMethodologyOpen(true)}
              />
            )}

          {/* Basemap switcher — top center, inset to clear layers (left) and zoom (right) on md+ */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center md:left-56 md:right-16">
            <BasemapSwitcher value={basemap} onChange={setBasemap} />
          </div>

          {/* Layer toggles — top-left (desktop) / below basemap (mobile) */}
          <div className="pointer-events-none absolute left-3 top-3 z-[500] hidden md:block">
            <LayerToggles value={layers} onChange={setLayers} />
          </div>
          <div className="pointer-events-none absolute left-3 top-14 z-[500] md:hidden">
            <LayerToggles value={layers} onChange={setLayers} />
          </div>

          {/* Locate + reset — bottom-right on desktop; on mobile lift above the sheet */}
          <div
            className="pointer-events-none absolute right-3 bottom-14 z-[500] map-action-buttons"
          >
            <MapActionButtons
              onLocate={() => setLocateKey((k) => k + 1)}
              onReset={() => {
                updateSearch({ sel: "", c: "" });
                setResetKey((k) => k + 1);
              }}
            />
          </div>

          {/* Selected detail (desktop overlay) */}
          {mode === "sites" && selected && (
            <div
              className="pointer-events-auto absolute right-4 top-4 z-[900] hidden w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-spruce/95 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur md:flex lg:right-16 xl:w-[420px]"
              style={{ maxHeight: "calc(100vh - 8rem)" }}
            >
              <WaypointDetail
                w={selected}
                onClose={() => updateSearch({ sel: "" })}
                onAddToKit={addSiteToKit}
                inKit={activeSiteIds.has(selected.id)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet snap={sheet} onSnapChange={setSheet}>
        {mode === "sites" && selected ? (
          <WaypointDetail
            w={selected}
            onClose={() => { updateSearch({ sel: "" }); setSheet("peek"); }}
            onAddToKit={addSiteToKit}
            inKit={activeSiteIds.has(selected.id)}
          />
        ) : mode === "inventory" ? (
          <div className="space-y-3">
            <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
              Landscape Inventory
            </div>
            <p className="text-sm text-bone-dim">
              {inventoryStatus.kind === "blocked-upstream"
                ? "USDA Layer 29 is currently refusing record retrieval. No fabricated inventory is being shown."
                : inventoryStatus.kind === "ready"
                ? "Tap a fireshed on the map to see its landscape estimate."
                : "Landscape Inventory is not available right now."}
            </p>
            <button
              onClick={() => setMode("sites")}
              className="inline-flex items-center gap-1.5 rounded-full border border-ember/50 bg-ember/15 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft"
            >
              Switch to Field Sites
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <FixtureStatusStrip
              status={sitesStatus}
              onOpenMethodology={() => setMethodologyOpen(true)}
            />
            <div className="flex gap-1.5" role="tablist">
              {(["sites", "imports"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={mobileTab === t}
                  onClick={() => setMobileTab(t)}
                  className={`rounded-full border px-3 py-1 font-field text-[10px] uppercase tracking-widest transition ${
                    mobileTab === t
                      ? "border-ember/60 bg-ember/15 text-ember-soft"
                      : "border-white/10 text-mineral"
                  }`}
                >
                  {t === "sites" ? "Sites" : "Import / Export"}
                </button>
              ))}
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="ml-auto self-center font-field text-[10px] uppercase tracking-widest text-mineral underline-offset-4 hover:text-bone hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {mobileTab === "sites" ? (
              <>
                <SiteFilters state={filters} onToggle={toggleFilter} query={search.q} onQuery={(q) => updateSearch({ q })} />
                <SiteList
                  waypoints={filtered}
                  selectedId={null}
                  hoverId={hoverId}
                  onSelect={onSelect}
                  onHover={setHoverId}
                  onClearFilters={clearAll}
                />
              </>
            ) : (
              <ImportPanel
                imports={imports}
                filtered={filtered}
                onImport={(b) => {
                  setImports((prev) => [...prev, b]);
                  setToast(`Imported ${b.waypoints.length} wpt · ${b.lines.length} lines`);
                }}
                onRemove={(idx) => setImports((prev) => prev.filter((_, i) => i !== idx))}
                onError={(msg) => setToast(msg)}
                onAddBundleToKit={(b) => {
                  for (const w of b.waypoints) {
                    kit.addImportedWpt({
                      kind: "wpt",
                      name: w.name,
                      latitude: w.latitude,
                      longitude: w.longitude,
                      elevation: w.elevation,
                      time: w.time,
                      description: w.description,
                    });
                  }
                  for (const l of b.lines) {
                    kit.addImportedLine({
                      kind: "line",
                      lineKind: l.kind,
                      name: l.name,
                      coordinates: l.coordinates,
                    });
                  }
                  setToast(`Added ${b.waypoints.length + b.lines.length} item(s) to Field Kit.`);
                }}
              />
            )}
          </div>
        )}
      </BottomSheet>

      {/* Methodology drawer */}
      <MethodologyDrawer
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
        waypoints={result.data}
        mode={mode}
        sitesStatus={sitesStatus}
        inventoryStatus={inventoryStatus}
      />

      {/* Field Kit drawer */}
      <FieldKitDrawer
        open={kitOpen}
        onClose={() => setKitOpen(false)}
        kit={kit}
        sites={result.ok ? result.data : []}
        search={search}
        onToast={(m) => setToast(m)}
        onViewAll={viewAllOnMap}
        onOpenImportedBundles={() => {
          // On desktop scroll the import panel into view; on mobile show the import tab.
          setMobileTab("imports");
          setSheet("half");
          setKitOpen(false);
          setToast(
            "Import GPX, then use each imported waypoint's Add-to-Kit action from the import list.",
          );
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="pointer-events-auto fixed bottom-6 left-1/2 z-[1300] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-spruce-deep/95 px-4 py-2 font-field text-[11px] text-bone shadow-lg backdrop-blur"
        >
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="rounded-full p-0.5 text-mineral hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// Unused imports guard: keep types referenced so tsc doesn't warn.
export type _IdahoTypesRef = Category | Confidence | PrecisionClass | SourceType;