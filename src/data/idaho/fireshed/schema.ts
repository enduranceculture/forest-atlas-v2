import { z } from "zod";

// Nine_Class values are the exact source classification strings observed in
// the USDA Forest Service Fireshed Mature and Old Growth Area layer (MapServer
// layer 29). If the source publishes a new class, sync-fireshed.ts must fail
// loudly rather than let the app invent an interpretation.
// Source-native values: the USDA layer returns Nine_Class as a stringified
// integer 1..9 encoding a joint mature × old-growth abundance class.
// Display labels live in classes.ts and are never conflated with percentages.
export const NINE_CLASS_VALUES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;
export type NineClass = (typeof NINE_CLASS_VALUES)[number];
export const NineClassSchema = z.enum(NINE_CLASS_VALUES);

// Coordinate + ring integrity — never silently repair source geometry.
const LonLat = z
  .tuple([z.number(), z.number()])
  .refine(
    ([lon, lat]) =>
      Number.isFinite(lon) &&
      Number.isFinite(lat) &&
      lon >= -180 &&
      lon <= 180 &&
      lat >= -90 &&
      lat <= 90,
    { message: "coordinate out of EPSG:4326 range" },
  );

const LinearRing = z
  .array(LonLat)
  .min(4, "ring has fewer than 4 coordinates")
  .refine(
    (ring) => {
      const a = ring[0];
      const b = ring[ring.length - 1];
      return a[0] === b[0] && a[1] === b[1];
    },
    { message: "ring is not closed" },
  );

export const PolygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(LinearRing).min(1),
});

export const MultiPolygonGeometrySchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(LinearRing).min(1)).min(1),
});

export const FireshedGeometrySchema = z.discriminatedUnion("type", [
  PolygonGeometrySchema,
  MultiPolygonGeometrySchema,
]);
export type FireshedGeometry = z.infer<typeof FireshedGeometrySchema>;

// Source field names are preserved unchanged in the raw snapshot.
// MATURE_SE_PERC and OLD_GROWTH_SE_PERC are percent standard error values from
// FIA plot summaries. They are NOT confidence intervals or accuracy figures.
export const FireshedInventoryPropertiesSchema = z.object({
  OBJECTID: z.number().int().positive(),
  Fireshed_Name: z.string().min(1),
  MajRegion: z.string(),
  MATURE_ACRES: z.number().finite().nonnegative(),
  MATURE_SE_PERC: z.number().finite().nonnegative(),
  OLD_GROWTH_ACRES: z.number().finite().nonnegative(),
  OLD_GROWTH_SE_PERC: z.number().finite().nonnegative(),
  ForestType: z.string(),
  Division: z.string(),
  Nine_Class: NineClassSchema,
  Trimmed_Area: z.number().finite().nonnegative(),
});
export type FireshedInventoryProperties = z.infer<
  typeof FireshedInventoryPropertiesSchema
>;

export const FireshedInventoryFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: FireshedInventoryPropertiesSchema,
  geometry: FireshedGeometrySchema,
});
export type FireshedInventoryFeature = z.infer<
  typeof FireshedInventoryFeatureSchema
>;

export const FireshedInventoryCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(FireshedInventoryFeatureSchema).min(1),
});
export type FireshedInventoryCollection = z.infer<
  typeof FireshedInventoryCollectionSchema
>;

export const FireshedProvenanceSchema = z.object({
  scriptVersion: z.string(),
  retrievedAt: z.string(),
  source: z.object({
    service: z.string().url(),
    layerId: z.literal(29),
    layerName: z.string(),
    description: z.string(),
    capabilities: z.string(),
    supportedQueryFormats: z.string(),
    currentVersion: z.string(),
    nativeSpatialReferenceWkid: z.number().int(),
    mapServiceSpatialReferenceWkid: z.number().int(),
    requestedSpatialReferenceWkid: z.number().int(),
  }),
  query: z.object({
    endpoint: z.string().url(),
    parameters: z.record(z.string(), z.string()),
    fields: z.array(z.string()),
    sourceSpatialReference: z.object({ wkid: z.number().int() }),
    outputSpatialReference: z.object({ wkid: z.number().int() }),
    pagination: z.object({
      strategy: z.string(),
      maxRecordCount: z.number().int().positive(),
    }),
    selection: z.object({
      method: z.enum([
        "server-polygon-intersects",
        "envelope-candidates+local-exact-polygon-intersection",
      ]),
      serverPolygonQueryError: z.string().nullable(),
      localIntersectionLibrary: z.string().nullable(),
    }),
  }),
  idahoBoundary: z.object({
    source: z.string(),
    sourceUrl: z.string().url(),
    year: z.literal(2025),
    scale: z.literal("1:500,000"),
    geoid: z.literal("16"),
    stateFipsCode: z.literal("16"),
    stateName: z.literal("Idaho"),
    envelope: z.object({
      xmin: z.number(),
      ymin: z.number(),
      xmax: z.number(),
      ymax: z.number(),
    }),
    sha256: z.string(),
    byteLength: z.number().int().positive(),
    geometryType: z.enum(["Polygon", "MultiPolygon"]),
  }),
  snapshot: z.object({
    featureCount: z.number().int().positive(),
    spatialCountReported: z.number().int().nullable(),
    candidateCount: z.number().int().nonnegative().nullable(),
    objectIds: z.array(z.number().int().positive()),
    objectIdsDigest: z.string(),
    sha256: z.string(),
    byteLength: z.number().int().positive(),
    coordinateTransform: z.literal(
      "source-faithful; no rounding, quantization, or simplification",
    ),
  }),
  notes: z.object({
    scope: z.string(),
    crossStateFeatures: z.string(),
    accuracyLanguage: z.string(),
    runtimeDependency: z.string(),
  }),
});
export type FireshedProvenance = z.infer<typeof FireshedProvenanceSchema>;