import { useCallback, useEffect, useMemo, useState } from "react";
import { getSlotUploadQueue } from "../utils/slotSender";
import type { QueuedSlot, SlotUploadQueue } from "../utils/slotUploadQueue";

export type PendingUploads = {
  /** Tâches dont au moins un fichier attend d'être envoyé. */
  taskIds: ReadonlySet<string>;
  /** Nombre de tâches en attente (le bandeau parle de tâches, pas de fichiers). */
  taskCount: number;
};

/** Seuls les fichiers confirmés et en file comptent (pas une prise non validée, pas un refus définitif). */
export function summarizePendingUploads(entries: QueuedSlot[]): PendingUploads {
  const taskIds = new Set(entries.filter((entry) => entry.status === "pending").map((entry) => entry.occurrenceId));
  return { taskIds, taskCount: taskIds.size };
}

const REFRESH_MS = 5_000;

/** Ce qui attend la קליטה sur ce téléphone, mis à jour à chaque événement de la file. */
export function usePendingUploads(queueFactory: () => Pick<SlotUploadQueue, "list" | "subscribe"> = getSlotUploadQueue): PendingUploads {
  const queue = useMemo(() => queueFactory(), [queueFactory]);
  const [entries, setEntries] = useState<QueuedSlot[]>([]);
  const refresh = useCallback(() => {
    queue.list().then(setEntries).catch(() => undefined);
  }, [queue]);
  useEffect(() => {
    refresh();
    const unsubscribe = queue.subscribe(() => refresh());
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [queue, refresh]);
  return useMemo(() => summarizePendingUploads(entries), [entries]);
}
