"use client";

/**
 * Videos live on the user's device, not in our storage: the file is kept in this browser's IndexedDB, keyed by
 * the video id. Supabase only holds the captions and settings. Reopening on another device (or after the
 * browser's data is cleared) asks the user to pick the same file again.
 */

const DB = "captionseasy-videos";
const STORE = "videos";

interface Entry { id: string; file: Blob; name: string; size: number; savedAt: number }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("This browser can't store videos (private mode?)."));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("Couldn't save the video in this browser."));
        };
      }),
  );
}

export async function saveLocalVideo(id: string, file: File | Blob) {
  // ask the browser not to evict our videos under storage pressure (granted silently on most browsers)
  void navigator.storage?.persist?.().catch(() => false);
  const entry: Entry = { id, file, name: file instanceof File ? file.name : "video.mp4", size: file.size, savedAt: Date.now() };
  try {
    await run("readwrite", (s) => s.put(entry));
  } catch (e) {
    const full = e instanceof DOMException && e.name === "QuotaExceededError";
    throw new Error(full ? "Your device is out of space for this video. Free some space and try again." : e instanceof Error ? e.message : "Couldn't save the video in this browser.");
  }
}

export async function getLocalVideo(id: string): Promise<Blob | null> {
  try {
    const e = (await run("readonly", (s) => s.get(id))) as Entry | undefined;
    return e?.file ?? null;
  } catch {
    return null;
  }
}

export async function deleteLocalVideo(id: string) {
  await run("readwrite", (s) => s.delete(id)).catch(() => undefined);
}
