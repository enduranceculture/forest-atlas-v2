import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  FileUp,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { Waypoint } from "@/data/schema";
import type { UseFieldKit } from "@/hooks/use-field-kit";
import { buildCombinedGpx } from "@/lib/field-kit-gpx";
import { downloadFile } from "@/lib/gpx";
import { buildShareUrl } from "@/lib/field-kit-share";
import type { IdahoSearch } from "@/lib/url-state";

function slug(s: string) {
  return s.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "kit";
}

export function FieldKitDrawer({
  open,
  onClose,
  kit,
  sites,
  search,
  onToast,
  onViewAll,
  onOpenImportedBundles,
}: {
  open: boolean;
  onClose: () => void;
  kit: UseFieldKit;
  sites: Waypoint[];
  search: IdahoSearch;
  onToast: (msg: string) => void;
  onViewAll: (bbox: { lat: number; lon: number }[] | null) => void;
  onOpenImportedBundles: () => void;
}) {
  const [includePrivate, setIncludePrivate] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const sitesById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const { snapshot, active } = kit;

  const exportGpx = () => {
    if (!active) return;
    if (active.stops.length === 0) {
      onToast("Nothing navigable in this kit yet — add a site or imported waypoint.");
      return;
    }
    const gpx = buildCombinedGpx(active, sites, { includePrivateNotes: includePrivate });
    downloadFile(`field-kit-${slug(active.name)}.gpx`, gpx);
    onToast(
      `Exported ${active.stops.length} stop(s)${includePrivate ? " with private notes" : ""}.`,
    );
  };

  const shareUrl = () => {
    if (typeof window === "undefined") return;
    const url = buildShareUrl({
      origin: window.location.origin,
      pathname: "/idaho",
      search,
      activeCollectionId: active?.id ?? null,
    });
    void navigator.clipboard
      .writeText(url)
      .then(() =>
        onToast(
          "Share link copied. Private notes and imported files stay on your device.",
        ),
      )
      .catch(() => onToast(`Copy failed — link: ${url}`));
  };

  const viewAll = () => {
    if (!active) return;
    const points: { lat: number; lon: number }[] = [];
    for (const s of active.stops) {
      if (s.kind === "site" && s.publicId) {
        const site = sitesById.get(s.publicId);
        if (site) points.push({ lat: site.latitude, lon: site.longitude });
      } else if (s.kind === "imported-wpt" && s.imported?.kind === "wpt") {
        points.push({ lat: s.imported.latitude, lon: s.imported.longitude });
      } else if (s.kind === "imported-line" && s.imported?.kind === "line") {
        for (const [lat, lon] of s.imported.coordinates) points.push({ lat, lon });
      }
    }
    if (points.length === 0) {
      onToast("Nothing to show on the map yet.");
      return;
    }
    onViewAll(points);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[1200] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Forest Field Kit"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-spruce shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="font-field text-[10px] uppercase tracking-widest text-ember">
              Forest Field Kit
            </div>
            <div className="font-editorial text-lg text-bone">
              {active ? active.name : "No collection yet"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember"
            aria-label="Close Field Kit"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                Collections
              </div>
              <button
                onClick={() => {
                  const name = window.prompt("Name this kit", "New field kit")?.trim();
                  if (name) kit.createCollection(name);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/25"
              >
                <Plus size={11} /> New
              </button>
            </div>
            {snapshot.collections.length === 0 ? (
              <p className="text-xs text-bone-dim">
                Create a kit to start planning stops. Everything stays on this device.
              </p>
            ) : (
              <ul className="space-y-1">
                {snapshot.collections.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <button
                      onClick={() => kit.setActive(c.id)}
                      className={`flex-1 truncate rounded-lg border px-3 py-1.5 text-left text-sm ${
                        c.id === snapshot.activeId
                          ? "border-ember/50 bg-ember/10 text-bone"
                          : "border-white/10 text-bone-dim hover:border-white/25"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="ml-2 font-field text-[10px] uppercase tracking-widest text-mineral">
                        {c.stops.length} stops · {c.researchRefs.length} refs
                      </span>
                    </button>
                    <button
                      onClick={() => kit.duplicateCollection(c.id)}
                      className="rounded-full p-1.5 text-mineral hover:bg-white/5 hover:text-bone"
                      aria-label={`Duplicate ${c.name}`}
                    >
                      <Copy size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {active && (
            <>
              <section className="mt-6 space-y-2">
                <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                  Kit details
                </div>
                <input
                  value={active.name}
                  onChange={(e) => kit.renameCollection(active.id, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-spruce-deep/50 px-3 py-2 text-sm text-bone focus:border-ember/60 focus:outline-none"
                  aria-label="Kit name"
                />
                <textarea
                  value={active.description ?? ""}
                  onChange={(e) => kit.updateCollectionMeta(active.id, { description: e.target.value })}
                  placeholder="Optional description (shipped in exports)"
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-spruce-deep/50 px-3 py-2 text-xs text-bone-dim focus:border-ember/60 focus:outline-none"
                />
                <textarea
                  value={active.privateNotes ?? ""}
                  onChange={(e) => kit.updateCollectionMeta(active.id, { privateNotes: e.target.value })}
                  placeholder="Private notes (never shared, never in URL, only in GPX if you opt in)"
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-spruce-deep/50 px-3 py-2 text-xs text-bone-dim focus:border-ember/60 focus:outline-none"
                />
              </section>

              <section className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                    Navigable stops ({active.stops.length})
                  </div>
                  <button
                    onClick={onOpenImportedBundles}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/25"
                  >
                    <FileUp size={11} /> Add imported
                  </button>
                </div>
                {active.stops.length === 0 ? (
                  <p className="text-xs text-bone-dim">
                    Open any Field Site or imported GPX waypoint and press "Add to
                    Field Kit" to build your route.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {[...active.stops]
                      .sort((a, b) => a.order - b.order)
                      .map((s, i, arr) => {
                        const site =
                          s.kind === "site" && s.publicId ? sitesById.get(s.publicId) : null;
                        const label =
                          s.userName ||
                          site?.name ||
                          (s.kind === "imported-wpt" ? s.imported?.name : null) ||
                          (s.kind === "imported-line" ? s.imported?.name : null) ||
                          "Untitled stop";
                        const stale = s.kind === "site" && s.publicId && !site;
                        return (
                          <li
                            key={s.id}
                            className={`rounded-lg border p-2.5 text-xs ${
                              stale
                                ? "border-amber-500/30 bg-amber-500/5 text-amber-200/90"
                                : "border-white/10 bg-spruce-deep/40 text-bone"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                                {i + 1}
                              </div>
                              <div className="min-w-0 flex-1 truncate">{label}</div>
                              <button
                                onClick={() => kit.reorderStop(s.id, "up")}
                                disabled={i === 0}
                                className="rounded-full p-1 text-mineral hover:bg-white/5 hover:text-bone disabled:opacity-30"
                                aria-label="Move up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => kit.reorderStop(s.id, "down")}
                                disabled={i === arr.length - 1}
                                className="rounded-full p-1 text-mineral hover:bg-white/5 hover:text-bone disabled:opacity-30"
                                aria-label="Move down"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                onClick={() => kit.removeStop(s.id)}
                                className="rounded-full p-1 text-mineral hover:bg-white/5 hover:text-bone"
                                aria-label="Remove stop"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {stale ? (
                              <div className="mt-1 font-field text-[10px] uppercase tracking-widest">
                                Source removed — safe to delete.
                              </div>
                            ) : (
                              <div className="mt-1 font-field text-[10px] uppercase tracking-widest text-mineral">
                                {s.kind === "site"
                                  ? "Field Site"
                                  : s.kind === "imported-wpt"
                                  ? "Imported waypoint"
                                  : "Imported line"}
                              </div>
                            )}
                            <textarea
                              value={s.userNotes ?? ""}
                              onChange={(e) =>
                                kit.updateStopMeta(s.id, { userNotes: e.target.value })
                              }
                              placeholder="Private note (opt-in for GPX export)"
                              rows={1}
                              className="mt-1 w-full rounded border border-white/10 bg-spruce-deep/40 px-2 py-1 text-[11px] text-bone-dim focus:border-ember/50 focus:outline-none"
                            />
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>

              {active.researchRefs.length > 0 && (
                <section className="mt-6 space-y-2">
                  <div className="font-field text-[10px] uppercase tracking-widest text-mineral">
                    Research references ({active.researchRefs.length})
                  </div>
                  <p className="text-[11px] text-bone-dim">
                    Inventory firesheds are saved for reference only — never
                    exported as navigable data.
                  </p>
                  <ul className="space-y-1">
                    {active.researchRefs.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-spruce-deep/40 p-2 text-xs text-bone-dim"
                      >
                        <span className="flex-1 truncate">{r.label}</span>
                        <button
                          onClick={() => kit.removeResearchRef(r.id)}
                          className="rounded-full p-1 text-mineral hover:bg-white/5 hover:text-bone"
                          aria-label="Remove reference"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {active && (
          <footer className="shrink-0 space-y-2 border-t border-white/10 px-5 py-4">
            <label className="flex items-center gap-2 text-[11px] text-bone-dim">
              <input
                type="checkbox"
                checked={includePrivate}
                onChange={(e) => setIncludePrivate(e.target.checked)}
                className="accent-ember"
              />
              Include private notes in GPX export
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportGpx}
                className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-ember-soft hover:bg-ember/20"
              >
                <Download size={12} /> Export GPX
              </button>
              <button
                onClick={shareUrl}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-spruce-deep/70 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/30"
              >
                <Share2 size={12} /> Share view
              </button>
              <button
                onClick={viewAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-spruce-deep/70 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/30"
              >
                <Check size={12} /> View all on map
              </button>
              <button
                onClick={() => kit.clearCollection(active.id)}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-mineral hover:text-bone"
              >
                Clear
              </button>
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="inline-flex items-center gap-1 rounded-full border border-red-500/30 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-red-200 hover:bg-red-500/10"
              >
                Delete kit
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-mineral">
              Everything in Field Kit stays on this device. Share view copies a
              link with only public dataset state — private notes and imported
              file content are never transmitted.
            </p>
          </footer>
        )}

        {showConfirmDelete && active && (
          <div className="absolute inset-0 z-[10] grid place-items-center bg-black/60 p-6">
            <div className="max-w-xs rounded-2xl border border-white/10 bg-spruce-deep p-5">
              <div className="font-editorial text-lg text-bone">Delete this kit?</div>
              <p className="mt-2 text-xs text-bone-dim">
                “{active.name}” and its {active.stops.length} stop(s) will be permanently removed from this device.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="rounded-full border border-white/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-bone hover:border-white/25"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    kit.deleteCollection(active.id);
                    setShowConfirmDelete(false);
                  }}
                  className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-red-200 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}