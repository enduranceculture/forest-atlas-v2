import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polygon,
  Polyline,
  useMap,
  useMapEvents,
  ZoomControl,
  ScaleControl,
} from "react-leaflet";
import L from "leaflet";
import type { ImportedBundle, Waypoint } from "@/data/schema";
import { CATEGORY_META } from "@/data/idaho/categories";
import { IDAHO_FOREST_CONTEXT } from "@/data/idaho/context";
import { densityColor } from "@/data/western/density";
import type { FireshedInventoryFeature } from "@/data/idaho/fireshed/schema";
import type { MapView } from "@/lib/url-state";

const IDAHO_CENTER: [number, number] = [45.0, -114.5];
const IDAHO_ZOOM = 6;

export type Basemap = "dark" | "light" | "topo";

const BASEMAPS: Record<Basemap, { url: string; attribution: string; subdomains?: string[] }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: ["a", "b", "c", "d"],
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: ["a", "b", "c", "d"],
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap, SRTM &copy; OpenTopoMap (CC-BY-SA)",
    subdomains: ["a", "b", "c"],
  },
};

export type LayerFlags = {
  sites: boolean;
  halos: boolean;
  imports: boolean;
  context: boolean;
};

function markerIcon(
  color: string,
  active: boolean,
  precision: Waypoint["precision"],
  basemap: Basemap,
) {
  const size = active ? 26 : 18;
  // On the light basemap, plain white ring vanishes against pale terrain — swap in a dark spruce hairline.
  const idleRing = basemap === "light" ? "rgba(15,32,28,0.75)" : "rgba(255,255,255,0.55)";
  const ring = active ? "var(--ember)" : idleRing;
  const isExact = precision === "exact";
  const shape = isExact
    ? `border-radius:9999px;`
    : precision === "site-center"
    ? `border-radius:4px;transform:rotate(45deg);`
    : `border-radius:9999px;border:2px dashed rgba(255,255,255,0.75);`;
  const inner = isExact
    ? `<div style="width:${Math.round(size / 3)}px;height:${Math.round(size / 3)}px;border-radius:9999px;background:rgba(255,255,255,0.95);"></div>`
    : "";
  const activeShadow = active
    ? `,0 0 0 5px color-mix(in oklab, var(--ember) 45%, transparent)`
    : "";
  const html = `<div style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 0 2px ${ring}${activeShadow},0 2px 8px rgba(0,0,0,0.5);display:grid;place-items:center;${shape}">${inner}</div>`;
  return L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function importedIcon() {
  const html = `<div style="width:16px;height:16px;border-radius:9999px;background:var(--ember);box-shadow:0 0 0 2px rgba(255,255,255,0.85),0 2px 6px rgba(0,0,0,0.5);"></div>`;
  return L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] });
}

function FitToWaypoints({
  waypoints,
  selected,
  resetKey,
  suppressInitialFit,
}: {
  waypoints: Waypoint[];
  selected: Waypoint | null;
  resetKey: number;
  suppressInitialFit: boolean;
}) {
  const map = useMap();
  // Keep the latest waypoints in a ref so identity changes (new array from
  // parent re-renders) don't retrigger a refit. Only explicit user intent
  // — selecting a site or hitting Reset — moves the map.
  const waypointsRef = useRef(waypoints);
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  // Fly to a newly selected site.
  useEffect(() => {
    if (!selected) return;
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 9), { duration: 0.8 });
  }, [map, selected]);

  // Initial fit on mount, and re-fit only when the user presses Reset.
  // If a URL-restored view is being applied, suppress the initial fit so
  // browser back/forward preserves the exact center + zoom.
  const initialFitSuppressed = useRef(suppressInitialFit);
  useEffect(() => {
    if (initialFitSuppressed.current && resetKey === 0) {
      // Consume the suppress flag for the first pass only.
      initialFitSuppressed.current = false;
      return;
    }
    const wps = waypointsRef.current;
    if (wps.length === 0) {
      map.flyTo(IDAHO_CENTER, IDAHO_ZOOM, { duration: 0.6 });
      return;
    }
    const bounds = L.latLngBounds(wps.map((w: Waypoint) => [w.latitude, w.longitude] as [number, number]));
    map.fitBounds(bounds.pad(0.25), { animate: false });
  }, [map, resetKey]);
  return null;
}

// Debounced moveend tracker for URL persistence.
function MapViewTracker({ onChange }: { onChange?: (v: MapView) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  }, [onChange]);
  useMapEvents({
    moveend(e) {
      if (!cb.current) return;
      if (timer.current) clearTimeout(timer.current);
      const map = e.target as L.Map;
      timer.current = setTimeout(() => {
        const c = map.getCenter();
        cb.current?.({ lat: c.lat, lon: c.lng, zoom: map.getZoom() });
      }, 350);
    },
  });
  return null;
}

// Convert GeoJSON [lon,lat] rings to Leaflet [lat,lon] pairs.
function toLeafletRings(coords: number[][][]): [number, number][][] {
  return coords.map((ring) => ring.map(([lon, lat]) => [lat, lon] as [number, number]));
}

function InventoryPolygons({
  features,
  selectedOid,
  hoverOid,
  onSelect,
  onHover,
  basemap,
}: {
  features: FireshedInventoryFeature[];
  selectedOid: number | null;
  hoverOid: number | null;
  onSelect: (oid: number) => void;
  onHover: (oid: number | null) => void;
  basemap: Basemap;
}) {
  return (
    <>
      {features.map((f) => {
        const oid = f.properties.OBJECTID;
        const active = oid === selectedOid || oid === hoverOid;
        const rings: [number, number][][][] =
          f.geometry.type === "Polygon"
            ? [toLeafletRings(f.geometry.coordinates)]
            : f.geometry.coordinates.map(toLeafletRings);
        return (
          <Polygon
            key={oid}
            positions={rings}
            pathOptions={{
              color: active ? "var(--ember)" : basemap === "light" ? "#1b3a34" : "var(--lichen)",
              weight: active ? 2 : 1,
              opacity: active ? 0.95 : 0.7,
              fillColor: active ? "var(--ember)" : "var(--lichen)",
              fillOpacity: active ? 0.25 : 0.12,
            }}
            eventHandlers={{
              click: () => onSelect(oid),
              mouseover: () => onHover(oid),
              mouseout: () => onHover(null),
            }}
          />
        );
      })}
    </>
  );
}

function LocateLayer({
  requestKey,
  onError,
}: {
  requestKey: number;
  onError: (msg: string) => void;
}) {
  const map = useMap();
  const [pos, setPos] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  // Keep onError in a ref so its identity (new closure each parent render)
  // does not re-trigger geolocation on unrelated re-renders.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    if (requestKey === 0) return;
    if (!("geolocation" in navigator)) {
      onErrorRef.current("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy });
        map.flyTo([p.coords.latitude, p.coords.longitude], 11, { duration: 0.9 });
      },
      (err) => onErrorRef.current(err.message || "Could not read location."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    );
  }, [map, requestKey]);
  if (!pos) return null;
  return (
    <>
      <Circle
        center={[pos.lat, pos.lon]}
        radius={pos.accuracy}
        pathOptions={{ color: "var(--ember)", weight: 1, opacity: 0.55, fillOpacity: 0.08 }}
      />
      <Marker position={[pos.lat, pos.lon]} icon={importedIcon()} />
    </>
  );
}

type Props = {
  waypoints: Waypoint[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (w: Waypoint) => void;
  onHover: (id: string | null) => void;
  basemap: Basemap;
  layers: LayerFlags;
  imports: ImportedBundle[];
  locateRequestKey: number;
  onLocateError: (msg: string) => void;
  resetKey: number;
  initialView?: MapView | null;
  onViewChange?: (v: MapView) => void;
  inventoryFeatures?: FireshedInventoryFeature[];
  inventorySelectedOid?: number | null;
  inventoryHoverOid?: number | null;
  onInventorySelect?: (oid: number) => void;
  onInventoryHover?: (oid: number | null) => void;
  showSites?: boolean;
};

export default function IdahoMapClient({
  waypoints,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  basemap,
  layers,
  imports,
  locateRequestKey,
  onLocateError,
  resetKey,
  initialView,
  onViewChange,
  inventoryFeatures,
  inventorySelectedOid = null,
  inventoryHoverOid = null,
  onInventorySelect,
  onInventoryHover,
  showSites = true,
}: Props) {
  const selected = useMemo(
    () => waypoints.find((w) => w.id === selectedId) ?? null,
    [waypoints, selectedId]
  );
  const bm = BASEMAPS[basemap];
  const initialCenter: [number, number] = initialView
    ? [initialView.lat, initialView.lon]
    : IDAHO_CENTER;
  const initialZoom = initialView?.zoom ?? IDAHO_ZOOM;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      minZoom={5}
      maxZoom={14}
      className="h-full w-full"
      style={{ background: "var(--spruce-deep)" }}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer key={basemap} attribution={bm.attribution} url={bm.url} subdomains={bm.subdomains} />

      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" imperial={true} metric={true} />

      {layers.context &&
        IDAHO_FOREST_CONTEXT.map((p) => (
          <Polygon
            key={p.id}
            positions={p.ring}
            pathOptions={{
              color: densityColor(p.densityClass),
              weight: basemap === "light" ? 1.1 : 0.8,
              opacity: basemap === "light" ? 0.85 : 0.55,
              fillColor: densityColor(p.densityClass),
              fillOpacity: basemap === "light" ? 0.22 : 0.12,
            }}
            interactive={false}
          />
        ))}

      {showSites && layers.halos &&
        waypoints
          .filter((w) => typeof w.accuracyMeters === "number" && w.accuracyMeters! > 0)
          .map((w) => (
            <Circle
              key={`halo-${w.id}`}
              center={[w.latitude, w.longitude]}
              radius={w.accuracyMeters!}
              pathOptions={{
                color: CATEGORY_META[w.category].color,
                weight: basemap === "light" ? 1.4 : 1,
                opacity:
                  basemap === "light"
                    ? w.precision === "exact"
                      ? 0.6
                      : 0.8
                    : w.precision === "exact"
                    ? 0.35
                    : 0.55,
                dashArray: w.precision === "exact" ? undefined : "3 4",
                fillOpacity: basemap === "light" ? 0.1 : 0.06,
              }}
              interactive={false}
            />
          ))}

      {showSites && layers.sites &&
        waypoints.map((w) => {
          const active = w.id === selectedId || w.id === hoverId;
          return (
            <Marker
              key={w.id}
              position={[w.latitude, w.longitude]}
              icon={markerIcon(CATEGORY_META[w.category].color, active, w.precision, basemap)}
              eventHandlers={{
                click: () => onSelect(w),
                mouseover: () => onHover(w.id),
                mouseout: () => onHover(null),
              }}
              keyboard={true}
              title={w.name}
            />
          );
        })}

      {showSites && layers.imports &&
        imports.map((b) => (
          <Fragment key={b.importedAt + b.fileName}>
            {b.waypoints.map((w) => (
              <Marker
                key={w.id}
                position={[w.latitude, w.longitude]}
                icon={importedIcon()}
                title={`Imported: ${w.name}`}
              />
            ))}
            {b.lines.map((l) => (
              <Polyline
                key={l.id}
                positions={l.coordinates}
                pathOptions={{
                  color: "var(--ember)",
                  weight: 3,
                  opacity: 0.85,
                  dashArray: l.kind === "route" ? "6 4" : undefined,
                }}
              />
            ))}
          </Fragment>
        ))}

      {inventoryFeatures && inventoryFeatures.length > 0 && (
        <InventoryPolygons
          features={inventoryFeatures}
          selectedOid={inventorySelectedOid}
          hoverOid={inventoryHoverOid}
          onSelect={(oid) => onInventorySelect?.(oid)}
          onHover={(oid) => onInventoryHover?.(oid)}
          basemap={basemap}
        />
      )}

      <FitToWaypoints
        waypoints={waypoints}
        selected={selected}
        resetKey={resetKey}
        suppressInitialFit={!!initialView}
      />
      <MapViewTracker onChange={onViewChange} />
      <LocateLayer requestKey={locateRequestKey} onError={onLocateError} />
    </MapContainer>
  );
}