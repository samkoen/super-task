import { useCallback, useEffect, useRef, useState } from "react";
import { useSlotUploads, type SlotUploadsOptions } from "./useSlotUploads";
import type { MediaKind } from "../components/media/MediaCaptureActions";
import { he } from "../i18n/he";
import type { SubmitSlotResponse } from "../services/taskService";
import type { FlowToastState } from "../utils/flowToast";
import { readyForSummary } from "../utils/flowSummary";

export type TaskFlowOptions = Omit<SlotUploadsOptions, "onSent" | "onSavedOnDevice" | "onFailed"> & {
  /** Toutes les cartes sont remises (envoyées ou gardées sur l'appareil). */
  onAllHandedOver: () => void;
  onError?: (message: string) => void;
  /** Le serveur a pris en compte une carte (la liste des tâches peut se rafraîchir). */
  onServerUpdate?: (response: SubmitSlotResponse | null) => void;
};

/** Pilote l'écran du FLOW 1 : captures, revue vidéo, toasts, fin de tâche. */
export function useTaskFlow(options: TaskFlowOptions) {
  const { onAllHandedOver, onError, onServerUpdate, ...uploadOptions } = options;
  const [toast, setToast] = useState<FlowToastState | null>(null);
  const [retake, setRetake] = useState<{ index: number; nonce: number } | null>(null);
  const touched = useRef(false);
  const finished = useRef(false);
  const total = options.requirements.length;

  const uploads = useSlotUploads({
    ...uploadOptions,
    onSent: (_index, response) => {
      touched.current = true;
      const remaining = response?.pending_slots.length ?? 0;
      setToast({ kind: response?.task_submitted ? "taskDone" : "sent", remaining });
      onServerUpdate?.(response);
    },
    onSavedOnDevice: () => {
      touched.current = true;
      setToast({ kind: "saved", remaining: 0 });
    },
    onFailed: (_index, message) => {
      setToast({ kind: "failed", remaining: 0 });
      onError?.(message || he.flowToastFailed);
    },
  });
  const { states, film, discard, confirm } = uploads;

  useEffect(() => {
    if (finished.current || !touched.current || !readyForSummary(states)) return;
    finished.current = true;
    onAllHandedOver();
  }, [states, onAllHandedOver]);

  const capture = useCallback(
    (index: number, file: File, kind: MediaKind, seconds?: number) => {
      film(index, file, seconds);
      // Seule la vidéo passe par l'écran de revue ; photo et audio sont déjà confirmés dans leur caméra.
      if (kind !== "video") void confirm(index);
    },
    [film, confirm],
  );

  const retakeSlot = useCallback(
    (index: number) => {
      discard(index);
      setRetake((prev) => ({ index, nonce: (prev?.nonce ?? 0) + 1 }));
    },
    [discard],
  );

  const closeToast = useCallback(() => setToast(null), []);
  const reviewIndex = states.findIndex((s) => s.status === "filmed" && s.kind === "video");
  return {
    ...uploads,
    total,
    toast,
    closeToast,
    retake,
    capture,
    retakeSlot,
    reviewIndex: reviewIndex >= 0 ? reviewIndex : null,
  };
}
