import { useRef } from "react";
import { Download, FileUp, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { ImportedBundle, Waypoint } from "@/data/schema";
import { buildGpx, downloadFile, parseGpx } from "@/lib/gpx";

export function ImportPanel({
  imports,
  onImport,
  onRemove,
  onError,
  filtered,
  onAddBundleToKit,
}: {
  imports: ImportedBundle[];
  onImport: (b: ImportedBundle) => void;
  onRemove: (idx: number) => void;
  onError: (msg: string) => void;
  filtered: Waypoint[];
  onAddBundleToKit?: (bundle: ImportedBundle) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = () => fileRef.current?.click();

  const onFile = async (f: File) => {
    try {
      const text = await f.text();
      const bundle = parseGpx(text, f.name);
      onImport(bundle);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to import GPX.");
    }
  };

  const exportFiltered = () => {
    if (filtered.length === 0) {
      onError("No waypoints match current filters — nothing to export.");
      return;
    }
    const gpx = buildGpx(filtered, [], {
      name: `Forest Atlas · filtered (${filtered.length})`,
      description: `Filtered Idaho waypoints. Each carries a precision label — do not assume survey accuracy.`,
    });
    downloadFile(`forest-atlas-idaho-filtered-${filtered.length}.gpx`, gpx);
  };

  const exportImports = (b: ImportedBundle) => {
    const gpx = buildGpx([], b.lines, {
      name: `Forest Atlas · re-export of ${b.fileName}`,
      description: `Ephemeral re-export of user-imported routes/tracks from ${b.fileName}.`,
    });
    downloadFile(`forest-atlas-reexport-${b.fileName.replace(/[^a-z0-9.-]/gi, "_")}`, gpx);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onPick}
          className="inline-flex items-center gap-1.5 rounded-none border border-white/15 bg-spruce-deep/70 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-ember"
        >
          <FileUp size={12} /> Import GPX
        </button>
        <button
          onClick={exportFiltered}
          className="inline-flex items-center gap-1.5 rounded-none border border-ember/40 bg-ember/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/20 focus:outline-none focus:ring-2 focus:ring-ember"
        >
          <Download size={12} /> Export filtered
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-mineral">
        Imports are ephemeral: parsed in this browser tab only, never uploaded or saved.
      </p>

      {imports.length > 0 && (
        <ul className="space-y-2">
          {imports.map((b, i) => (
            <li key={b.importedAt + b.fileName} className="rounded-sm border border-white/10 bg-spruce/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-editorial text-sm text-bone">{b.fileName}</div>
                  <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                    {b.waypoints.length} wpt · {b.lines.filter((l) => l.kind === "route").length} rte ·{" "}
                    {b.lines.filter((l) => l.kind === "track").length} trk
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {onAddBundleToKit && (b.waypoints.length + b.lines.length) > 0 && (
                    <button
                      onClick={() => onAddBundleToKit(b)}
                      className="rounded-none p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
                      aria-label={`Add ${b.fileName} to Field Kit`}
                      title="Add all waypoints and lines from this file to the active Field Kit"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                  {b.lines.length > 0 && (
                    <button
                      onClick={() => exportImports(b)}
                      className="rounded-none p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
                      aria-label={`Re-export ${b.fileName}`}
                    >
                      <Download size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(i)}
                    className="rounded-none p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
                    aria-label={`Remove ${b.fileName}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {b.warnings.length > 0 && (
                <div className="mt-2 flex items-start gap-1.5 rounded-sm border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-200/90">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <ul className="list-disc pl-3">
                    {b.warnings.map((w, wi) => (
                      <li key={wi}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}