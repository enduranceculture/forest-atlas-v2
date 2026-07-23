import type { RegionFeature } from "@/data/schema";
import { densityColor, densityLabel } from "@/data/western/density";

export function RegionCard({ region }: { region: RegionFeature | null }) {
  if (!region) {
    return (
      <div className="rounded-2xl border border-white/10 bg-spruce/60 p-5">
        <p className="font-editorial text-lg leading-snug text-bone">
          Hover or tap a region to read its field note.
        </p>
        <p className="mt-2 font-field text-[11px] uppercase tracking-widest text-mineral">
          Idaho is highlighted — open the field explorer for waypoint detail.
        </p>
      </div>
    );
  }
  const { name, state, densityClass, summary, fireshed } = region.properties;
  return (
    <div className="rounded-2xl border border-white/10 bg-spruce/70 p-5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/10" style={{ background: densityColor(densityClass) }} />
        <span className="font-field text-[10px] uppercase tracking-widest text-mineral">{state} · Class {densityClass}</span>
      </div>
      <h2 className="mt-2 font-editorial text-2xl leading-tight text-bone">{name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-bone-dim">{summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 font-field text-[11px] uppercase tracking-wider text-mineral">
        <div>
          <dt>Density</dt>
          <dd className="mt-0.5 normal-case tracking-normal text-bone">{densityLabel(densityClass)}</dd>
        </div>
        {fireshed && (
          <div>
            <dt>Fireshed</dt>
            <dd className="mt-0.5 normal-case tracking-normal text-bone">{fireshed}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}