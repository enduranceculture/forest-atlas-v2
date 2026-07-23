import { Bookmark, X } from "lucide-react";
import type {
  FireshedInventoryFeature,
  FireshedProvenance,
} from "@/data/idaho/fireshed/schema";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5 last:border-b-0">
      <span className="font-field text-[9px] uppercase tracking-widest text-mineral">
        {label}
      </span>
      <span className="text-right text-sm text-bone">{value}</span>
    </div>
  );
}

export function InventoryDetail({
  feature,
  provenance,
  onClose,
  onSaveResearchRef,
  savedAsResearchRef,
}: {
  feature: FireshedInventoryFeature;
  provenance: FireshedProvenance;
  onClose: () => void;
  onSaveResearchRef?: (feature: FireshedInventoryFeature) => void;
  savedAsResearchRef?: boolean;
}) {
  const p = feature.properties;
  const fmtAcres = (n: number) => `${Math.round(n).toLocaleString()} ac`;
  const fmtSe = (n: number) => `± ${n.toFixed(1)}% standard error`;
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
            Fireshed · OBJECTID {p.OBJECTID}
          </div>
          <h3 className="mt-1 font-editorial text-xl leading-tight text-bone">
            {p.Fireshed_Name}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail"
          className="rounded-none p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 rounded-sm border border-white/10 bg-spruce-deep/50 p-3">
        <Row label="Mature acres" value={fmtAcres(p.MATURE_ACRES)} />
        <Row label="Mature SE" value={fmtSe(p.MATURE_SE_PERC)} />
        <Row label="Old-growth acres" value={fmtAcres(p.OLD_GROWTH_ACRES)} />
        <Row label="Old-growth SE" value={fmtSe(p.OLD_GROWTH_SE_PERC)} />
        <Row label="Nine_Class" value={p.Nine_Class} />
        <Row label="ForestType" value={p.ForestType} />
        <Row label="Division" value={p.Division} />
        <Row label="MajRegion" value={p.MajRegion} />
        <Row label="Trimmed_Area" value={fmtAcres(p.Trimmed_Area)} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-bone-dim">
        Landscape estimate from national FIA plot summaries — <em>not</em> a
        surveyed stand. SE values are percent{" "}
        <span className="text-bone">standard error</span>, not confidence
        intervals or accuracy. Polygon is preserved as-published; firesheds may
        cross state lines.
      </p>
      <p className="mt-2 font-field text-[10px] uppercase tracking-widest text-mineral">
        Source: {provenance.source.layerName} · retrieved {provenance.retrievedAt}
      </p>
      {onSaveResearchRef && (
        <div className="mt-4">
          <button
            onClick={() => onSaveResearchRef(feature)}
            disabled={savedAsResearchRef}
            className="inline-flex items-center gap-1.5 rounded-none border border-white/15 bg-spruce-deep/70 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/30 disabled:opacity-60"
          >
            <Bookmark size={12} />
            {savedAsResearchRef ? "Saved to Field Kit" : "Save as research reference"}
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-mineral">
            Reference only — inventory firesheds are never exported as
            navigable route data.
          </p>
        </div>
      )}
    </div>
  );
}