import { Search } from "lucide-react";
import type {
  FireshedInventoryCollection,
  NineClass,
} from "@/data/idaho/fireshed/schema";
import { NINE_CLASS_ORDER } from "@/data/idaho/fireshed/classes";
import type { InventoryFilterFamilies } from "./InventoryShell";

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
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
      {label}
    </button>
  );
}

function FamilyBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 font-field text-[9px] uppercase tracking-widest text-mineral">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function InventoryFilters({
  collection,
  query,
  onQuery,
  families,
  onToggle,
}: {
  collection: FireshedInventoryCollection;
  query: string;
  onQuery: (v: string) => void;
  families: InventoryFilterFamilies;
  onToggle: (family: keyof InventoryFilterFamilies, value: string) => void;
}) {
  const forestTypes = uniqueSorted(
    collection.features.map((f) => f.properties.ForestType),
  );
  const divisions = uniqueSorted(
    collection.features.map((f) => f.properties.Division),
  );
  const majRegions = uniqueSorted(
    collection.features.map((f) => f.properties.MajRegion),
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mineral"
          size={14}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search Fireshed_Name"
          className="w-full rounded-none border border-white/10 bg-spruce-deep/70 py-2 pl-9 pr-3 text-sm text-bone placeholder:text-mineral focus:border-ember/60 focus:outline-none focus:ring-2 focus:ring-ember/30"
          aria-label="Search firesheds"
        />
      </div>

      <FamilyBlock label="Nine_Class">
        {NINE_CLASS_ORDER.map((v) => (
          <Chip
            key={v}
            label={v}
            active={families.nineClass.has(v as NineClass)}
            onClick={() => onToggle("nineClass", v)}
          />
        ))}
      </FamilyBlock>

      <FamilyBlock label="ForestType">
        {forestTypes.map((v) => (
          <Chip
            key={v}
            label={v}
            active={families.forestType.has(v)}
            onClick={() => onToggle("forestType", v)}
          />
        ))}
      </FamilyBlock>

      <FamilyBlock label="Division">
        {divisions.map((v) => (
          <Chip
            key={v}
            label={v}
            active={families.division.has(v)}
            onClick={() => onToggle("division", v)}
          />
        ))}
      </FamilyBlock>

      <FamilyBlock label="MajRegion">
        {majRegions.map((v) => (
          <Chip
            key={v}
            label={v}
            active={families.majRegion.has(v)}
            onClick={() => onToggle("majRegion", v)}
          />
        ))}
      </FamilyBlock>
    </div>
  );
}