import type { KeptRows, StoredSlot } from "./slotKeptStore";

/** Stockage lent (comme IndexedDB) : chaque opération ne s'applique qu'après un délai. */
export function slowRows(delays: { put?: number; remove?: number; getAll?: number } = {}): KeptRows {
  const rows = new Map<string, StoredSlot>();
  const later = <T>(ms: number, apply: () => T) => new Promise<T>((resolve) => setTimeout(() => resolve(apply()), ms));
  return {
    put: (entry) => later(delays.put ?? 20, () => void rows.set(entry.id, entry)),
    remove: (id) => later(delays.remove ?? 20, () => void rows.delete(id)),
    getAll: () => later(delays.getAll ?? 0, () => [...rows.values()]),
  };
}
