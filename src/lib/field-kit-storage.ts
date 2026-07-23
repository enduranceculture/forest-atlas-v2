// Browser-local storage for the Field Kit. IndexedDB is primary; localStorage
// is a small fallback / preference cache. Never uploads content.
import {
  FIELD_KIT_DB,
  FIELD_KIT_DB_VERSION,
  FIELD_KIT_LS_ACTIVE,
  FIELD_KIT_LS_COLLECTIONS,
  FIELD_KIT_SCHEMA_VERSION,
  migrateSnapshot,
  type FieldKitCollection,
  type FieldKitSnapshot,
} from "./field-kit-types";

function hasIdb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIdb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(FIELD_KIT_DB, FIELD_KIT_DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const oldVersion = ev.oldVersion ?? 0;
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("collections")) {
          db.createObjectStore("collections", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      }
      // Future versions: add `if (oldVersion < 2) { migrate rows in `collections` }`.
    };
    req.onblocked = () => resolve(null);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
  });
}

function readLocalSnapshot(): FieldKitSnapshot {
  if (typeof localStorage === "undefined") {
    return { schemaVersion: FIELD_KIT_SCHEMA_VERSION, collections: [], activeId: null };
  }
  try {
    const raw = localStorage.getItem(FIELD_KIT_LS_COLLECTIONS);
    if (!raw) {
      const activeRaw = localStorage.getItem(FIELD_KIT_LS_ACTIVE);
      return {
        schemaVersion: FIELD_KIT_SCHEMA_VERSION,
        collections: [],
        activeId: activeRaw,
      };
    }
    return migrateSnapshot(JSON.parse(raw));
  } catch {
    return { schemaVersion: FIELD_KIT_SCHEMA_VERSION, collections: [], activeId: null };
  }
}

function writeLocalSnapshot(snap: FieldKitSnapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FIELD_KIT_LS_COLLECTIONS, JSON.stringify(snap));
    if (snap.activeId) localStorage.setItem(FIELD_KIT_LS_ACTIVE, snap.activeId);
    else localStorage.removeItem(FIELD_KIT_LS_ACTIVE);
  } catch {
    /* quota — swallow; IDB is primary */
  }
}

async function readIdbSnapshot(db: IDBDatabase): Promise<FieldKitSnapshot> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(["collections", "meta"], "readonly");
      const colStore = tx.objectStore("collections");
      const metaStore = tx.objectStore("meta");
      const getAll = colStore.getAll();
      const getActive = metaStore.get("activeId");
      const getVersion = metaStore.get("schemaVersion");
      tx.oncomplete = () => {
        const raw = {
          schemaVersion:
            (getVersion.result as { key: string; value: number } | undefined)?.value ??
            FIELD_KIT_SCHEMA_VERSION,
          collections: (getAll.result as FieldKitCollection[]) ?? [],
          activeId:
            (getActive.result as { key: string; value: string | null } | undefined)?.value ??
            null,
        };
        resolve(migrateSnapshot(raw));
      };
      tx.onerror = () => resolve({ schemaVersion: FIELD_KIT_SCHEMA_VERSION, collections: [], activeId: null });
      tx.onabort = () => resolve({ schemaVersion: FIELD_KIT_SCHEMA_VERSION, collections: [], activeId: null });
    } catch {
      resolve({ schemaVersion: FIELD_KIT_SCHEMA_VERSION, collections: [], activeId: null });
    }
  });
}

async function writeIdbSnapshot(db: IDBDatabase, snap: FieldKitSnapshot): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(["collections", "meta"], "readwrite");
      const colStore = tx.objectStore("collections");
      const metaStore = tx.objectStore("meta");
      colStore.clear();
      for (const c of snap.collections) colStore.put(c);
      metaStore.put({ key: "activeId", value: snap.activeId });
      metaStore.put({ key: "schemaVersion", value: snap.schemaVersion });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadSnapshot(): Promise<FieldKitSnapshot> {
  const db = await openDb();
  if (db) {
    try {
      const snap = await readIdbSnapshot(db);
      db.close();
      if (snap.collections.length > 0 || snap.activeId) return snap;
      // If IDB is empty, prefer any legacy localStorage snapshot for one-time recovery.
      const local = readLocalSnapshot();
      return local;
    } catch {
      return readLocalSnapshot();
    }
  }
  return readLocalSnapshot();
}

export async function saveSnapshot(snap: FieldKitSnapshot): Promise<void> {
  // Mirror to localStorage as a preference/fallback cache so a shell reload
  // can render the last-known kit even if IDB briefly rejects a transaction.
  writeLocalSnapshot(snap);
  const db = await openDb();
  if (db) {
    await writeIdbSnapshot(db, snap);
    db.close();
  }
}