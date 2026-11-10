import { isFetchInterruptedError, isRequestTimeoutText } from "./apiErrorMessage";

/**
 * File persistante des médias d'une sous-tâche : un fichier filmé est gardé sur l'appareil
 * (IndexedDB du WebView) jusqu'à ce que le serveur confirme sa réception.
 * Une entrée par sous-tâche : refilmer remplace l'entrée, un renvoi ne crée pas de doublon.
 */

export type QueuedSlotKind = "photo" | "video" | "audio";

export type QueuedSlot = {
  /** `${occurrenceId}:${slotIndex}` — clé d'idempotence côté client. */
  id: string;
  occurrenceId: string;
  slotIndex: number;
  kind: QueuedSlotKind;
  file: Blob;
  fileName: string;
  mimeType: string;
  durationSeconds: number | null;
  capturedAt: string;
  createdAt: number;
  attempts: number;
  /** `failed` : erreur définitive (le serveur a refusé) — pas de renvoi automatique. */
  status: "pending" | "failed";
  lastError?: string;
};

export type NewQueuedSlot = Pick<
  QueuedSlot,
  "occurrenceId" | "slotIndex" | "kind" | "file" | "durationSeconds" | "capturedAt"
> & { fileName?: string };

export type SlotQueueEvent =
  | { type: "queued"; entry: QueuedSlot }
  | { type: "uploading"; entry: QueuedSlot }
  | { type: "sent"; entry: QueuedSlot; result: unknown }
  | { type: "failed"; entry: QueuedSlot };

export interface SlotQueueStorage {
  put(entry: QueuedSlot): Promise<void>;
  remove(id: string): Promise<void>;
  getAll(): Promise<QueuedSlot[]>;
}

export function slotQueueId(occurrenceId: string, slotIndex: number): string {
  return `${occurrenceId}:${slotIndex}`;
}

export function createMemorySlotStorage(): SlotQueueStorage {
  const rows = new Map<string, QueuedSlot>();
  return {
    put: async (entry) => {
      rows.set(entry.id, entry);
    },
    remove: async (id) => {
      rows.delete(id);
    },
    getAll: async () => [...rows.values()],
  };
}

const DB_NAME = "super-slot-uploads";
const STORE = "slots";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: "id" });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("indexeddb"));
  });
}

export function createIndexedDbSlotStorage(factory: IDBFactory): SlotQueueStorage {
  let opened: Promise<IDBDatabase> | null = null;
  const store = async (mode: IDBTransactionMode) => {
    opened ??= openDatabase(factory);
    const db = await opened;
    return db.transaction(STORE, mode).objectStore(STORE);
  };
  return {
    put: async (entry) => {
      await requestToPromise((await store("readwrite")).put(entry));
    },
    remove: async (id) => {
      await requestToPromise((await store("readwrite")).delete(id));
    },
    getAll: async () => (await requestToPromise((await store("readonly")).getAll())) as QueuedSlot[],
  };
}

/** IndexedDB si disponible (WebView Android, navigateur), sinon mémoire. */
export function createDefaultSlotStorage(): SlotQueueStorage {
  if (typeof indexedDB === "undefined") return createMemorySlotStorage();
  return createIndexedDbSlotStorage(indexedDB);
}

/** Réseau coupé ou serveur indisponible : on garde le fichier et on retentera. */
export function isRetryableSlotError(error: unknown): boolean {
  if (isFetchInterruptedError(error)) return true;
  const row = error as { code?: string; message?: string; response?: { status?: number } } | null;
  if (row?.message && isRequestTimeoutText(row.message)) return true;
  if (row?.code === "ERR_NETWORK" || row?.code === "ECONNABORTED") return true;
  const status = row?.response?.status;
  if (status === undefined) return typeof row === "object" && row !== null && "isAxiosError" in row;
  return status >= 500 || status === 408 || status === 429;
}

export type SlotUploadQueue = ReturnType<typeof createSlotUploadQueue>;

export function createSlotUploadQueue(options: {
  storage: SlotQueueStorage;
  send: (entry: QueuedSlot) => Promise<unknown>;
  isOnline?: () => boolean;
  now?: () => number;
}) {
  const { storage, send } = options;
  const isOnline = options.isOnline ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const now = options.now ?? (() => Date.now());
  const listeners = new Set<(event: SlotQueueEvent) => void>();
  let running: Promise<void> | null = null;

  const emit = (event: SlotQueueEvent) => listeners.forEach((listener) => listener(event));

  const enqueue = async (item: NewQueuedSlot): Promise<QueuedSlot> => {
    const entry: QueuedSlot = {
      id: slotQueueId(item.occurrenceId, item.slotIndex),
      occurrenceId: item.occurrenceId,
      slotIndex: item.slotIndex,
      kind: item.kind,
      file: item.file,
      fileName: item.fileName || (item.file as File).name || `slot-${item.slotIndex}`,
      mimeType: item.file.type,
      durationSeconds: item.durationSeconds,
      capturedAt: item.capturedAt,
      createdAt: now(),
      attempts: 0,
      status: "pending",
    };
    await storage.put(entry);
    emit({ type: "queued", entry });
    return entry;
  };

  const sendOne = async (entry: QueuedSlot): Promise<"sent" | "stop" | "next"> => {
    emit({ type: "uploading", entry });
    try {
      const result = await send(entry);
      await storage.remove(entry.id);
      emit({ type: "sent", entry, result });
      return "sent";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "");
      if (isRetryableSlotError(error)) {
        const next = { ...entry, attempts: entry.attempts + 1, lastError: message };
        await storage.put(next);
        emit({ type: "queued", entry: next });
        return "stop";
      }
      const failed: QueuedSlot = { ...entry, attempts: entry.attempts + 1, status: "failed", lastError: message };
      await storage.put(failed);
      emit({ type: "failed", entry: failed });
      return "next";
    }
  };

  const run = async () => {
    const entries = (await storage.getAll())
      .filter((entry) => entry.status === "pending")
      .sort((a, b) => a.createdAt - b.createdAt);
    for (const entry of entries) {
      if (!isOnline()) return;
      if ((await sendOne(entry)) === "stop") return;
    }
  };

  /** Envoie tout ce qui attend, une entrée après l'autre ; un seul passage à la fois. */
  const flush = (): Promise<void> => {
    if (!running) running = run().finally(() => {
      running = null;
    });
    return running;
  };

  const list = async (occurrenceId?: string): Promise<QueuedSlot[]> => {
    const all = await storage.getAll();
    return occurrenceId ? all.filter((entry) => entry.occurrenceId === occurrenceId) : all;
  };

  /** Remet une entrée refusée en attente (action « réessayer »). */
  const retry = async (id: string): Promise<void> => {
    const entry = (await storage.getAll()).find((row) => row.id === id);
    if (!entry) return;
    const next: QueuedSlot = { ...entry, status: "pending", lastError: undefined };
    await storage.put(next);
    emit({ type: "queued", entry: next });
  };

  const subscribe = (listener: (event: SlotQueueEvent) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { enqueue, flush, list, retry, subscribe, remove: (id: string) => storage.remove(id) };
}

export type AutoFlushEnv = {
  target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  doc?: Pick<Document, "addEventListener" | "removeEventListener"> & { visibilityState?: string };
  setTimer?: (fn: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
  intervalMs?: number;
};

export const SLOT_RETRY_INTERVAL_MS = 20_000;

/** Renvoi automatique : réseau revenu, app de nouveau visible, puis toutes les 20 s tant que l'app est ouverte. */
export function startSlotAutoFlush(queue: Pick<SlotUploadQueue, "flush">, env: AutoFlushEnv = {}): () => void {
  const target = env.target ?? (typeof window === "undefined" ? undefined : window);
  const doc = env.doc ?? (typeof document === "undefined" ? undefined : document);
  const setTimer = env.setTimer ?? ((fn, ms) => window.setInterval(fn, ms));
  const clearTimer = env.clearTimer ?? ((id) => window.clearInterval(id));
  const trigger = () => void queue.flush();
  const onVisible = () => {
    if (doc?.visibilityState !== "hidden") trigger();
  };
  target?.addEventListener("online", trigger);
  doc?.addEventListener("visibilitychange", onVisible);
  const timer = setTimer(trigger, env.intervalMs ?? SLOT_RETRY_INTERVAL_MS);
  trigger();
  return () => {
    target?.removeEventListener("online", trigger);
    doc?.removeEventListener("visibilitychange", onVisible);
    clearTimer(timer);
  };
}
