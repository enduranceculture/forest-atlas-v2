import { AlertOctagon, BookOpen, MapPin, RefreshCw } from "lucide-react";
import type { DatasetStatus } from "@/data/dataset-status";

// Beautiful, deliberate "blocked upstream" state. Sits on top of the map
// shell so users still see the basemap + context; the mode switch remains
// visible in the header so they can move to Field Sites immediately.
export function InventoryUnavailable({
  status,
  onSwitchToSites,
  onOpenMethodology,
}: {
  status: Extract<
    DatasetStatus,
    { kind: "blocked-upstream" | "invalid" | "unavailable" | "syncing" }
  >;
  onSwitchToSites: () => void;
  onOpenMethodology: () => void;
}) {
  const isBlocked = status.kind === "blocked-upstream";
  const isSyncing = status.kind === "syncing";

  return (
    <div className="pointer-events-auto absolute inset-0 z-[600] flex items-center justify-center bg-gradient-to-b from-spruce-deep/85 via-spruce-deep/70 to-spruce-deep/85 px-4 py-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-spruce/90 p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <RefreshCw size={13} className="animate-spin text-mineral" />
          ) : (
            <AlertOctagon size={13} className="text-ember" />
          )}
          <span className="font-field text-[10px] uppercase tracking-widest text-mineral">
            {isBlocked
              ? "Landscape Inventory · Upstream unavailable"
              : isSyncing
              ? "Landscape Inventory · Syncing"
              : "Landscape Inventory · Unavailable"}
          </span>
        </div>

        <h2 className="mt-4 font-editorial text-2xl leading-tight text-bone">
          {isBlocked
            ? "USDA Layer 29 is refusing record retrieval."
            : isSyncing
            ? "Fetching the latest snapshot…"
            : "This dataset can’t be shown right now."}
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-bone-dim">
          <p>
            The official source for this view is the{" "}
            <span className="text-bone">{status.sourceLabel}</span>.
          </p>
          {isBlocked && (
            <p>
              Every spatial and OBJECTID query to the service is currently returning{" "}
              <code className="font-field text-xs text-bone">HTTP 400 “Failed to execute query.”</code>{" "}
              We are not substituting an alternate dataset, and we are not
              rendering a fabricated inventory in its place.
            </p>
          )}
          {status.kind === "invalid" && (
            <p>
              The bundled snapshot failed schema validation. The app refuses to
              render polygons that don’t match the source contract.
            </p>
          )}
          <p>
            The <span className="text-bone">Field Sites</span> dataset is a
            separate, hand-authored fixture and remains fully available.
          </p>
          {isBlocked && status.lastAttemptAt && (
            <p className="font-field text-[10px] uppercase tracking-widest text-mineral">
              Last sync attempt: {status.lastAttemptAt}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={onSwitchToSites}
            className="inline-flex items-center gap-1.5 rounded-full border border-ember/50 bg-ember/15 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/25 focus:outline-none focus:ring-2 focus:ring-ember"
          >
            <MapPin size={12} /> Switch to Field Sites
          </button>
          <button
            onClick={onOpenMethodology}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-spruce-deep/70 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-ember"
          >
            <BookOpen size={12} /> Methodology
          </button>
        </div>
      </div>
    </div>
  );
}