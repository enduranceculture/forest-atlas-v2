import { useEffect } from "react";
import { X } from "lucide-react";
import type { Waypoint } from "@/data/schema";
import { PRECISION_META, SOURCE_TYPE_LABEL } from "@/data/idaho/categories";
import type { DatasetStatus } from "@/data/dataset-status";
import type { IdahoMode } from "@/lib/url-state";

export function MethodologyDrawer({
  open,
  onClose,
  waypoints,
  mode,
  sitesStatus,
  inventoryStatus,
}: {
  open: boolean;
  onClose: () => void;
  waypoints: Waypoint[];
  mode: IdahoMode;
  sitesStatus: DatasetStatus;
  inventoryStatus: DatasetStatus;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const total = waypoints.length;
  const byPrecision = { exact: 0, approximate: 0, "site-center": 0 } as Record<Waypoint["precision"], number>;
  const bySource: Record<Waypoint["sourceType"], number> = { fixture: 0, documented: 0, "user-import": 0, "field-note": 0 };
  for (const w of waypoints) {
    byPrecision[w.precision] += 1;
    bySource[w.sourceType] += 1;
  }
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <>
      <div
        className={`fixed inset-0 z-[1200] bg-black/60 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-[1201] flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-spruce-deep p-8 transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <span className="font-field text-[10px] uppercase tracking-widest text-mineral">
            Methodology · {mode === "inventory" ? "Landscape Inventory" : "Field Sites"}
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
            aria-label="Close methodology"
          >
            <X size={18} />
          </button>
        </div>

        {mode === "inventory" && (
          <div className="mt-6 space-y-3">
            <h2 className="font-editorial text-3xl leading-tight text-bone">
              USDA Fireshed Landscape Inventory.
            </h2>
            <p className="text-sm leading-relaxed text-bone-dim">
              Source of truth: <span className="text-bone">{inventoryStatus.sourceLabel}</span>.
              Preserved fields include <code className="font-field text-xs text-bone">Fireshed_Name</code>,{" "}
              <code className="font-field text-xs text-bone">MATURE_ACRES</code>,{" "}
              <code className="font-field text-xs text-bone">MATURE_SE_PERC</code>,{" "}
              <code className="font-field text-xs text-bone">OLD_GROWTH_ACRES</code>,{" "}
              <code className="font-field text-xs text-bone">OLD_GROWTH_SE_PERC</code>,{" "}
              <code className="font-field text-xs text-bone">Nine_Class</code>,{" "}
              <code className="font-field text-xs text-bone">ForestType</code>,{" "}
              <code className="font-field text-xs text-bone">Division</code>, and{" "}
              <code className="font-field text-xs text-bone">MajRegion</code>. SE values are
              <em> percent standard error</em>, not confidence intervals or accuracy figures.
            </p>
            <p className="text-sm leading-relaxed text-bone-dim">
              Firesheds are national-scale landscape estimates and may cross state lines. Polygons
              are preserved as-published — no clipping, no simplification. This app never queries
              the USDA service at runtime.
            </p>
            <div className="rounded-xl border border-white/10 bg-spruce/50 p-3 text-xs leading-relaxed text-bone-dim">
              <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                Current status
              </div>
              <div className="mt-1 text-bone">
                {inventoryStatus.kind === "ready"
                  ? `Ready · ${inventoryStatus.count.toLocaleString()} features · retrieved ${inventoryStatus.retrievedAt}`
                  : inventoryStatus.kind === "blocked-upstream"
                  ? "Blocked upstream — Layer 29 refuses record retrieval."
                  : inventoryStatus.kind === "invalid"
                  ? "Bundled snapshot failed schema validation."
                  : inventoryStatus.kind === "syncing"
                  ? "Fetching a fresh snapshot."
                  : "Unavailable."}
              </div>
            </div>
          </div>
        )}

        {mode === "sites" && (
          <>
        <h2 className="mt-6 font-editorial text-3xl leading-tight text-bone">How to read these coordinates.</h2>
        <p className="mt-3 text-sm leading-relaxed text-bone-dim">
          Every waypoint carries a <em>precision</em> label. It tells you what the coordinate actually represents —
          not how nice the map looks. Never treat a rendered pin as a survey.
        </p>

        <h3 className="mt-8 font-editorial text-lg text-bone">Precision classes</h3>
        <dl className="mt-3 space-y-3 text-sm text-bone-dim">
          {(Object.keys(PRECISION_META) as Waypoint["precision"][]).map((p) => (
            <div key={p} className="rounded-xl border border-white/10 bg-spruce/50 p-3">
              <dt className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: PRECISION_META[p].color }} />
                <span className="font-field text-[10px] uppercase tracking-widest" style={{ color: PRECISION_META[p].color }}>
                  {PRECISION_META[p].short}
                </span>
                <span className="text-bone">{PRECISION_META[p].label}</span>
              </dt>
              <dd className="mt-1 text-xs">{PRECISION_META[p].description}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 font-editorial text-lg text-bone">Data quality summary</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {(["exact", "approximate", "site-center"] as Waypoint["precision"][]).map((p) => (
            <div key={p} className="rounded-xl border border-white/10 bg-spruce/60 p-3">
              <div className="font-editorial text-2xl text-bone">{byPrecision[p]}</div>
              <div className="mt-1 font-field text-[9px] uppercase tracking-widest text-mineral">
                {PRECISION_META[p].short} · {pct(byPrecision[p])}%
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(Object.keys(bySource) as Waypoint["sourceType"][]).map((s) => (
            <div key={s} className="rounded-xl border border-white/10 bg-spruce/40 p-3">
              <div className="font-field text-[9px] uppercase tracking-widest text-mineral">{SOURCE_TYPE_LABEL[s]}</div>
              <div className="mt-1 font-editorial text-lg text-bone">{bySource[s]}</div>
            </div>
          ))}
        </div>

        <h3 className="mt-8 font-editorial text-lg text-bone">GPX import & export</h3>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
          Imports are parsed locally in your browser tab. Nothing is uploaded to a server or persisted between
          sessions. Exports embed provenance and precision in the GPX <code className="font-field text-xs text-bone">&lt;desc&gt;</code>,{" "}
          <code className="font-field text-xs text-bone">&lt;src&gt;</code>, and{" "}
          <code className="font-field text-xs text-bone">&lt;extensions&gt;</code> nodes so downstream apps can preserve
          the honest signal.
        </p>

        <h3 className="mt-8 font-editorial text-lg text-bone">Fixtures & limits</h3>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
          V1 is entirely bundled fixture data. Every seeded Idaho waypoint is a hand-authored placeholder — the
          source name is <em>Bundled fixture — placeholder data</em>, the source ID is derived from the fixture ID,
          and capture dates and source URLs are intentionally <code className="font-field text-xs text-bone">null</code>.
          Any <code className="font-field text-xs text-bone">accuracyMeters</code> value is a fixture uncertainty
          <em> estimate</em>, not a measured accuracy. No seeded point is classified as <em>exact</em> because the
          repository does not contain a documented, surveyed coordinate to back that claim. The forest-context overlay
          is stylized — do <em>not</em> use it for management, permitting, or navigation. External basemap tiles are
          convenience: if a style fails to load the app remains functional over the dark ground fallback.
        </p>
            <p className="mt-6 text-xs leading-relaxed text-bone-dim">
              Sites source: <span className="text-bone">{sitesStatus.sourceLabel}</span>.
            </p>
          </>
        )}
      </aside>
    </>
  );
}