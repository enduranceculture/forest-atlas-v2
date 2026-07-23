import { useMemo, memo, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { RegionCollection, RegionFeature } from "@/data/schema";
import { WESTERN_STATES } from "@/data/western/states";
import { WESTERN_CITIES } from "@/data/western/cities";
import { densityColor } from "@/data/western/density";
import { project, ringToPath, VIEW_H, VIEW_W } from "@/lib/projection";

type Props = {
  regions: RegionCollection;
  selectedId: string | null;
  onSelect: (r: RegionFeature | null) => void;
};

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
  const idahoLabel = idaho ? project(-114.6, 44.8) : { x: 0, y: 0 };

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label="Map of mature and old-growth forest regions across the American West">
      <defs>
        <linearGradient id="atlasFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--spruce)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--spruce-deep)" stopOpacity="1" />
        </linearGradient>
        <pattern id="mapTopo" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M -6 20 Q 15 6 30 20 T 66 20 M -6 40 Q 15 26 30 40 T 66 40" fill="none" stroke="var(--lichen)" strokeOpacity="0.08" strokeWidth="0.6" />
        </pattern>
        <filter id="regionGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={VIEW_W} height={VIEW_H} fill="url(#atlasFade)" />
      <rect width={VIEW_W} height={VIEW_H} fill="url(#mapTopo)" />

      <g>
        {stateShapes.map((s) => (
          <path key={s.code} d={s.d} fill="var(--spruce-soft)" fillOpacity="0.35" stroke="var(--mineral-soft)" strokeOpacity="0.6" strokeWidth="0.8" />
        ))}
      </g>

      {/* Subtle state abbreviations, non-interactive */}
      <g pointerEvents="none" aria-hidden="true">
        {stateLabels.map((s) => (
          <text
            key={s.code}
            x={s.x}
            y={s.y}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="11"
            letterSpacing="3"
            fill="var(--bone)"
            fillOpacity="0.18"
          >
            {s.code}
          </text>
        ))}
      </g>

      <g>
        {/* unselected first, then selected on top so its emphasis is never occluded */}
        {regionShapes.filter(({ f }) => f.id !== selectedId).map(({ f, d }) => (
          <path
            key={f.id}
            d={d}
            fill={densityColor(f.properties.densityClass)}
            fillOpacity={selectedId ? 0.55 : 0.78}
            stroke="var(--spruce-deep)"
            strokeWidth={0.5}
            tabIndex={0}
            role="button"
            aria-label={`${f.properties.name}, density class ${f.properties.densityClass}`}
            className="cursor-pointer transition-[fill-opacity,stroke-width] duration-150 focus:outline-none focus-visible:stroke-[var(--ember)]"
            onPointerEnter={(e: ReactPointerEvent<SVGPathElement>) => { if (e.pointerType !== "touch") onSelect(f); }}
            onFocus={() => onSelect(f)}
            onClick={() => onSelect(f)}
          />
        ))}
        {regionShapes.filter(({ f }) => f.id === selectedId).map(({ f, d }) => (
          <g key={f.id} filter="url(#regionGlow)">
            <path
              d={d}
              fill="none"
              stroke="var(--ember)"
              strokeOpacity="0.45"
              strokeWidth="4"
            />
            <path
              d={d}
              fill={densityColor(f.properties.densityClass)}
              fillOpacity={0.98}
              stroke="var(--ember)"
              strokeWidth={1.8}
              tabIndex={0}
              role="button"
              aria-label={`${f.properties.name}, density class ${f.properties.densityClass}, selected`}
              className="cursor-pointer focus:outline-none"
              onFocus={() => onSelect(f)}
              onClick={() => onSelect(f)}
            />
          </g>
        ))}
      </g>

      {idaho && (
        <g pointerEvents="none">
          <path d={idaho.d} fill="none" stroke="var(--ember)" strokeOpacity="0.55" strokeWidth="1.6" />
          <g transform={`translate(${idahoLabel.x}, ${idahoLabel.y})`}>
            <rect x="-56" y="-14" width="112" height="26" rx="13" fill="var(--spruce-deep)" fillOpacity="0.85" stroke="var(--ember)" strokeOpacity="0.6" />
            <text x="0" y="4" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.5" fill="var(--ember-soft)">IDAHO ↗</text>
          </g>
        </g>
      )}

      <g pointerEvents="none">
        {cityPoints.map(({ c, x, y }) => (
          <g key={c.name} transform={`translate(${x}, ${y})`}>
            <circle r="2.5" fill="var(--bone)" opacity="0.9" />
            <circle r="5" fill="none" stroke="var(--bone)" strokeOpacity="0.25" />
            <text x="7" y="3" fontFamily="var(--font-mono)" fontSize="10" fill="var(--bone-dim)" opacity="0.85">{c.name}</text>
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