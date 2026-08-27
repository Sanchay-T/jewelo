const DATABASE = "jewelo-ui-spike";
const STORE = "references";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateReference(file: File) {
  if (!ACCEPTED.has(file.type))
    throw new Error(
      "Choose a PNG, JPEG, or WebP image. SVG and active formats are not accepted.",
    );
  if (file.size > MAX_BYTES)
    throw new Error("Reference images must be 5 MB or smaller.");
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Reference storage unavailable"));
  });
}

export async function saveReference(id: string, file: File) {
  validateReference(file);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Reference could not be saved"));
  });
  database.close();
}

export async function loadReferenceUrl(
  id: string,
): Promise<{ url: string; revoke: () => void } | undefined> {
  const database = await openDatabase();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () =>
      reject(request.error ?? new Error("Reference could not be restored"));
  });
  database.close();
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}
