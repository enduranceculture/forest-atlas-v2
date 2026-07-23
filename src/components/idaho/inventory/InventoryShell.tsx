// Ready-state Landscape Inventory experience. This subtree is intentionally
// NEVER exercised at runtime while the USDA snapshot is blocked upstream —
// its inputs are gated behind resolveInventoryStatus() === "ready". Building
// it now gives Gate 2 an architectural surface Issue #2 can flip into once
// Layer 29 recovers, without shipping any fabricated production data.
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FireshedInventoryCollection,
  FireshedInventoryFeature,
  FireshedProvenance,
  NineClass,
} from "@/data/idaho/fireshed/schema";
import type { IdahoSearch } from "@/lib/url-state";
import { parseCsv, toCsv } from "@/lib/url-state";
import { InventoryFilters } from "./InventoryFilters";
import { InventoryList } from "./InventoryList";
import { InventoryDetail } from "./InventoryDetail";

export type InventoryFilterFamilies = {
  nineClass: Set<NineClass>;
  forestType: Set<string>;
  division: Set<string>;
  majRegion: Set<string>;
};

// Feature matching: OR within families, AND across families.
export function matchInventoryFeature(
  f: FireshedInventoryFeature,
  query: string,
  fams: InventoryFilterFamilies,
): boolean {
  const p = f.properties;
  if (fams.nineClass.size > 0 && !fams.nineClass.has(p.Nine_Class)) return false;
  if (fams.forestType.size > 0 && !fams.forestType.has(p.ForestType)) return false;
  if (fams.division.size > 0 && !fams.division.has(p.Division)) return false;
  if (fams.majRegion.size > 0 && !fams.majRegion.has(p.MajRegion)) return false;
  if (query) {
    const q = query.toLowerCase();
    if (!p.Fireshed_Name.toLowerCase().includes(q)) return false;
  }
  return true;
}

export function InventoryShell({
  collection,
  provenance,
  search,
  onUpdateSearch,
  onOpenMethodology,
  onSaveResearchRef,
  savedResearchOids,
}: {
  collection: FireshedInventoryCollection;
  provenance: FireshedProvenance;
  search: IdahoSearch;
  onUpdateSearch: (patch: Partial<IdahoSearch>) => void;
  onOpenMethodology: () => void;
  onSaveResearchRef?: (feature: FireshedInventoryFeature) => void;
  savedResearchOids?: Set<number>;
}) {
  const families: InventoryFilterFamilies = useMemo(
    () => ({
      nineClass: new Set(parseCsv(search.ninec) as NineClass[]),
      forestType: new Set(parseCsv(search.ftype)),
      division: new Set(parseCsv(search.div)),
      majRegion: new Set(parseCsv(search.reg)),
    }),
    [search.ninec, search.ftype, search.div, search.reg],
  );

  const filtered = useMemo(
    () =>
      collection.features.filter((f) =>
        matchInventoryFeature(f, search.q, families),
      ),
    [collection.features, search.q, families],
  );

  const selected: FireshedInventoryFeature | null = useMemo(() => {
    if (!search.sel) return null;
    const oid = Number(search.sel);
    if (!Number.isFinite(oid)) return null;
    return (
      collection.features.find((f) => f.properties.OBJECTID === oid) ?? null
    );
  }, [collection.features, search.sel]);

  const [hoverId, setHoverId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (selected || hoverId != null)) {
        setHoverId(null);
        if (selected) onUpdateSearch({ sel: "" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, hoverId, onUpdateSearch]);

  const toggleFamily = useCallback(
    (family: keyof InventoryFilterFamilies, value: string) => {
      const key =
        family === "nineClass"
          ? "ninec"
          : family === "forestType"
          ? "ftype"
          : family === "division"
          ? "div"
          : "reg";
      const cur = new Set(parseCsv(search[key]));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      onUpdateSearch({ [key]: toCsv(Array.from(cur)) } as Partial<IdahoSearch>);
    },
    [search, onUpdateSearch],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-white/5 p-4">
        <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
          {filtered.length} / {collection.features.length} firesheds
        </div>
        <InventoryFilters
          collection={collection}
          query={search.q}
          onQuery={(q) => onUpdateSearch({ q })}
          families={families}
          onToggle={toggleFamily}
        />
        <button
          onClick={onOpenMethodology}
          className="font-field text-[10px] uppercase tracking-widest text-mineral underline-offset-4 hover:text-bone hover:underline"
        >
          Source &amp; methodology
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <InventoryList
          features={filtered}
          selectedId={selected?.properties.OBJECTID ?? null}
          hoverId={hoverId}
          onSelect={(f) =>
            onUpdateSearch({ sel: String(f.properties.OBJECTID) })
          }
          onHover={(id) => setHoverId(id)}
        />
      </div>
      {selected && (
        <div className="max-h-[45vh] shrink-0 overflow-y-auto border-t border-white/5">
          <InventoryDetail
            feature={selected}
            provenance={provenance}
            onClose={() => onUpdateSearch({ sel: "" })}
            onSaveResearchRef={onSaveResearchRef}
            savedAsResearchRef={
              savedResearchOids?.has(selected.properties.OBJECTID) ?? false
            }
          />
        </div>
      )}
    </div>
  );
}