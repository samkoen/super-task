import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { taskService, type SubmitSlotResponse } from "../services/taskService";
import type { CompletionRequirement } from "../utils/completionMedia";
import { getSlotUploadQueue } from "../utils/slotSender";
import type { SlotUploadQueue } from "../utils/slotUploadQueue";
import {
  applyQueueEvent,
  discardFilmed,
  markFilmed,
  slotStatesFromCompletion,
  type SlotUiState,
} from "../utils/slotUploadState";

type Completion = Parameters<typeof slotStatesFromCompletion>[1];

export type SlotUploadsOptions = {
  occurrenceId: string;
  requirements: CompletionRequirement[];
  completion?: Completion;
  queue?: SlotUploadQueue;
  /** Le serveur a confirmé une sous-tâche (la tâche part chez le menahel si `task_submitted`). */
  onSent?: (index: number, response: SubmitSlotResponse | null) => void;
  /** Le fichier est gardé sur l'appareil, le réseau n'a pas permis l'envoi. */
  onSavedOnDevice?: (index: number) => void;
  onFailed?: (index: number, message: string) => void;
};

type FilmedFiles = Map<number, { file: File; capturedAt: string; durationSeconds: number | null }>;

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Charge l'état au départ : ce que le serveur a déjà + ce qui attend sur l'appareil. */
function useInitialStates(
  occurrenceId: string,
  requirements: CompletionRequirement[],
  completion: Completion,
  queue: SlotUploadQueue,
) {
  const [states, setStates] = useState<SlotUiState[]>(() =>
    slotStatesFromCompletion(requirements, completion),
  );
  const latest = useLatest({ requirements, completion });
  useEffect(() => {
    const { requirements: reqs, completion: done } = latest.current;
    setStates(slotStatesFromCompletion(reqs, done));
    let cancelled = false;
    void queue.list(occurrenceId).then((queued) => {
      if (!cancelled && queued.length) setStates(slotStatesFromCompletion(reqs, done, queued));
    });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId, queue, latest]);
  return [states, setStates] as const;
}

/**
 * États d'envoi par sous-tâche + actions. Chaque sous-tâche part seule dès confirmation ;
 * hors ligne, elle reste sur l'appareil et repart au retour du réseau.
 */
export function useSlotUploads(options: SlotUploadsOptions) {
  const { occurrenceId, requirements, completion, onSent, onSavedOnDevice, onFailed } = options;
  const queue = useMemo(() => options.queue ?? getSlotUploadQueue(), [options.queue]);
  const [states, setStates] = useInitialStates(occurrenceId, requirements, completion, queue);
  const files = useRef<FilmedFiles>(new Map());
  const callbacks = useLatest({ onSent, onSavedOnDevice, onFailed });

  useEffect(
    () =>
      queue.subscribe((event) => {
        if (event.entry.occurrenceId !== occurrenceId) return;
        setStates((prev) => applyQueueEvent(prev, occurrenceId, event));
        const index = event.entry.slotIndex;
        if (event.type === "sent") callbacks.current.onSent?.(index, event.result as SubmitSlotResponse);
        if (event.type === "failed") callbacks.current.onFailed?.(index, event.entry.lastError ?? "");
      }),
    [queue, occurrenceId, setStates, callbacks],
  );

  const film = useCallback(
    (index: number, file: File, durationSeconds?: number | null) => {
      const capturedAt = new Date().toISOString();
      files.current.set(index, { file, capturedAt, durationSeconds: durationSeconds ?? null });
      setStates((prev) =>
        markFilmed(prev, index, { capturedAt, durationSeconds, previewUrl: URL.createObjectURL(file) }),
      );
    },
    [setStates],
  );

  const discard = useCallback(
    (index: number) => {
      files.current.delete(index);
      setStates((prev) => discardFilmed(prev, index));
    },
    [setStates],
  );

  const confirm = useCallback(
    async (index: number) => {
      const kept = files.current.get(index);
      const kind = requirements[index]?.kind;
      if (!kept || (kind !== "video" && kind !== "photo" && kind !== "audio")) return;
      files.current.delete(index);
      await queue.enqueue({ occurrenceId, slotIndex: index, kind, ...kept });
      await queue.flush();
      const waiting = (await queue.list(occurrenceId)).some(
        (entry) => entry.slotIndex === index && entry.status === "pending",
      );
      if (waiting) callbacks.current.onSavedOnDevice?.(index);
    },
    [queue, occurrenceId, requirements, callbacks],
  );

  const submitText = useCallback(
    async (index: number, text: string) => {
      setStates((prev) => prev.map((s, i) => (i === index ? { ...s, status: "uploading" } : s)));
      try {
        const response = await taskService.submitSlot(occurrenceId, index, { kind: "message", text });
        setStates((prev) =>
          prev.map((s, i) => (i === index ? { ...s, status: "sent", text, sentAt: new Date().toISOString() } : s)),
        );
        callbacks.current.onSent?.(index, response);
      } catch (error) {
        setStates((prev) => prev.map((s, i) => (i === index ? { ...s, status: "idle" } : s)));
        callbacks.current.onFailed?.(index, error instanceof Error ? error.message : String(error ?? ""));
      }
    },
    [occurrenceId, setStates, callbacks],
  );

  const retry = useCallback(
    async (index: number) => {
      await queue.retry(`${occurrenceId}:${index}`);
      await queue.flush();
    },
    [queue, occurrenceId],
  );

  return { states, film, discard, confirm, submitText, retry };
}
