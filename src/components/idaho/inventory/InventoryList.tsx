import type { FireshedInventoryFeature } from "@/data/idaho/fireshed/schema";

export function InventoryList({
  features,
  selectedId,
  hoverId,
  onSelect,
  onHover,
}: {
  features: FireshedInventoryFeature[];
  selectedId: number | null;
  hoverId: number | null;
  onSelect: (f: FireshedInventoryFeature) => void;
  onHover: (id: number | null) => void;
}) {
  if (features.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-white/15 bg-spruce/40 p-5 text-center">
        <p className="font-editorial text-base text-bone">No firesheds match.</p>
        <p className="mt-1 text-xs text-mineral">Loosen a filter or clear the search.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {features.map((f) => {
        const p = f.properties;
        const active = selectedId === p.OBJECTID;
        const hover = hoverId === p.OBJECTID;
        return (
          <li key={p.OBJECTID}>
            <button
              onClick={() => onSelect(f)}
              onFocus={() => onHover(p.OBJECTID)}
              onBlur={() => onHover(null)}
              onPointerEnter={() => onHover(p.OBJECTID)}
              onPointerLeave={() => onHover(null)}
              className={`w-full rounded-sm border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-ember ${
                active
                  ? "border-ember/60 bg-ember/10"
                  : hover
                  ? "border-white/20 bg-white/[0.03]"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-field text-[10px] uppercase tracking-widest text-mineral">
                  Nine_Class {p.Nine_Class} · {p.MajRegion}
                </span>
              </div>
              <div className="mt-1 font-editorial text-base leading-snug text-bone">
                {p.Fireshed_Name}
              </div>
              <div className="mt-0.5 text-xs text-mineral">
                {Math.round(p.MATURE_ACRES).toLocaleString()} mature ·{" "}
                {Math.round(p.OLD_GROWTH_ACRES).toLocaleString()} old-growth (acres)
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}