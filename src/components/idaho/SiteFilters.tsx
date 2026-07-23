import { Search } from "lucide-react";
import type { Category, Confidence, PrecisionClass, SourceType } from "@/data/schema";
import {
  ALL_CATEGORIES,
  ALL_PRECISION,
  ALL_SOURCE_TYPES,
  CATEGORY_META,
  PRECISION_META,
  SOURCE_TYPE_LABEL,
} from "@/data/idaho/categories";

export type FilterState = {
  categories: Set<Category>;
  confidences: Set<Confidence>;
  precisions: Set<PrecisionClass>;
  sources: Set<SourceType>;
};

const ALL_CONFIDENCES: Confidence[] = ["High", "Medium", "Low"];

function Chip({
  active,
  onClick,
  swatch,
  label,
}: {
  active: boolean;
  onClick: () => void;
  swatch?: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 font-field text-[10px] uppercase tracking-wider transition ${
        active
          ? "border-ember/60 bg-ember/15 text-ember-soft"
          : "border-white/10 text-mineral hover:border-white/25 hover:text-bone"
      }`}
    >
      {swatch && <span className="h-2 w-2 rounded-none" style={{ background: swatch }} />}
      {label}
    </button>
  );
}

export function SiteFilters({
  state,
  onToggle,
  query,
  onQuery,
}: {
  state: FilterState;
  onToggle: (kind: keyof FilterState, value: string) => void;
  query: string;
  onQuery: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mineral" size={14} />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, species, region, source, notes"
          className="w-full rounded-none border border-white/10 bg-spruce-deep/70 py-2 pl-9 pr-3 text-sm text-bone placeholder:text-mineral focus:border-ember/60 focus:outline-none focus:ring-2 focus:ring-ember/30"
          aria-label="Search waypoints"
        />
      </div>

      <div>
        <div className="mb-1.5 font-field text-[9px] uppercase tracking-widest text-mineral">Category</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              swatch={CATEGORY_META[c].color}
              active={state.categories.has(c)}
              onClick={() => onToggle("categories", c)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 font-field text-[9px] uppercase tracking-widest text-mineral">Confidence</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CONFIDENCES.map((c) => (
            <Chip key={c} label={c} active={state.confidences.has(c)} onClick={() => onToggle("confidences", c)} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 font-field text-[9px] uppercase tracking-widest text-mineral">Precision</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PRECISION.map((p) => (
            <Chip
              key={p}
              label={PRECISION_META[p].short}
              swatch={PRECISION_META[p].color}
              active={state.precisions.has(p)}
              onClick={() => onToggle("precisions", p)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 font-field text-[9px] uppercase tracking-widest text-mineral">Source</div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SOURCE_TYPES.map((s) => (
            <Chip
              key={s}
              label={SOURCE_TYPE_LABEL[s]}
              active={state.sources.has(s)}
              onClick={() => onToggle("sources", s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}