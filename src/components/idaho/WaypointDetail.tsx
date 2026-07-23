import { useState } from "react";
import { Copy, X, Check, Download, ExternalLink, Plus } from "lucide-react";
import type { Waypoint } from "@/data/schema";
import { CATEGORY_META, PRECISION_META, SOURCE_TYPE_LABEL } from "@/data/idaho/categories";
import { buildGpx, downloadFile } from "@/lib/gpx";

const CONFIDENCE_COLOR: Record<Waypoint["confidence"], string> = {
  High: "var(--density-8)",
  Medium: "var(--density-5)",
  Low: "var(--mineral)",
};

export function WaypointDetail({
  w,
  onClose,
  onAddToKit,
  inKit,
}: {
  w: Waypoint;
  onClose: () => void;
  onAddToKit?: (w: Waypoint) => void;
  inKit?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  // Never over-precise: exact = 5 dp (~1 m), approximate = 3 dp (~110 m), site-center = 2 dp (~1.1 km)
  const dp = w.precision === "exact" ? 5 : w.precision === "approximate" ? 3 : 2;
  const coords = `${w.latitude.toFixed(dp)}, ${w.longitude.toFixed(dp)}`;
  const isFixture = w.sourceType === "fixture";
  const accuracyLabel = w.accuracyMeters
    ? isFixture
      ? `±${w.accuracyMeters} m estimated (fixture)`
      : `±${w.accuracyMeters} m accuracy`
    : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(coords); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* noop */ }
  };
  const exportGpx = () => {
    const gpx = buildGpx([w], [], {
      name: `Forest Atlas · ${w.name}`,
      description: `Single waypoint export. Precision: ${w.precision}. Source: ${w.sourceName}.`,
    });
    const slug = w.id.replace(/[^a-z0-9-]/gi, "-");
    downloadFile(`forest-atlas-${slug}.gpx`, gpx);
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky identity header: never scrolls, so close + name stay reachable */}
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white/10" style={{ background: CATEGORY_META[w.category].color }} />
          <span className="font-field text-[10px] uppercase tracking-widest text-mineral">{w.category}</span>
          <span
            className="rounded-full border border-white/15 px-1.5 py-0.5 font-field text-[9px] uppercase tracking-widest"
            style={{ color: PRECISION_META[w.precision].color }}
            title={PRECISION_META[w.precision].description}
          >
            {PRECISION_META[w.precision].short}
          </span>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember" aria-label="Close detail">
          <X size={16} />
        </button>
      </div>
      <div className="shrink-0">
        <h2 className="mt-3 font-editorial text-2xl leading-tight text-bone">{w.name}</h2>
        <p className="mt-1 text-sm text-mineral">{w.region}</p>
        <p className="mt-2 text-xs italic text-bone-dim">{PRECISION_META[w.precision].description}</p>
      </div>

      {/* Independently scrollable body */}
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1">

      <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-white/10 py-4 font-field text-[10px] uppercase tracking-widest text-mineral">
        <div>
          <dt>Species</dt>
          <dd className="mt-1 font-sans text-sm normal-case tracking-normal text-bone">{w.species}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 font-sans text-sm normal-case tracking-normal text-bone">
            <span className="h-2 w-2 rounded-full" style={{ background: CONFIDENCE_COLOR[w.confidence] }} />
            {w.confidence}
          </dd>
        </div>
        <div className="col-span-2">
          <dt>Coordinates</dt>
          <dd className="mt-1 flex items-center gap-2">
            <code className="font-field text-sm text-bone">{coords}</code>
            <button onClick={copy} className="rounded-full p-1 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember" aria-label="Copy coordinates">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <span
              className="ml-1 font-field text-[10px] text-mineral"
              title={isFixture ? "Fixture uncertainty estimate — not measured/surveyed accuracy." : "Reported source accuracy."}
            >
              {accuracyLabel}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="font-field text-[10px] uppercase tracking-widest text-mineral">Why it matters</div>
        <p className="mt-2 font-editorial text-[15px] leading-relaxed text-bone">{w.significance}</p>
      </div>

      <div className="mt-5">
        <div className="font-field text-[10px] uppercase tracking-widest text-mineral">Access</div>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">{w.access}</p>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-spruce-deep/50 p-3">
        <div className="font-field text-[10px] uppercase tracking-widest text-mineral">Provenance</div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-bone-dim">
          <dt className="text-mineral">Source</dt>
          <dd>{w.sourceName}</dd>
          <dt className="text-mineral">Type</dt>
          <dd>{SOURCE_TYPE_LABEL[w.sourceType]}</dd>
          <dt className="text-mineral">Source ID</dt>
          <dd className="font-field text-[11px] text-bone">{w.sourceId}</dd>
          {w.captureDate && (
            <>
              <dt className="text-mineral">Captured</dt>
              <dd>{w.captureDate}</dd>
            </>
          )}
          {w.notes && (
            <>
              <dt className="text-mineral">Notes</dt>
              <dd className="italic">{w.notes}</dd>
            </>
          )}
          {w.sourceUrl && (
            <>
              <dt className="text-mineral">Link</dt>
              <dd>
                <a
                  href={w.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ember-soft underline-offset-4 hover:underline"
                >
                  Visit <ExternalLink size={11} />
                </a>
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={exportGpx}
          className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/20 focus:outline-none focus:ring-2 focus:ring-ember"
        >
          <Download size={12} /> Export GPX
        </button>
        {onAddToKit && (
          <button
            onClick={() => onAddToKit(w)}
            disabled={inKit}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-spruce-deep/70 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/30 disabled:cursor-default disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ember"
          >
            <Plus size={12} /> {inKit ? "In Field Kit" : "Add to Field Kit"}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}