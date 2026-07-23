import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import type { ImportedBundle, Waypoint } from "@/data/schema";
import type { FireshedInventoryFeature } from "@/data/idaho/fireshed/schema";
import type { MapView } from "@/lib/url-state";
import type { Basemap, LayerFlags } from "./IdahoMapClient";

const IdahoMapClient = lazy(() => import("./IdahoMapClient"));

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

function MapFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-spruce-deep">
      <div className="font-field text-[10px] uppercase tracking-widest text-mineral">Loading terrain…</div>
    </div>
  );
}

export function IdahoMap(props: Props) {
  return (
    <ClientOnly fallback={<MapFallback />}>
      <Suspense fallback={<MapFallback />}>
        <IdahoMapClient {...props} />
      </Suspense>
    </ClientOnly>
  );
}