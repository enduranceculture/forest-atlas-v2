// React binding over the browser-local Field Kit storage.
// Loads once on mount, mutates via helper functions, persists to IDB + localStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Waypoint } from "@/data/schema";
import { loadSnapshot, saveSnapshot } from "@/lib/field-kit-storage";
import {
  newId,
  nowIso,
  renumberStops,
  sortStops,
  type FieldKitCollection,
  type FieldKitResearchRef,
  type FieldKitSnapshot,
  type FieldKitStop,
  type ImportedStopLine,
  type ImportedStopWpt,
  FIELD_KIT_SCHEMA_VERSION,
} from "@/lib/field-kit-types";

const EMPTY: FieldKitSnapshot = {
  schemaVersion: FIELD_KIT_SCHEMA_VERSION,
  collections: [],
  activeId: null,
};

export type UseFieldKit = {
  ready: boolean;
  snapshot: FieldKitSnapshot;
  active: FieldKitCollection | null;
  createCollection: (name: string) => FieldKitCollection;
  renameCollection: (id: string, name: string) => void;
  updateCollectionMeta: (id: string, patch: Partial<Pick<FieldKitCollection, "description" | "privateNotes">>) => void;
  duplicateCollection: (id: string) => FieldKitCollection | null;
  deleteCollection: (id: string) => void;
  clearCollection: (id: string) => void;
  setActive: (id: string | null) => void;
  addSiteStop: (site: Waypoint) => { added: boolean; existed: boolean };
  addImportedWpt: (w: ImportedStopWpt) => void;
  addImportedLine: (l: ImportedStopLine) => void;
  removeStop: (stopId: string) => void;
  reorderStop: (stopId: string, direction: "up" | "down") => void;
  updateStopMeta: (stopId: string, patch: Partial<Pick<FieldKitStop, "userName" | "userNotes">>) => void;
  addResearchRef: (ref: Omit<FieldKitResearchRef, "id">) => { added: boolean; existed: boolean };
  removeResearchRef: (refId: string) => void;
};

export function useFieldKit(): UseFieldKit {
  const [snapshot, setSnapshot] = useState<FieldKitSnapshot>(EMPTY);
  const [ready, setReady] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSnapshot().then((snap) => {
      if (!cancelled) {
        setSnapshot(snap);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: FieldKitSnapshot) => {
    setSnapshot(next);
    if (saving.current) return;
    saving.current = true;
    // Debounce trivially with a microtask so back-to-back mutations write once.
    queueMicrotask(async () => {
      saving.current = false;
      try {
        await saveSnapshot(next);
      } catch {
        /* best effort */
      }
    });
  }, []);

  const active = useMemo(() => {
    if (!snapshot.activeId) return null;
    return snapshot.collections.find((c) => c.id === snapshot.activeId) ?? null;
  }, [snapshot]);

  const patchActive = useCallback(
    (patcher: (col: FieldKitCollection) => FieldKitCollection): void => {
      setSnapshot((prev) => {
        if (!prev.activeId) return prev;
        const next: FieldKitSnapshot = {
          ...prev,
          collections: prev.collections.map((c) =>
            c.id === prev.activeId ? { ...patcher(c), updatedAt: nowIso() } : c,
          ),
        };
        // fire-and-forget persistence
        void saveSnapshot(next);
        return next;
      });
    },
    [],
  );

  const createCollection = useCallback(
    (name: string): FieldKitCollection => {
      const created: FieldKitCollection = {
        id: newId("col"),
        name: name.trim() || "Untitled kit",
        stops: [],
        researchRefs: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      setSnapshot((prev) => {
        const next: FieldKitSnapshot = {
          ...prev,
          collections: [...prev.collections, created],
          activeId: created.id,
        };
        void saveSnapshot(next);
        return next;
      });
      return created;
    },
    [],
  );

  const renameCollection = useCallback((id: string, name: string) => {
    setSnapshot((prev) => {
      const next: FieldKitSnapshot = {
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === id ? { ...c, name: name.trim() || c.name, updatedAt: nowIso() } : c,
        ),
      };
      void saveSnapshot(next);
      return next;
    });
  }, []);

  const updateCollectionMeta: UseFieldKit["updateCollectionMeta"] = useCallback(
    (id, patch) => {
      setSnapshot((prev) => {
        const next: FieldKitSnapshot = {
          ...prev,
          collections: prev.collections.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
          ),
        };
        void saveSnapshot(next);
        return next;
      });
    },
    [],
  );

  const duplicateCollection = useCallback((id: string): FieldKitCollection | null => {
    let created: FieldKitCollection | null = null;
    setSnapshot((prev) => {
      const src = prev.collections.find((c) => c.id === id);
      if (!src) return prev;
      created = {
        ...src,
        id: newId("col"),
        name: `${src.name} (copy)`,
        stops: src.stops.map((s) => ({ ...s, id: newId("stop") })),
        researchRefs: src.researchRefs.map((r) => ({ ...r, id: newId("ref") })),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      const next: FieldKitSnapshot = {
        ...prev,
        collections: [...prev.collections, created],
        activeId: created.id,
      };
      void saveSnapshot(next);
      return next;
    });
    return created;
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setSnapshot((prev) => {
      const remaining = prev.collections.filter((c) => c.id !== id);
      const next: FieldKitSnapshot = {
        ...prev,
        collections: remaining,
        activeId: prev.activeId === id ? remaining[0]?.id ?? null : prev.activeId,
      };
      void saveSnapshot(next);
      return next;
    });
  }, []);

  const clearCollection = useCallback((id: string) => {
    setSnapshot((prev) => {
      const next: FieldKitSnapshot = {
        ...prev,
        collections: prev.collections.map((c) =>
          c.id === id ? { ...c, stops: [], researchRefs: [], updatedAt: nowIso() } : c,
        ),
      };
      void saveSnapshot(next);
      return next;
    });
  }, []);

  const setActive = useCallback((id: string | null) => {
    setSnapshot((prev) => {
      if (id && !prev.collections.some((c) => c.id === id)) return prev;
      const next: FieldKitSnapshot = { ...prev, activeId: id };
      void saveSnapshot(next);
      return next;
    });
  }, []);

  const ensureActive = useCallback((): FieldKitCollection => {
    // Called at mutation time to guarantee an active collection.
    if (active) return active;
    return createCollection("My field kit");
  }, [active, createCollection]);

  const addSiteStop: UseFieldKit["addSiteStop"] = useCallback(
    (site) => {
      const col = ensureActive();
      const existed = col.stops.some(
        (s) => s.kind === "site" && s.publicId === site.id,
      );
      if (existed) return { added: false, existed: true };
      patchActive((c) => ({
        ...c,
        stops: renumberStops([
          ...c.stops,
          {
            id: newId("stop"),
            order: c.stops.length,
            kind: "site",
            publicId: site.id,
          },
        ]),
      }));
      return { added: true, existed: false };
    },
    [ensureActive, patchActive],
  );

  const addImportedWpt: UseFieldKit["addImportedWpt"] = useCallback(
    (w) => {
      ensureActive();
      patchActive((c) => ({
        ...c,
        stops: renumberStops([
          ...c.stops,
          {
            id: newId("stop"),
            order: c.stops.length,
            kind: "imported-wpt",
            imported: w,
          },
        ]),
      }));
    },
    [ensureActive, patchActive],
  );

  const addImportedLine: UseFieldKit["addImportedLine"] = useCallback(
    (l) => {
      ensureActive();
      patchActive((c) => ({
        ...c,
        stops: renumberStops([
          ...c.stops,
          {
            id: newId("stop"),
            order: c.stops.length,
            kind: "imported-line",
            imported: l,
          },
        ]),
      }));
    },
    [ensureActive, patchActive],
  );

  const removeStop: UseFieldKit["removeStop"] = useCallback(
    (stopId) => {
      patchActive((c) => ({
        ...c,
        stops: renumberStops(c.stops.filter((s) => s.id !== stopId)),
      }));
    },
    [patchActive],
  );

  const reorderStop: UseFieldKit["reorderStop"] = useCallback(
    (stopId, direction) => {
      patchActive((c) => {
        const sorted = sortStops(c.stops);
        const idx = sorted.findIndex((s) => s.id === stopId);
        if (idx < 0) return c;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= sorted.length) return c;
        const swapped = [...sorted];
        [swapped[idx], swapped[target]] = [swapped[target], swapped[idx]];
        return { ...c, stops: renumberStops(swapped) };
      });
    },
    [patchActive],
  );

  const updateStopMeta: UseFieldKit["updateStopMeta"] = useCallback(
    (stopId, patch) => {
      patchActive((c) => ({
        ...c,
        stops: c.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)),
      }));
    },
    [patchActive],
  );

  const addResearchRef: UseFieldKit["addResearchRef"] = useCallback(
    (ref) => {
      const col = ensureActive();
      const existed = col.researchRefs.some(
        (r) => r.kind === ref.kind && r.publicId === ref.publicId,
      );
      if (existed) return { added: false, existed: true };
      patchActive((c) => ({
        ...c,
        researchRefs: [...c.researchRefs, { ...ref, id: newId("ref") }],
      }));
      return { added: true, existed: false };
    },
    [ensureActive, patchActive],
  );

  const removeResearchRef: UseFieldKit["removeResearchRef"] = useCallback(
    (refId) => {
      patchActive((c) => ({
        ...c,
        researchRefs: c.researchRefs.filter((r) => r.id !== refId),
      }));
    },
    [patchActive],
  );

  // Note: `commit` is intentionally exposed via internal use; effects above
  // already persist. Keep the reference to silence unused-var linter.
  void commit;

  return {
    ready,
    snapshot,
    active,
    createCollection,
    renameCollection,
    updateCollectionMeta,
    duplicateCollection,
    deleteCollection,
    clearCollection,
    setActive,
    addSiteStop,
    addImportedWpt,
    addImportedLine,
    removeStop,
    reorderStop,
    updateStopMeta,
    addResearchRef,
    removeResearchRef,
  };
}