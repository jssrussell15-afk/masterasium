import { emptyDraft, type CreateDraft } from "@/lib/create/types";

/**
 * Device-only draft for an in-progress Create project.
 *
 * PR #14 (lib/practice/draft-store.ts) stores practice answers in localStorage.
 * That store is a different concern. After it merges, keep Create drafts in
 * this IndexedDB database (masterasium-create) so stories are not mixed into
 * attempt drafts. A shared device-storage helper can be extracted later.
 * Nothing in this store is written to Supabase.
 */
export interface CreateDraftStore {
  read(childId: string, day: string): Promise<CreateDraft | null>;
  write(draft: CreateDraft): Promise<void>;
  clear(childId: string): Promise<void>;
}

export function createMemoryDraftStore(): CreateDraftStore {
  const rows = new Map<string, CreateDraft>();
  return {
    async read(childId, day) {
      const row = rows.get(childId);
      if (!row || row.day !== day) return null;
      return row;
    },
    async write(draft) {
      rows.set(draft.childId, draft);
    },
    async clear(childId) {
      rows.delete(childId);
    },
  };
}

const DB_NAME = "masterasium-create";
const STORE = "drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "childId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createIndexedDbDraftStore(): CreateDraftStore {
  return {
    async read(childId, day) {
      const db = await openDb();
      const row = await new Promise<CreateDraft | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).get(childId);
        request.onsuccess = () => resolve(request.result as CreateDraft | undefined);
        request.onerror = () => reject(request.error);
      });
      db.close();
      if (!row || row.day !== day) return null;
      return row;
    },
    async write(draft) {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(draft);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    async clear(childId) {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(childId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
  };
}

export function createCreateDraftStore(): CreateDraftStore {
  if (typeof indexedDB === "undefined") return createMemoryDraftStore();
  return createIndexedDbDraftStore();
}

export function freshDraft(childId: string, day: string): CreateDraft {
  return emptyDraft(childId, day);
}
