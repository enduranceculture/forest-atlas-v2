import { useMemo, memo, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { RegionCollection, RegionFeature } from "@/data/schema";
import { WESTERN_STATES } from "@/data/western/states";
import { WESTERN_CITIES } from "@/data/western/cities";
import {
  DECORATIVE_RIVERS,
  DECORATIVE_LAKES,
} from "@/data/western/decorative-waters";
import { densityColor } from "@/data/western/density";
import { project, ringToPath, VIEW_H, VIEW_W } from "@/lib/projection";
import { AtlasSvgPatterns } from "@/components/atlas/HachurePattern";
import { IconPine, IconElk, IconTent, IconLookout, IconBear } from "@/components/atlas/FieldIcons";

type Props = {
  regions: RegionCollection;
  selectedId: string | null;
  onSelect: (r: RegionFeature | null) => void;
};

// Small handpicked field-illustration scatter — sparse, not decorative
// clutter. Positioned in geographic space and projected. Toggled off on
// narrow viewports via container query on the parent.
const FIELD_ILLUSTRATIONS: Array<{
  id: string;
  lon: number;
  lat: number;
  el: "pine" | "elk" | "tent" | "lookout" | "bear";
}> = [
  { id: "olympic-elk", lon: -123.9, lat: 47.9, el: "elk" },
  { id: "cascades-pine", lon: -121.6, lat: 46.7, el: "pine" },
  { id: "sierra-lookout", lon: -119.0, lat: 37.4, el: "lookout" },
  { id: "central-idaho-tent", lon: -115.1, lat: 45.0, el: "tent" },
  { id: "gye-bear", lon: -110.3, lat: 44.5, el: "bear" },
  { id: "wallowa-pine", lon: -117.4, lat: 45.3, el: "pine" },
  { id: "uintas-pine", lon: -110.5, lat: 40.75, el: "pine" },
  { id: "sanjuan-pine", lon: -107.4, lat: 37.6, el: "pine" },
  { id: "coast-range-pine", lon: -123.9, lat: 44.5, el: "pine" },
  { id: "redwoods-elk", lon: -124.0, lat: 40.5, el: "elk" },
];

function WesternAtlasMapImpl({ regions, selectedId, onSelect }: Props) {
  const stateShapes = useMemo(() => WESTERN_STATES.map((s) => ({ ...s, d: ringToPath(s.ring) })), []);
  const stateLabels = useMemo(() => {
    // hand-picked interior label anchors so the abbreviation sits cleanly inside the state.
    const anchors: Record<string, [number, number]> = {
      WA: [-120.5, 47.4], OR: [-120.5, 43.9], CA: [-119.5, 37.2], NV: [-117.0, 39.3],
      ID: [-114.6, 44.8], MT: [-109.5, 47.0], WY: [-107.5, 43.0], UT: [-111.6, 39.3],
      CO: [-105.5, 39.0], AZ: [-111.5, 34.3], NM: [-106.0, 34.4],
    };
    return WESTERN_STATES.map((s) => ({ code: s.code, ...project(anchors[s.code]?.[0] ?? 0, anchors[s.code]?.[1] ?? 0) }));
  }, []);
  const regionShapes = useMemo(
    () => regions.features.map((f) => ({
      f,
      d: f.geometry.coordinates.map((r) => ringToPath(r as [number, number][])).join(" "),
    })),
    [regions]
  );
  const cityPoints = useMemo(() => WESTERN_CITIES.map((c) => ({ c, ...project(c.lon, c.lat) })), []);
  const idaho = stateShapes.find((s) => s.code === "ID");
  const idahoLabel = idaho ? project(-114.6, 44.9) : { x: 0, y: 0 };

  const riverPaths = useMemo(
    () =>
      DECORATIVE_RIVERS.map((r) => {
        // Project vertices, then insert 2 subtly jittered intermediate points
        // per segment and smooth the polyline with quadratic Beziers so
        // waterways read as hand-drawn meanders rather than digitally
        // straight lines. Deterministic hash → identical between renders.
        const hash = (s: string, i: number) => {
          let h = 2166136261 ^ i;
          for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
          return ((h >>> 0) % 1000) / 1000; // 0..1
        };
        const base = r.coordinates.map(([lon, lat]) => project(lon, lat));
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < base.length - 1; i++) {
          const a = base[i];
          const b = base[i + 1];
          pts.push(a);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          for (const t of [0.33, 0.66]) {
            const j = (hash(r.id, i * 10 + Math.round(t * 10)) - 0.5) * 2; // -1..1
            const amp = Math.min(len * 0.22, 6.5); // subtle meander
            pts.push({
              x: a.x + dx * t + nx * j * amp,
              y: a.y + dy * t + ny * j * amp,
            });
          }
        }
        pts.push(base[base.length - 1]);
        // Smooth: M first, then quadratic through midpoints of successive pairs.
        let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          d += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
        }
        const last = pts[pts.length - 1];
        d += ` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
        return { id: r.id, d };
      }),
    [],
  );
  const lakePoints = useMemo(
    () =>
      DECORATIVE_LAKES.map((l) => ({
        id: l.id,
        ...project(l.center[0], l.center[1]),
        // Convert coarse "degree radius" to viewport units by projecting an
        // offset point and taking the distance — good enough for a poster.
        r: (() => {
          const a = project(l.center[0], l.center[1]);
          const b = project(l.center[0] + l.radius, l.center[1]);
          return Math.max(3, Math.abs(b.x - a.x));
        })(),
      })),
    [],
  );
  const illustrations = useMemo(
    () => FIELD_ILLUSTRATIONS.map((f) => ({ ...f, ...project(f.lon, f.lat) })),
    [],
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Editorial poster map of mature and old-growth forest regions across the American West. Idaho highlighted in vermilion."
    >
      <AtlasSvgPatterns />

      {/* Paper ground */}
      <rect width={VIEW_W} height={VIEW_H} fill="var(--paper)" />
      {/* Faint universal hachure wash for the "background terrain" feel */}
      <rect width={VIEW_W} height={VIEW_H} fill="url(#hachureMountain)" opacity="0.10" />

      {/* State fills — cream with hairline ink border, slight paper-shade fill */}
      <g>
        {stateShapes.map((s) => (
          <path
            key={s.code}
            d={s.d}
            fill="var(--paper-deep)"
            fillOpacity="0.55"
            stroke="var(--ink)"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        ))}
      </g>

      {/* Cobalt decorative waterways — labeled non-authoritative on the page */}
      <g pointerEvents="none" aria-hidden="true">
        {riverPaths.map((r) => (
          <path
            key={r.id}
            d={r.d}
            fill="none"
            stroke="var(--cobalt)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        ))}
        {lakePoints.map((l) => (
          <g key={l.id}>
            <circle cx={l.x} cy={l.y} r={l.r} fill="var(--cobalt)" opacity="0.75" />
            <circle cx={l.x} cy={l.y} r={l.r} fill="url(#waterHatch)" />
          </g>
        ))}
      </g>

      {/* Forest density regions — pale-sage → deep pine, hachure fill on top */}
      <g>
        {regionShapes.filter(({ f }) => f.id !== selectedId).map(({ f, d }) => (
          <g
            key={f.id}
            className="cursor-pointer transition-[opacity] duration-150"
            onPointerEnter={(e: ReactPointerEvent<SVGGElement>) => { if (e.pointerType !== "touch") onSelect(f); }}
            onFocus={() => onSelect(f)}
            onClick={() => onSelect(f)}
            tabIndex={0}
            role="button"
            aria-label={`${f.properties.name}, density class ${f.properties.densityClass}`}
            style={{ outline: "none" }}
          >
            <path
              d={d}
              fill={densityColor(f.properties.densityClass)}
              fillOpacity={selectedId ? 0.55 : 0.82}
              stroke="var(--ink)"
              strokeOpacity="0.55"
              strokeWidth={0.55}
            />
            {/* Forest cluster hatch stamped over the region for texture */}
            <path
              d={d}
              fill="url(#hachureForest)"
              opacity={f.properties.densityClass >= 6 ? 0.55 : 0.30}
              pointerEvents="none"
            />
          </g>
        ))}
        {regionShapes.filter(({ f }) => f.id === selectedId).map(({ f, d }) => (
          <g key={f.id}>
            {/* Print offset — vermilion echo behind the plate */}
            <g transform="translate(2 2)">
              <path d={d} fill="var(--vermilion)" fillOpacity="0.25" />
            </g>
            <path
              d={d}
              fill={densityColor(f.properties.densityClass)}
              fillOpacity={0.95}
              stroke="var(--vermilion)"
              strokeWidth={1.6}
              tabIndex={0}
              role="button"
              aria-label={`${f.properties.name}, density class ${f.properties.densityClass}, selected`}
              className="cursor-pointer focus:outline-none"
              onFocus={() => onSelect(f)}
              onClick={() => onSelect(f)}
            />
            <path
              d={d}
              fill="url(#hachureForest)"
              opacity="0.6"
              pointerEvents="none"
            />
          </g>
        ))}
      </g>

      {/* State abbreviations — small red field labels, printed-map convention */}
      <g pointerEvents="none" aria-hidden="true">
        {stateLabels.map((s) => (
          <text
            key={s.code}
            x={s.x}
            y={s.y}
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="13"
            fontWeight={700}
            letterSpacing="3"
            fill="var(--vermilion)"
            opacity="0.68"
          >
            {s.code}
          </text>
        ))}
      </g>

      {/* Sparse field illustrations — muted ink, non-interactive */}
      <g pointerEvents="none" aria-hidden="true" className="hidden md:inline">
        {illustrations.map((it) => {
          const Cmp =
            it.el === "pine" ? IconPine :
            it.el === "elk" ? IconElk :
            it.el === "tent" ? IconTent :
            it.el === "lookout" ? IconLookout : IconBear;
          return (
            <g key={it.id} transform={`translate(${it.x - 8} ${it.y - 8})`} style={{ color: "var(--ink)" }} opacity="0.6">
              <Cmp size={16} />
            </g>
          );
        })}
      </g>

      {/* IDAHO placard — always emphasized in vermilion */}
      {idaho && (
        <>
          {/* offset print echo */}
          <path
            d={idaho.d}
            transform="translate(2 2)"
            fill="var(--vermilion)"
            opacity="0.18"
            pointerEvents="none"
          />
          <path
            d={idaho.d}
            fill="none"
            stroke="var(--vermilion)"
            strokeWidth="1.8"
            pointerEvents="none"
          />
          <g transform={`translate(${idahoLabel.x} ${idahoLabel.y})`} pointerEvents="none">
            {/* Placard: paper plate with vermilion double-rule + drop */}
            <rect x="-52" y="-16" width="104" height="32" fill="var(--vermilion)" transform="translate(3 3)" />
            <rect x="-52" y="-16" width="104" height="32" fill="var(--paper)" stroke="var(--vermilion)" strokeWidth="1.4" />
            <rect x="-49" y="-13" width="98" height="26" fill="none" stroke="var(--vermilion)" strokeWidth="0.6" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontSize="17"
              fontWeight={800}
              letterSpacing="6"
              fill="var(--vermilion)"
            >
              IDAHO
            </text>
          </g>
        </>
      )}

      {/* Cities — small black dots + printed labels */}
      <g pointerEvents="none" aria-hidden="true">
        {cityPoints.map(({ c, x, y }) => (
          <g key={c.name} transform={`translate(${x}, ${y})`}>
            <circle r="2" fill="var(--ink)" />
            <circle r="4" fill="none" stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="0.6" />
            <text
              x="6"
              y="3"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--ink)"
              opacity="0.85"
            >
              {c.name}
            </text>
          </g>
        ))}
      </g>

      {idaho && (
        <Link to="/idaho" aria-label="Open Idaho Field Explorer">
          <path d={idaho.d} fill="transparent" className="cursor-pointer" />
        </Link>
      )}
    </svg>
  );
}

export const WesternAtlasMap = memo(WesternAtlasMapImpl);