import { useEffect } from "react";
import { getSlotUploadQueue } from "../utils/slotSender";
import { startSlotAutoFlush } from "../utils/slotUploadQueue";

/**
 * Renvoie les vidéos gardées sur l'appareil au retour du réseau (app ouverte).
 * Monté au niveau de la mise en page oved : l'envoi continue même si l'écran de la tâche est fermé.
 */
export function useSlotAutoFlush(enabled: boolean, queueFactory = getSlotUploadQueue): void {
  useEffect(() => {
    if (!enabled) return;
    return startSlotAutoFlush(queueFactory());
  }, [enabled, queueFactory]);
}
