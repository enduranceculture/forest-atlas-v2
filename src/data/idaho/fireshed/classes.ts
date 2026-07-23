import { NINE_CLASS_VALUES, type NineClass } from "./schema";

// Display metadata for the source Nine_Class classification. Labels are
// source-faithful (never converted to percentages, never rephrased as
// confidence). The ordering below is a low → high reading of the joint
// mature × old-growth grid and is used only for legend/list sorting.
export const NINE_CLASS_ORDER: readonly NineClass[] = NINE_CLASS_VALUES;

export function isNineClass(value: string): value is NineClass {
  return (NINE_CLASS_VALUES as readonly string[]).includes(value);
}
