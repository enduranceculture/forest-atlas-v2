// Build a shareable URL that includes only public state: dataset mode,
// selected public ID, filters, basemap, map center, and active collection ID.
// Private notes, imported GPX payloads, and Field Kit contents are NEVER
// encoded in this URL. Recipients who load it see the same public dataset
// state; their own Field Kits (loaded from their local IDB) are separate.
import { IDAHO_SEARCH_DEFAULTS, type IdahoSearch } from "./url-state";

export type ShareUrlInput = {
  origin: string; // e.g. window.location.origin
  pathname?: string; // defaults to "/idaho"
  search: IdahoSearch;
  activeCollectionId: string | null;
};

/**
 * Produce a canonical share URL. Empty/default params are stripped so the
 * URL stays short and predictable across recipients.
 *
 * SAFETY: privateNotes, userNotes, imported payloads, and Field Kit stops
 * live only in browser storage — this builder cannot reach them and never
 * accepts them as inputs.
 */
export function buildShareUrl(input: ShareUrlInput): string {
  const base = `${input.origin}${input.pathname ?? "/idaho"}`;
  const params = new URLSearchParams();
  const merged: IdahoSearch = {
    ...input.search,
    col: input.activeCollectionId ?? "",
  };
  for (const [k, v] of Object.entries(merged)) {
    if (v == null) continue;
    const s = String(v);
    const def = (IDAHO_SEARCH_DEFAULTS as Record<string, unknown>)[k];
    if (s === "" || s === String(def)) continue;
    params.set(k, s);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}