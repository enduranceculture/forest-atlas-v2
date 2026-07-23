import { Info } from "lucide-react";
import type { DatasetStatus } from "@/data/dataset-status";

// Visible-but-tasteful status strip for the Field Sites (fixture) dataset.
export function FixtureStatusStrip({
  status,
  onOpenMethodology,
}: {
  status: DatasetStatus;
  onOpenMethodology?: () => void;
}) {
  if (status.kind !== "fixture") return null;
  return (
    <div className="flex items-start gap-2 rounded-sm border border-white/10 bg-spruce-deep/60 px-3 py-2 text-xs text-bone-dim">
      <Info size={13} className="mt-0.5 shrink-0 text-mineral" />
      <div className="min-w-0 flex-1">
        <div className="font-field text-[9px] uppercase tracking-widest text-mineral">
          Fixture data · {status.count} placeholder waypoints
        </div>
        <div className="mt-0.5 leading-relaxed">
          Hand-authored placeholders — not surveyed coordinates.{" "}
          {onOpenMethodology && (
            <button
              onClick={onOpenMethodology}
              className="rounded text-ember-soft underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ember/40"
            >
              Read methodology
            </button>
          )}
        </div>
      </div>
    </div>
  );
}