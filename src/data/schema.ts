import { z } from "zod";

export const DensityClassSchema = z.number().int().min(1).max(9);
export type DensityClass = z.infer<typeof DensityClassSchema>;

const PolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const RegionFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string(),
  properties: z.object({
    name: z.string(),
    state: z.string(),
    densityClass: DensityClassSchema,
    summary: z.string(),
    fireshed: z.string().optional(),
  }),
  geometry: PolygonSchema,
});
export type RegionFeature = z.infer<typeof RegionFeatureSchema>;

export const RegionCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(RegionFeatureSchema),
});
export type RegionCollection = z.infer<typeof RegionCollectionSchema>;

export const PrecisionClassSchema = z.enum(["exact", "approximate", "site-center"]);
export type PrecisionClass = z.infer<typeof PrecisionClassSchema>;

export const SourceTypeSchema = z.enum(["fixture", "documented", "user-import", "field-note"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const GeometryTypeSchema = z.enum(["point", "area", "line"]);
export type GeometryType = z.infer<typeof GeometryTypeSchema>;

export const WaypointSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string(),
  category: z.enum(["Old-growth", "Riparian", "Ecological", "Cultural", "Other"]),
  species: z.string(),
  significance: z.string(),
  access: z.string(),
  confidence: z.enum(["High", "Medium", "Low"]),
  // Provenance & precision (v1 bundled fixtures)
  precision: PrecisionClassSchema,
  geometryType: GeometryTypeSchema,
  accuracyMeters: z.number().positive().nullable().optional(),
  sourceType: SourceTypeSchema,
  sourceName: z.string(),
  sourceUrl: z.string().url().nullable().optional(),
  sourceId: z.string(),
  captureDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type Waypoint = z.infer<typeof WaypointSchema>;
export type Category = Waypoint["category"];
export type Confidence = Waypoint["confidence"];

// Imported (browser-only, ephemeral) GPX features
export type ImportedWaypoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number | null;
  time?: string | null;
  description?: string | null;
};
export type ImportedLine = {
  id: string;
  name: string;
  kind: "route" | "track";
  coordinates: Array<[number, number]>; // [lat, lon]
};
export type ImportedBundle = {
  fileName: string;
  importedAt: string;
  waypoints: ImportedWaypoint[];
  lines: ImportedLine[];
  warnings: string[];
};