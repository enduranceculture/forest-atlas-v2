// Forest Field Kit — browser-local trip planner.
// Storage is local-first (IndexedDB with a localStorage fallback). Nothing
// here is ever uploaded or transmitted; imported GPX payloads and private
// notes stay on the device.

export const FIELD_KIT_DB = "forest-atlas-west-kit";
export const FIELD_KIT_DB_VERSION = 1;
export const FIELD_KIT_LS_COLLECTIONS = "fkw:collections:v1";
export const FIELD_KIT_LS_ACTIVE = "fkw:active:v1";
export const FIELD_KIT_SCHEMA_VERSION = 1;

export type ImportedStopWpt = {
  kind: "wpt";
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number | null;
  time?: string | null;
  description?: string | null;
};

export type ImportedStopLine = {
  kind: "line";
  lineKind: "route" | "track";
  name: string;
  coordinates: Array<[number, number]>;
};

export type FieldKitStop = {
  id: string;
  order: number;
  // 'site' stops reference bundled Field Sites via publicId (Waypoint.id).
  // 'imported-*' stops carry the payload locally — never in URLs, never uploaded.
  kind: "site" | "imported-wpt" | "imported-line";
  publicId?: string;
  imported?: ImportedStopWpt | ImportedStopLine;
  userName?: string;
  userNotes?: string; // private — never in share URL, never in GPX unless opted in
};

export type FieldKitResearchRef = {
  id: string;
  kind: "inventory-fireshed";
  publicId: string; // OBJECTID as string
  label: string;
  note?: string; // private
};

export type FieldKitCollection = {
  id: string;
  name: string;
  description?: string;
  privateNotes?: string;
  stops: FieldKitStop[];
  researchRefs: FieldKitResearchRef[];
  datasetVersions?: { sites?: string; inventory?: string };
  createdAt: string;
  updatedAt: string;
};

export type FieldKitSnapshot = {
  schemaVersion: number;
  collections: FieldKitCollection[];
  activeId: string | null;
};

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function sortStops(stops: FieldKitStop[]): FieldKitStop[] {
  return [...stops].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function renumberStops(stops: FieldKitStop[]): FieldKitStop[] {
  return sortStops(stops).map((s, i) => ({ ...s, order: i }));
}

/**
 * Migration entry point. Accepts any prior JSON shape and returns a valid
 * current-version snapshot. Unknown/corrupt shapes reset to an empty snapshot
 * so the app never renders broken data.
 */
export function migrateSnapshot(raw: unknown): FieldKitSnapshot {
  const empty: FieldKitSnapshot = {
    schemaVersion: FIELD_KIT_SCHEMA_VERSION,
    collections: [],
    activeId: null,
  };
  if (!raw || typeof raw !== "object") return empty;
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.schemaVersion === "number" ? obj.schemaVersion : 0;
  const cols = Array.isArray(obj.collections) ? obj.collections : [];
  const activeId =
    typeof obj.activeId === "string" || obj.activeId === null
      ? (obj.activeId as string | null)
      : null;

  // Currently v1 is the only version. Add `if (version < 2) { ... }` blocks
  // here when the schema evolves; each block should mutate cols in place.
  void version;

  const clean: FieldKitCollection[] = [];
  for (const c of cols) {
    if (!c || typeof c !== "object") continue;
    const cc = c as Partial<FieldKitCollection>;
    if (typeof cc.id !== "string" || typeof cc.name !== "string") continue;
    const stops = Array.isArray(cc.stops)
      ? (cc.stops.filter(
          (s) => s && typeof s === "object" && typeof (s as FieldKitStop).id === "string",
        ) as FieldKitStop[])
      : [];
    const refs = Array.isArray(cc.researchRefs)
      ? (cc.researchRefs.filter(
          (r) => r && typeof r === "object" && typeof (r as FieldKitResearchRef).id === "string",
        ) as FieldKitResearchRef[])
      : [];
    clean.push({
      id: cc.id,
      name: cc.name,
      description: typeof cc.description === "string" ? cc.description : undefined,
      privateNotes: typeof cc.privateNotes === "string" ? cc.privateNotes : undefined,
      stops: renumberStops(stops),
      researchRefs: refs,
      datasetVersions: cc.datasetVersions,
      createdAt: typeof cc.createdAt === "string" ? cc.createdAt : nowIso(),
      updatedAt: typeof cc.updatedAt === "string" ? cc.updatedAt : nowIso(),
    });
  }
  const validActive =
    activeId && clean.some((c) => c.id === activeId) ? activeId : clean[0]?.id ?? null;
  return {
    schemaVersion: FIELD_KIT_SCHEMA_VERSION,
    collections: clean,
    activeId: validActive,
  };
}