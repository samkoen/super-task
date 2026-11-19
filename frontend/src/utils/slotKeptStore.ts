import type { SkipReasonCode } from "./completionMedia";
import { HELD_MAX_AGE_MS, slotQueueId } from "./slotUploadQueue";

/**
 * Ce que l'oved a remis sur une case sans fichier, gardé sur l'appareil (IndexedDB du WebView) jusqu'à
 * l'envoi : une raison « לא ניתן לצלם » ou une note écrite confirmée. Quitter la tâche puis la rouvrir
 * (ou recharger l'app) ne les perd pas, comme pour les prises filmées (gardées, elles, dans la file d'envoi).
 * Une entrée par sous-tâche : la dernière remise remplace la précédente ; elle disparaît quand le serveur
 * l'a reçue, quand la raison est retirée ou quand la case est filmée.
 */
type StoredBase = {
  /** `${occurrenceId}:${slotIndex}` */
  id: string;
  occurrenceId: string;
  slotIndex: number;
  savedAt: number;
};

export type StoredSkip = StoredBase & {
  kind: "skip";
  reasonCode: SkipReasonCode;
  reasonText: string | null;
  /** Explication vocale enregistrée, pas encore envoyée. */
  audio: Blob | null;
  audioName: string | null;
};

export type StoredText = StoredBase & { kind: "text"; text: string };

export type StoredSlot = StoredSkip | StoredText;

type Where = { occurrenceId: string; slotIndex: number };

export interface SlotKeptStore {
  saveSkip(item: Where & { reasonCode: SkipReasonCode; reasonText?: string | null; audio?: File | null }): Promise<void>;
  saveText(item: Where & { text: string }): Promise<void>;
  remove(occurrenceId: string, slotIndex: number): Promise<void>;
  /** Ce qui est gardé pour cette tâche ; les entrées trop vieilles (comme les prises gardées) sont effacées. */
  list(occurrenceId: string): Promise<StoredSlot[]>;
}

type Rows = {
  put(entry: StoredSlot): Promise<void>;
  remove(id: string): Promise<void>;
  getAll(): Promise<StoredSlot[]>;
};

function createStore(rows: Rows, now: () => number): SlotKeptStore {
  const base = (item: Where): StoredBase => ({
    id: slotQueueId(item.occurrenceId, item.slotIndex),
    occurrenceId: item.occurrenceId,
    slotIndex: item.slotIndex,
    savedAt: now(),
  });
  return {
    saveSkip: (item) =>
      rows.put({
        ...base(item),
        kind: "skip",
        reasonCode: item.reasonCode,
        reasonText: item.reasonText ?? null,
        audio: item.audio ?? null,
        audioName: item.audio?.name ?? null,
      }),
    saveText: (item) => rows.put({ ...base(item), kind: "text", text: item.text }),
    remove: (occurrenceId, slotIndex) => rows.remove(slotQueueId(occurrenceId, slotIndex)),
    list: async (occurrenceId) => {
      const all = await rows.getAll();
      const stale = all.filter((row) => now() - row.savedAt > HELD_MAX_AGE_MS);
      await Promise.all(stale.map((row) => rows.remove(row.id).catch(() => undefined)));
      return all.filter((row) => row.occurrenceId === occurrenceId && !stale.includes(row));
    },
  };
}

export function createMemoryKeptStore(now: () => number = () => Date.now()): SlotKeptStore {
  const rows = new Map<string, StoredSlot>();
  return createStore(
    {
      put: async (entry) => void rows.set(entry.id, entry),
      remove: async (id) => void rows.delete(id),
      getAll: async () => [...rows.values()],
    },
    now,
  );
}

const DB_NAME = "super-slot-kept";
const STORE = "slots";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

export function createIndexedDbKeptStore(factory: IDBFactory, now: () => number = () => Date.now()): SlotKeptStore {
  let opened: Promise<IDBDatabase> | null = null;
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("indexeddb"));
    });
  const store = async (mode: IDBTransactionMode) => {
    opened ??= open();
    return (await opened).transaction(STORE, mode).objectStore(STORE);
  };
  return createStore(
    {
      put: async (entry) => void (await requestToPromise((await store("readwrite")).put(entry))),
      remove: async (id) => void (await requestToPromise((await store("readwrite")).delete(id))),
      getAll: async () => (await requestToPromise((await store("readonly")).getAll())) as StoredSlot[],
    },
    now,
  );
}

let shared: SlotKeptStore | null = null;

/** IndexedDB si disponible (WebView Android, navigateur), sinon mémoire (gardée tant que l'app est ouverte). */
export function getSlotKeptStore(): SlotKeptStore {
  shared ??= typeof indexedDB === "undefined" ? createMemoryKeptStore() : createIndexedDbKeptStore(indexedDB);
  return shared;
}

/** Fichier vocal relu depuis le disque (IndexedDB peut rendre un Blob sans nom). */
export function storedSkipAudio(entry: StoredSkip): File | null {
  if (!entry.audio) return null;
  if (entry.audio instanceof File) return entry.audio;
  return new File([entry.audio], entry.audioName ?? "voice.webm", { type: entry.audio.type });
}
