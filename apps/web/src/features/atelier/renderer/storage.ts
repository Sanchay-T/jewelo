import type { View } from "../model";

export const RENDERER_VERSION = "procedural-v1";
export type SnapshotDescriptor = {
  id: string;
  key: string;
  rendererVersion: string;
  availableViews: View[];
  persistent: boolean;
};
export type StoredSnapshot = Omit<SnapshotDescriptor, "persistent"> & {
  blobs: Partial<Record<View, Blob>>;
};
const memory = new Map<string, StoredSnapshot>();
const DATABASE = "caleums-rendered-pieces-v1";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local image storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("snapshots"))
        request.result.createObjectStore("snapshots", { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Local image storage is blocked."));
    request.onsuccess = () => resolve(request.result);
  });
}
/** Immutable UUID snapshots. Memory keeps the current session usable if storage fails. */
export async function saveSnapshotRecord(
  snapshot: StoredSnapshot,
): Promise<SnapshotDescriptor> {
  const previous = await getSnapshot(snapshot.id);
  if (previous && previous.key !== snapshot.key)
    throw new Error("A saved piece cannot be overwritten with another design.");
  const record = previous ?? snapshot;
  memory.set(record.id, record);
  let persistent = false;
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction("snapshots", "readwrite");
      const store = tx.objectStore("snapshots");
      const existing = store.get(record.id);
      existing.onsuccess = () => {
        if (existing.result) {
          if ((existing.result as StoredSnapshot).key !== record.key)
            tx.abort();
        } else store.add(record);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Snapshot already exists."));
    });
    persistent = true;
  } catch {
    // Caller presents the session-only warning; never claim reload recovery here.
  } finally {
    db?.close();
  }
  return {
    id: record.id,
    key: record.key,
    rendererVersion: record.rendererVersion,
    availableViews: record.availableViews,
    persistent,
  };
}
/** Reads only; never substitutes another piece when the requested snapshot is missing. */
export async function getSnapshot(
  id: string,
): Promise<StoredSnapshot | undefined> {
  const cached = memory.get(id);
  if (cached) return cached;
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    const record = await new Promise<StoredSnapshot | undefined>(
      (resolve, reject) => {
        const tx = db!.transaction("snapshots", "readonly");
        const request = tx.objectStore("snapshots").get(id);
        request.onsuccess = () =>
          resolve(request.result as StoredSnapshot | undefined);
        request.onerror = () => reject(request.error);
      },
    );
    if (record) memory.set(id, record);
    return record;
  } catch {
    return undefined;
  } finally {
    db?.close();
  }
}
