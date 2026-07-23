import { Crosshair, Layers, Map as MapIcon, RotateCcw } from "lucide-react";
import type { Basemap, LayerFlags } from "./IdahoMapClient";

const BASEMAP_LABEL: Record<Basemap, string> = {
  dark: "Dark",
  light: "Light",
  topo: "Topo",
};

export function BasemapSwitcher({
  value,
  onChange,
}: {
  value: Basemap;
  onChange: (b: Basemap) => void;
}) {
  return (
    <div
      className="pointer-events-auto flex overflow-hidden rounded-none border border-white/15 bg-spruce-deep/90 backdrop-blur"
      role="radiogroup"
      aria-label="Basemap style"
    >
      {(["dark", "light", "topo"] as Basemap[]).map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          role="radio"
          aria-checked={value === b}
          className={`px-3 py-1.5 font-field text-[10px] uppercase tracking-widest transition ${
            value === b ? "bg-ember/25 text-ember-soft" : "text-mineral hover:text-bone"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <MapIcon size={11} /> {BASEMAP_LABEL[b]}
          </span>
        </button>
      ))}
    </div>
  );
}

export function LayerToggles({
  value,
  onChange,
}: {
  value: LayerFlags;
  onChange: (v: LayerFlags) => void;
}) {
  const items: Array<{ key: keyof LayerFlags; label: string }> = [
    { key: "sites", label: "Sites" },
    { key: "halos", label: "Uncertainty halos" },
    { key: "imports", label: "Field imports" },
    { key: "context", label: "Forest context" },
  ];
  return (
    <div className="pointer-events-auto rounded-sm border border-white/15 bg-spruce-deep/90 p-3 backdrop-blur">
      <div className="mb-1.5 flex items-center gap-1.5 font-field text-[9px] uppercase tracking-widest text-mineral">
        <Layers size={11} /> Layers
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <label key={it.key} className="flex cursor-pointer items-center gap-2 text-xs text-bone">
            <input
              type="checkbox"
              checked={value[it.key]}
              onChange={(e) => onChange({ ...value, [it.key]: e.target.checked })}
              className="h-3.5 w-3.5 accent-[var(--ember)]"
            />
            {it.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function MapActionButtons({
  onLocate,
  onReset,
}: {
  onLocate: () => void;
  onReset: () => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-col gap-1.5">
      <button
        onClick={onLocate}
        className="inline-flex items-center justify-center gap-1.5 rounded-none border border-white/15 bg-spruce-deep/90 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone backdrop-blur hover:bg-spruce focus:outline-none focus:ring-2 focus:ring-ember"
        aria-label="Locate me"
      >
        <Crosshair size={12} /> Locate
      </button>
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-1.5 rounded-none border border-white/15 bg-spruce-deep/90 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone backdrop-blur hover:bg-spruce focus:outline-none focus:ring-2 focus:ring-ember"
        aria-label="Reset map extent"
      >
        <RotateCcw size={12} /> Reset
      </button>
    </div>
  );
}