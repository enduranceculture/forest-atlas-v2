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
import { DoubleRuleFrame } from "@/components/atlas/DoubleRuleFrame";
import { PaperBackdrop } from "@/components/atlas/PaperBackdrop";
import { VintagePlacard } from "@/components/atlas/VintagePlacard";
import { InkButton } from "@/components/atlas/InkButton";
import { IconCompass, IconPine } from "@/components/atlas/FieldIcons";

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
    <div className="relative min-h-screen text-[var(--ink)]" style={{ background: "var(--paper)" }}>
      <TopoBackdrop opacity={0.05} />
      <PaperBackdrop opacity={0.28} />

      <div className="relative z-10 mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        <DoubleRuleFrame variant="poster" as="section" label="Series № 1 · The Western Forests">
          {/* Poster masthead */}
          <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-4 border-b border-[var(--vermilion)] px-4 py-4 sm:px-8 sm:py-6">
            <div className="flex items-center gap-3">
              <AtlasMark size={44} />
              <div className="hidden font-field text-[9px] uppercase tracking-[0.32em] text-[var(--ink-soft)] sm:block">
                Editorial<br />Atlas
              </div>
            </div>
            <div className="min-w-0 text-center">
              <div className="font-field text-[10px] uppercase tracking-[0.42em] text-[var(--vermilion)]">
                Forest Atlas
              </div>
              <h1 className="mt-1 font-display text-3xl uppercase leading-[0.95] tracking-[0.06em] text-[var(--ink)] sm:text-5xl md:text-6xl">
                The Western Forests
              </h1>
              <div className="mt-2 flex items-center justify-center gap-3 text-[var(--ink-soft)]">
                <span className="h-px w-8 bg-[var(--vermilion)]" aria-hidden />
                <span className="font-editorial text-[11px] italic sm:text-sm">
                  Mature &amp; old-growth stands, hand-charted for the field
                </span>
                <span className="h-px w-8 bg-[var(--vermilion)]" aria-hidden />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <InkButton
                tone="paper"
                size="sm"
                onClick={() => setAboutOpen(true)}
                className="hidden sm:inline-flex"
              >
                <Info size={11} /> About · Data
              </InkButton>
              <Link
                to="/idaho"
                aria-label="Open Idaho Field Explorer"
                className="inline-flex items-center gap-1.5 border border-[var(--vermilion-deep)] bg-[var(--vermilion)] px-3.5 py-1.5 font-field text-[11px] uppercase tracking-[0.2em] text-[var(--paper)] shadow-[2px_2px_0_0_var(--ink)] transition-[transform,box-shadow] duration-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vermilion)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                <span>Enter Idaho</span> <ArrowRight size={12} />
              </Link>
            </div>
          </header>

          {result.ok ? (
            <div className="grid gap-0 lg:grid-cols-12">
              {/* Poster canvas */}
              <section className="lg:col-span-8">
                <div
                  className="relative"
                  style={{
                    background: "var(--paper)",
                    borderRight: "1px solid var(--vermilion)",
                  }}
                >
                  <div className="aspect-[10/9] w-full">
                    <WesternAtlasMap
                      regions={result.data}
                      selectedId={selected?.id ?? null}
                      onSelect={setSelected}
                    />
                  </div>
                  {/* Cartouche — bottom-left */}
                  <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
                    <VintagePlacard tone="paper" size="sm">
                      Plate I · Density
                    </VintagePlacard>
                    <span className="font-field text-[9px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                      v1 fixture · {result.data.features.length} regions
                    </span>
                  </div>
                  {/* Compass rose — bottom-right */}
                  <div className="pointer-events-none absolute bottom-3 right-4 flex flex-col items-center text-[var(--vermilion)]">
                    <IconCompass size={34} />
                    <span className="mt-0.5 font-field text-[8px] uppercase tracking-[0.3em] text-[var(--ink-soft)]">
                      N
                    </span>
                  </div>
                  {/* Waterways caveat — never claim source-of-truth geography */}
                  <div className="pointer-events-none absolute right-3 top-3">
                    <span className="inline-block bg-[var(--paper)] px-1.5 py-0.5 font-field text-[8px] uppercase tracking-[0.3em] text-[var(--cobalt-deep)] ring-1 ring-[var(--cobalt)]">
                      Cobalt waterways · decorative
                    </span>
                  </div>
                </div>
              </section>

              {/* Printed inset column */}
              <aside className="lg:col-span-4">
                <div className="flex h-full flex-col divide-y divide-[var(--vermilion)]/60">
                  <div className="p-5">
                    <RegionCard region={selected} />
                  </div>

                  <div className="relative p-5">
                    <div className="pointer-events-none absolute -top-[9px] left-4 bg-[var(--paper)] px-1.5 font-field text-[9px] uppercase tracking-[0.3em] text-[var(--vermilion)]">
                      Field notes
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-[var(--pine)]">
                        <IconPine size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-lg uppercase tracking-[0.06em] text-[var(--ink)]">
                          What this atlas shows
                        </h3>
                        <p className="mt-1.5 font-editorial text-[13px] leading-relaxed text-[var(--ink-mid)]">
                          Mature stands carry structural complexity — large trees,
                          snags, downed wood, layered canopies. Old-growth deepens it
                          over centuries. Regions here are drawn to show density and
                          character, not surveyed boundaries.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative p-5">
                    <div className="pointer-events-none absolute -top-[9px] left-4 bg-[var(--paper)] px-1.5 font-field text-[9px] uppercase tracking-[0.3em] text-[var(--vermilion)]">
                      Legend
                    </div>
                    <DensityLegend />
                  </div>

                  <div className="relative flex-1 p-5">
                    <div className="pointer-events-none absolute -top-[9px] left-4 bg-[var(--paper)] px-1.5 font-field text-[9px] uppercase tracking-[0.3em] text-[var(--vermilion)]">
                      Scope
                    </div>
                    <p className="font-editorial text-[12px] leading-relaxed text-[var(--ink-mid)]">
                      V1 covers the eleven Western states with an emphasis on
                      federal land. Fixture data replaces authoritative USFS FIA /
                      LANDFIRE layers pending integration.
                    </p>
                    <button
                      onClick={() => setAboutOpen(true)}
                      className="mt-3 font-field text-[10px] uppercase tracking-[0.28em] text-[var(--vermilion)] underline-offset-4 hover:underline"
                    >
                      Full methodology →
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="p-6">
              <AtlasUnavailable message={result.error} />
            </div>
          )}

          {/* Colophon */}
          <div className="border-t border-[var(--vermilion)] bg-[var(--paper-deep)]/60 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 font-field text-[9px] uppercase tracking-[0.3em] text-[var(--ink-soft)]">
              <span>Forest Atlas · West · Concept Proof</span>
              <span>Printed at 1:∞ · MMXXVI</span>
              <span>Union Line: Cascades → Rockies</span>
            </div>
          </div>
        </DoubleRuleFrame>
      </div>

      <AboutDrawer open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
