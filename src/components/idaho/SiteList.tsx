import type { Waypoint } from "@/data/schema";
import { CATEGORY_META, PRECISION_META } from "@/data/idaho/categories";

export function SiteList({ waypoints, selectedId, hoverId, onSelect, onHover, onClearFilters }: { waypoints: Waypoint[]; selectedId: string | null; hoverId: string | null; onSelect: (w: Waypoint) => void; onHover: (id: string | null) => void; onClearFilters?: () => void; }) {
  if (waypoints.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-spruce/40 p-5 text-center">
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-spruce-deep/70 font-field text-[11px] uppercase tracking-widest text-mineral">
          0
        </div>
        <p className="mt-3 font-editorial text-base text-bone">No sites match.</p>
        <p className="mt-1 text-xs leading-relaxed text-mineral">
          Try loosening a category, precision, or source filter — or clear the search.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/20 focus:outline-none focus:ring-2 focus:ring-ember"
          >
            Reset filters
          </button>
        )}
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {waypoints.map((w) => {
        const active = selectedId === w.id;
        const hover = hoverId === w.id;
        return (
          <li key={w.id}>
            <button onClick={() => onSelect(w)} onPointerEnter={() => onHover(w.id)} onPointerLeave={() => onHover(null)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${active ? "border-ember/60 bg-ember/10" : hover ? "border-white/20 bg-white/[0.03]" : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"}`}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_META[w.category].color }} />
                <span className="font-field text-[10px] uppercase tracking-widest text-mineral">{w.category} · {w.confidence}</span>
                <span
                  className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 font-field text-[9px] uppercase tracking-widest"
                  style={{ color: PRECISION_META[w.precision].color }}
                  title={PRECISION_META[w.precision].description}
                >
                  {PRECISION_META[w.precision].short}
                </span>
              </div>
              <div className="mt-1 font-editorial text-base leading-snug text-bone">{w.name}</div>
              <div className="mt-0.5 text-xs text-mineral">{w.region}</div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}