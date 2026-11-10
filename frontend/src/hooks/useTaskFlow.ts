import { useCallback, useEffect, useRef, useState } from "react";
import { useSlotUploads, type SlotUploadsOptions } from "./useSlotUploads";
import type { MediaKind } from "../components/media/MediaCaptureActions";
import { he } from "../i18n/he";
import type { SubmitSlotResponse } from "../services/taskService";
import { remainingAfter, type FlowToastState } from "../utils/flowToast";
import { readyForSummary } from "../utils/flowSummary";

export type TaskFlowOptions = Omit<SlotUploadsOptions, "onSent" | "onSavedOnDevice" | "onFailed"> & {
  /** Toutes les cartes sont confirmées : place au récap (10), qui fait l'envoi au serveur. */
  onAllHandedOver: () => void;
  onError?: (message: string) => void;
  /** Le serveur a pris en compte une carte (la liste des tâches peut se rafraîchir). */
  onServerUpdate?: (response: SubmitSlotResponse | null) => void;
};

/** Pilote l'écran du FLOW 1 : captures, revue vidéo, toasts, récap final qui envoie tout. */
export function useTaskFlow(options: TaskFlowOptions) {
  const { onAllHandedOver, onError, onServerUpdate, ...uploadOptions } = options;
  const [toast, setToast] = useState<FlowToastState | null>(null);
  const [retake, setRetake] = useState<{ index: number; nonce: number } | null>(null);
  const touched = useRef(false);
  const finished = useRef(false);
  const total = options.requirements.length;

  const uploads = useSlotUploads({
    ...uploadOptions,
    onSent: (_index, response) => onServerUpdate?.(response),
    onFailed: (_index, message) => {
      setToast({ kind: "failed", remaining: 0 });
      onError?.(message || he.flowToastFailed);
    },
  });
  const { states, film, discard, keep, keepText } = uploads;

  useEffect(() => {
    if (finished.current || !touched.current || !readyForSummary(states)) return;
    finished.current = true;
    onAllHandedOver();
  }, [states, onAllHandedOver]);

  /** La carte est confirmée : elle reste sur l'appareil, l'envoi se fera au récap. */
  const confirmSlot = useCallback(
    (index: number) => {
      touched.current = true;
      keep(index);
      setToast({ kind: "kept", remaining: remainingAfter(states.map((s) => s.status), index) });
    },
    [keep, states],
  );

  const saveText = useCallback(
    (index: number, text: string) => {
      touched.current = true;
      keepText(index, text);
      setToast({ kind: "kept", remaining: remainingAfter(states.map((s) => s.status), index) });
    },
    [keepText, states],
  );

  const capture = useCallback(
    (index: number, file: File, kind: MediaKind, seconds?: number, lightOk?: boolean | null) => {
      film(index, file, seconds, lightOk);
      // Seule la vidéo passe par l'écran de revue ; photo et audio sont déjà confirmés dans leur caméra.
      if (kind !== "video") confirmSlot(index);
    },
    [film, confirmSlot],
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
    states,
    sending: uploads.sending,
    sendAll: uploads.sendAll,
    total,
    toast,
    closeToast,
    retake,
    capture,
    confirmSlot,
    saveText,
    retakeSlot,
    trimSlot: uploads.trim,
    reviewIndex: reviewIndex >= 0 ? reviewIndex : null,
  };
}
