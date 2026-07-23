import type { Category } from "../schema";
import type { PrecisionClass, SourceType } from "../schema";

export const CATEGORY_META: Record<Category, { color: string; short: string }> = {
  "Old-growth": { color: "var(--density-8)", short: "OG" },
  Riparian: { color: "var(--density-5)", short: "RIP" },
  Ecological: { color: "var(--lichen)", short: "ECO" },
  Cultural: { color: "var(--ember)", short: "CUL" },
  Other: { color: "var(--mineral)", short: "OTH" },
};

export const ALL_CATEGORIES: Category[] = [
  "Old-growth",
  "Riparian",
  "Ecological",
  "Cultural",
  "Other",
];

export const ALL_PRECISION: PrecisionClass[] = ["exact", "approximate", "site-center"];

export const PRECISION_META: Record<PrecisionClass, { label: string; short: string; color: string; description: string }> = {
  exact: {
    label: "Exact / documented",
    short: "EXACT",
    color: "var(--density-8)",
    description: "Published coordinate at the feature (trailhead, tree, kiosk).",
  },
  approximate: {
    label: "Approximate",
    short: "APPROX",
    color: "var(--density-5)",
    description: "Near the feature; could be off by tens to hundreds of meters.",
  },
  "site-center": {
    label: "Site centroid",
    short: "CENTER",
    color: "var(--ember-soft)",
    description: "Center of a broader stand or area — not a specific point.",
  },
};

export const ALL_SOURCE_TYPES: SourceType[] = ["fixture", "documented", "user-import", "field-note"];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  fixture: "Bundled fixture",
  documented: "Documented source",
  "user-import": "User import",
  "field-note": "Field note",
};