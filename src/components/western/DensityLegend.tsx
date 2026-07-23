import { DENSITY_SCALE } from "@/data/western/density";

export function DensityLegend() {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-editorial text-sm text-bone">Density</h3>
        <span className="font-field text-[10px] uppercase tracking-widest text-mineral">1 → 9</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-white/10">
        {DENSITY_SCALE.map((d) => (
          <div key={d.class} className="flex-1" style={{ background: d.token }} title={d.label} />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-field text-[10px] uppercase tracking-wider text-mineral">
        <span>Sparse mature</span>
        <span>Primary old-growth</span>
      </div>
    </div>
  );
}