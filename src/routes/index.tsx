import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Info, ArrowRight } from "lucide-react";
import type { RegionFeature } from "@/data/schema";
import { WESTERN_REGIONS } from "@/data/western/regions";
import { validateRegions } from "@/data/validate";
import { AtlasMark } from "@/components/brand/AtlasMark";
import { TopoBackdrop } from "@/components/layout/TopoBackdrop";
import { WesternAtlasMap } from "@/components/western/WesternAtlasMap";
import { RegionCard } from "@/components/western/RegionCard";
import { DensityLegend } from "@/components/western/DensityLegend";
import { AboutDrawer } from "@/components/western/AboutDrawer";
import { AtlasUnavailable } from "@/components/western/AtlasUnavailable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forest Atlas · West — Mature & Old-Growth Forests" },
      { name: "description", content: "An editorial visual atlas of mature and old-growth forests across the American West." },
      { property: "og:title", content: "Forest Atlas · West" },
      { property: "og:description", content: "An editorial visual atlas of mature and old-growth forests across the American West." },
    ],
  }),
  component: Index,
});

function Index() {
  const [selected, setSelected] = useState<RegionFeature | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const result = validateRegions(WESTERN_REGIONS);

  return (
    <div className="relative min-h-screen bg-spruce-deep text-bone">
      <TopoBackdrop opacity={0.04} />

      <header className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/5 px-6 py-5 sm:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <AtlasMark size={36} />
          <div className="min-w-0">
            <div className="font-editorial text-lg leading-tight text-bone sm:text-xl">
              Forest Atlas <span className="text-mineral">·</span> West
            </div>
            <div className="truncate font-field text-[10px] uppercase tracking-widest text-mineral">
              Mature + old-growth forests across the American West
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setAboutOpen(true)}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest text-mineral transition hover:border-white/25 hover:text-bone sm:inline-flex"
          >
            <Info size={12} /> About · Data
          </button>
          <Link
            to="/idaho"
            className="inline-flex items-center gap-1.5 rounded-full bg-ember px-4 py-2 font-field text-[11px] uppercase tracking-widest text-primary-foreground transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ember/50"
          >
            Explore Idaho <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-10 pt-4 sm:px-8">
        {!result.ok ? (
          <AtlasUnavailable message={result.error} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Map */}
            <section className="lg:col-span-8">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-spruce shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
                <div className="aspect-[10/9] w-full">
                  <WesternAtlasMap
                    regions={result.data}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                  />
                </div>
                <div className="pointer-events-none absolute bottom-3 left-4 font-field text-[9px] uppercase tracking-[0.2em] text-mineral">
                  Forest Atlas · West · v1 fixture · {result.data.features.length} regions
                </div>
              </div>
            </section>

            {/* Editorial side panel */}
            <aside className="space-y-5 lg:col-span-4">
              <RegionCard region={selected} />

              <div className="rounded-2xl border border-white/10 bg-spruce/50 p-5">
                <p className="font-field text-[10px] uppercase tracking-widest text-ember-soft">Field notes</p>
                <h3 className="mt-2 font-editorial text-lg leading-snug text-bone">
                  What this atlas shows
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">
                  Mature stands carry structural complexity — large trees, snags,
                  downed wood, layered canopies. Old-growth deepens it over
                  centuries. Regions here are drawn to show density and character,
                  not surveyed boundaries.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-spruce/50 p-5">
                <DensityLegend />
              </div>

              <div className="rounded-2xl border border-white/10 bg-spruce/40 p-5">
                <p className="font-field text-[10px] uppercase tracking-widest text-mineral">Scope</p>
                <p className="mt-2 text-xs leading-relaxed text-mineral">
                  V1 covers the eleven Western states with an emphasis on federal
                  land. Fixture data replaces authoritative USFS FIA / LANDFIRE
                  layers pending integration.
                </p>
                <button
                  onClick={() => setAboutOpen(true)}
                  className="mt-3 font-field text-[10px] uppercase tracking-widest text-ember-soft underline-offset-4 hover:underline"
                >
                  Full methodology →
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>

      <AboutDrawer open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
