import { useEffect } from "react";
import { taskService } from "../services/taskService";
import { flushFinishSignals } from "../utils/finishSignals";
import { getSlotUploadQueue } from "../utils/slotSender";
import { startSlotAutoFlush, type SlotUploadQueue } from "../utils/slotUploadQueue";

/** Le petit signal « tâche finie » part avant les vidéos : le menahel le voit dès qu'un peu de réseau revient. */
export async function sendFinishSignalsThenFiles(queue: Pick<SlotUploadQueue, "flush">): Promise<void> {
  await flushFinishSignals((marker) => taskService.finishedOffline(marker.occurrenceId, marker.finishedAt));
  await queue.flush();
}

/**
 * Renvoie les vidéos gardées sur l'appareil au retour du réseau (app ouverte).
 * Monté au niveau de la mise en page oved : l'envoi continue même si l'écran de la tâche est fermé.
 */
export function useSlotAutoFlush(enabled: boolean, queueFactory = getSlotUploadQueue): void {
  useEffect(() => {
    if (!enabled) return;
    const queue = queueFactory();
    return startSlotAutoFlush({ flush: () => sendFinishSignalsThenFiles(queue) });
  }, [enabled, queueFactory]);
}
