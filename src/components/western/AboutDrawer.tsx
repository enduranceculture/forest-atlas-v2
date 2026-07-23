import { useEffect } from "react";
import { X } from "lucide-react";
import { DensityLegend } from "./DensityLegend";

export function AboutDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-spruce-deep p-8 transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <span className="font-field text-[10px] uppercase tracking-widest text-mineral">About this atlas</span>
          <button onClick={onClose} className="rounded-full p-1.5 text-mineral hover:bg-white/5 hover:text-bone focus:outline-none focus:ring-2 focus:ring-ember" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <h2 className="mt-6 font-editorial text-3xl leading-tight text-bone">A field guide to Western old growth.</h2>
        <p className="mt-4 text-sm leading-relaxed text-bone-dim">
          Forest Atlas · West is an editorial map of mature and old-growth forests across the American West. Mature stands carry the structural complexity — large trees, standing snags, downed wood, multi-layer canopies — that old growth deepens over centuries. V1 covers the eleven Western states with a focus on federal land.
        </p>
        <h3 className="mt-8 font-editorial text-lg text-bone">Density scale</h3>
        <div className="mt-3"><DensityLegend /></div>
        <h3 className="mt-8 font-editorial text-lg text-bone">Sources</h3>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
          V1 uses a bundled fixture derived from public inventories (USFS FIA, LANDFIRE, MOG 2024). Region polygons are stylized for legibility, not survey-accurate. Waypoint records in the Idaho explorer are seeded examples with confidence labels.
        </p>
        <h3 className="mt-8 font-editorial text-lg text-bone">Scope</h3>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
          Focused on federal-land forests. Tribal, state, and private lands are represented only where the underlying inventories include them.
        </p>
      </aside>
    </>
  );
}