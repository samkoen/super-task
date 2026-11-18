import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import { useSlotUploads, type SlotUploadsOptions } from "./useSlotUploads";
import type { MediaKind } from "../components/media/MediaCaptureActions";
import { he } from "../i18n/he";
import type { SubmitSlotResponse } from "../services/taskService";
import { remainingAfter, type FlowToastState } from "../utils/flowToast";
import { readyForSummary } from "../utils/flowSummary";
import type { SkipDraft } from "../utils/slotSkip";
import { slotDisplayTitle } from "../utils/completionSlotView";

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
  const online = useOnlineStatus();

  const uploads = useSlotUploads({
    ...uploadOptions,
    onSent: (_index, response) => onServerUpdate?.(response),
    onFailed: (_index, message) => {
      setToast({ kind: "failed", remaining: 0, reason: message });
      onError?.(message || he.flowToastFailed);
    },
  });
  const { states, film, discard, keep, keepText, skip, unskip } = uploads;

  useEffect(() => {
    if (!readyForSummary(states)) {
      // Une carte rouverte (refaite, « לצלם עכשיו ») : le récap se rouvre quand tout est de nouveau remis.
      finished.current = false;
      return;
    }
    if (finished.current || !touched.current) return;
    finished.current = true;
    onAllHandedOver();
  }, [states, onAllHandedOver]);

  /** Toast 09 (réseau là) ou 09ב (sans réseau : le média attend sur l'appareil). */
  const toastKept = useCallback(
    (index: number) =>
      setToast({
        kind: online ? "kept" : "keptOffline",
        remaining: remainingAfter(states.map((s) => s.status), index),
        mediaKind: options.requirements[index]?.kind,
      }),
    [online, states, options.requirements],
  );

  /** La carte est confirmée : elle reste sur l'appareil, l'envoi se fera au récap. */
  const confirmSlot = useCallback(
    (index: number) => {
      touched.current = true;
      keep(index);
      toastKept(index);
    },
    [keep, toastKept],
  );

  const saveText = useCallback(
    (index: number, text: string) => {
      touched.current = true;
      keepText(index, text);
      toastKept(index);
    },
    [keepText, toastKept],
  );

  /** « לא ניתן לצלם » : la raison est gardée, la carte compte comme remise (l'envoi se fera au récap). */
  const skipSlot = useCallback(
    (index: number, draft: SkipDraft) => {
      touched.current = true;
      skip(index, draft);
      const req = options.requirements[index];
      setToast({
        kind: "skipReported",
        remaining: remainingAfter(states.map((s) => s.status), index),
        slotTitle: req ? slotDisplayTitle(req, index) : undefined,
      });
    },
    [skip, states, options.requirements],
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
    online,
    sending: uploads.sending,
    sendAll: uploads.sendAll,
    total,
    toast,
    closeToast,
    retake,
    capture,
    confirmSlot,
    saveText,
    skipSlot,
    unskipSlot: unskip,
    retakeSlot,
    trimSlot: uploads.trim,
    reviewIndex: reviewIndex >= 0 ? reviewIndex : null,
  };
}
