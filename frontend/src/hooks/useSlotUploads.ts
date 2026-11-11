import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { taskService, type SubmitSlotResponse } from "../services/taskService";
import type { CompletionRequirement } from "../utils/completionMedia";
import type { CaptureLocation } from "../utils/geoCheck";
import { getCurrentLocation } from "../utils/geoPosition";
import type { TrimRange } from "../utils/flowTrim";
import { getSlotUploadQueue } from "../utils/slotSender";
import { trimVideo, type TrimResult } from "../utils/videoTrim";
import { slotQueueId, type QueuedSlot, type SlotUploadQueue } from "../utils/slotUploadQueue";
import {
  applyQueueEvent,
  discardFilmed,
  markFilmed,
  markReady,
  markTrimmed,
  mergeStoredSlots,
  slotStatesFromCompletion,
  withLocation,
  type SlotUiState,
} from "../utils/slotUploadState";

type Completion = Parameters<typeof slotStatesFromCompletion>[1];

export type SlotUploadsOptions = {
  occurrenceId: string;
  requirements: CompletionRequirement[];
  completion?: Completion;
  queue?: SlotUploadQueue;
  /** Lecture GPS (injectable pour les tests). */
  locate?: () => Promise<CaptureLocation | null>;
  /** Découpe vidéo (injectable pour les tests). */
  trimmer?: (src: string, range: TrimRange) => Promise<TrimResult>;
  /** Le serveur a confirmé une sous-tâche (la tâche part chez le menahel si `task_submitted`). */
  onSent?: (index: number, response: SubmitSlotResponse | null) => void;
  /** Le fichier est gardé sur l'appareil, le réseau n'a pas permis l'envoi. */
  onSavedOnDevice?: (index: number) => void;
  onFailed?: (index: number, message: string) => void;
};

type Filmed = {
  file: File;
  capturedAt: string;
  durationSeconds: number | null;
  /** GPS demandé à la capture ; attendu au plus quelques secondes avant l'envoi. */
  location: Promise<CaptureLocation | null>;
};
type FilmedFiles = Map<number, Filmed>;

function isMediaKind(kind: CompletionRequirement["kind"]): kind is "video" | "photo" | "audio" {
  return kind === "video" || kind === "photo" || kind === "audio";
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Le serveur a déjà ces cases : leur copie locale ne doit ni s'afficher ni repartir. */
async function withoutDelivered(
  queue: SlotUploadQueue,
  known: SlotUiState[],
  queued: QueuedSlot[],
): Promise<QueuedSlot[]> {
  const delivered = queued.filter((entry) => known[entry.slotIndex]?.status === "sent");
  await Promise.all(delivered.map((entry) => queue.dropDelivered(entry.id).catch(() => undefined)));
  return queued.filter((entry) => known[entry.slotIndex]?.status !== "sent");
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
    const picture = (queued: QueuedSlot[] = []) => slotStatesFromCompletion(reqs, done, queued);
    setStates((current) => mergeStoredSlots(current, picture()));
    let cancelled = false;
    void queue
      .pruneHeld()
      .catch(() => undefined)
      .then(() => queue.list(occurrenceId))
      .then((queued) => withoutDelivered(queue, picture(), queued))
      .then((queued) => {
        if (!cancelled) setStates((current) => mergeStoredSlots(current, picture(queued)));
      });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId, queue, latest]);
  return [states, setStates] as const;
}

/**
 * États d'envoi par sous-tâche + actions. Une sous-tâche confirmée reste sur l'appareil ;
 * tout part vers le serveur d'un coup à la fin (`sendAll`, écran 10). Hors ligne, les fichiers
 * restent dans la file de l'appareil et repartent au retour du réseau.
 */
export function useSlotUploads(options: SlotUploadsOptions) {
  const { occurrenceId, requirements, completion, onSent, onSavedOnDevice, onFailed } = options;
  const locate = options.locate ?? getCurrentLocation;
  const trimmer = options.trimmer ?? trimVideo;
  const queue = useMemo(() => options.queue ?? getSlotUploadQueue(), [options.queue]);
  const [states, setStates] = useInitialStates(occurrenceId, requirements, completion, queue);
  const files = useRef<FilmedFiles>(new Map());
  const callbacks = useLatest({ onSent, onSavedOnDevice, onFailed });
  const statesRef = useLatest(states);
  const sending = useRef(false);
  const [isSending, setSending] = useState(false);
  /** Écritures disque en cours par case : l'envoi final et le re-tournage les attendent. */
  const holds = useRef(new Map<number, Promise<void>>());
  /** Découpe en cours : une confirmation attend son résultat et garde le fichier coupé. */
  const trims = useRef(new Map<number, Promise<void>>());

  /** La case est refilmée : le média confirmé précédent (sur disque) n'a plus d'objet. */
  const dropHeld = useCallback(
    (index: number) => {
      const writing = holds.current.get(index) ?? Promise.resolve();
      holds.current.delete(index);
      void writing.then(() => queue.dropHeld(slotQueueId(occurrenceId, index))).catch(() => undefined);
    },
    [queue, occurrenceId],
  );

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
    (index: number, file: File, durationSeconds?: number | null, lightOk?: boolean | null) => {
      const capturedAt = new Date().toISOString();
      dropHeld(index);
      const location = locate().catch(() => null);
      const kept: Filmed = { file, capturedAt, durationSeconds: durationSeconds ?? null, location };
      files.current.set(index, kept);
      setStates((prev) =>
        markFilmed(prev, index, { capturedAt, durationSeconds, lightOk, previewUrl: URL.createObjectURL(file) }),
      );
      void location.then((found) => {
        if (files.current.get(index)?.location === location) setStates((prev) => withLocation(prev, index, found));
      });
    },
    [setStates, locate, dropHeld],
  );

  /** Découpe la vidéo en cours de revue ; ignoré si l'oved l'a refilmée entre-temps. */
  const cut = useCallback(
    async (index: number, range: TrimRange) => {
      const kept = files.current.get(index);
      const preview = statesRef.current[index]?.previewUrl;
      if (!kept || !preview) return;
      const result = await trimmer(preview, range);
      if (files.current.get(index) !== kept) return;
      files.current.set(index, { ...kept, file: result.file as File, durationSeconds: result.durationSeconds });
      setStates((prev) =>
        markTrimmed(prev, index, { durationSeconds: result.durationSeconds, previewUrl: URL.createObjectURL(result.file) }),
      );
    },
    [setStates, trimmer, statesRef],
  );

  const trim = useCallback(
    async (index: number, range: TrimRange) => {
      const run = cut(index, range);
      trims.current.set(index, run);
      try {
        await run;
      } finally {
        if (trims.current.get(index) === run) trims.current.delete(index);
      }
    },
    [cut],
  );

  const discard = useCallback(
    (index: number) => {
      files.current.delete(index);
      setStates((prev) => discardFilmed(prev, index));
    },
    [setStates],
  );

  /** Écrit le média confirmé sur disque ; en cas d'échec il reste en mémoire et partira quand même à l'envoi. */
  const holdOnDisk = useCallback(
    async (index: number, kind: CompletionRequirement["kind"]) => {
      const kept = files.current.get(index);
      if (!kept || !isMediaKind(kind)) return;
      const { location, ...media } = kept;
      try {
        await queue.hold({ occurrenceId, slotIndex: index, kind, ...media, location: await location });
      } catch {
        /* quota ou stockage indisponible : le fichier reste en mémoire */
      }
    },
    [queue, occurrenceId],
  );

  /**
   * L'oved confirme une sous-tâche : elle est gardée sur l'appareil (mémoire + disque),
   * rien ne part encore au serveur. Un rechargement de l'app la retrouve.
   */
  const keep = useCallback(
    (index: number) => {
      const cutting = trims.current.get(index);
      const job = (async () => {
        if (cutting) await cutting.catch(() => undefined);
        setStates((prev) => markReady(prev, index, new Date().toISOString()));
        await holdOnDisk(index, requirements[index]?.kind ?? "message");
      })();
      holds.current.set(index, job);
    },
    [setStates, holdOnDisk, requirements],
  );

  const keepText = useCallback(
    (index: number, text: string) => setStates((prev) => markReady(prev, index, new Date().toISOString(), text)),
    [setStates],
  );

  const sendText = useCallback(
    async (index: number, text: string) => {
      setStates((prev) => prev.map((s, i) => (i === index ? { ...s, status: "uploading" } : s)));
      try {
        const response = await taskService.submitSlot(occurrenceId, index, { kind: "message", text });
        setStates((prev) =>
          prev.map((s, i) => (i === index ? { ...s, status: "sent", text, sentAt: new Date().toISOString() } : s)),
        );
        callbacks.current.onSent?.(index, response);
      } catch (error) {
        setStates((prev) => prev.map((s, i) => (i === index ? { ...s, status: "ready", text } : s)));
        callbacks.current.onFailed?.(index, error instanceof Error ? error.message : String(error ?? ""));
      }
    },
    [occurrenceId, setStates, callbacks],
  );

  /** Média confirmé → file d'envoi : depuis le disque, sinon (écriture disque échouée) depuis la mémoire. */
  const enqueueKept = useCallback(
    async (index: number, kind: CompletionRequirement["kind"]) => {
      if (!isMediaKind(kind)) return;
      await holds.current.get(index);
      holds.current.delete(index);
      const kept = files.current.get(index);
      files.current.delete(index);
      if (await queue.release(slotQueueId(occurrenceId, index))) return;
      if (!kept) return;
      const { location, ...media } = kept;
      await queue.enqueue({ occurrenceId, slotIndex: index, kind, ...media, location: await location });
    },
    [queue, occurrenceId],
  );

  /**
   * Écran 10 « אישור ושליחה » : tout ce qui est confirmé part vers le serveur, une sous-tâche après l'autre.
   * Hors ligne, les fichiers restent dans la file de l'appareil et repartent au retour du réseau.
   */
  const sendAll = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    setSending(true);
    try {
      const todo = statesRef.current.map((state, index) => ({ state, index }));
      for (const { state, index } of todo) {
        if (state.status === "ready" && requirements[index]?.kind === "message") await sendText(index, state.text ?? "");
        else if (state.status === "ready") await enqueueKept(index, requirements[index].kind);
        else if (state.status === "failed") await queue.retry(`${occurrenceId}:${index}`);
      }
      await queue.flush();
      const waiting = (await queue.list(occurrenceId)).find((entry) => entry.status === "pending");
      if (waiting) callbacks.current.onSavedOnDevice?.(waiting.slotIndex);
    } finally {
      sending.current = false;
      setSending(false);
    }
  }, [queue, occurrenceId, requirements, sendText, enqueueKept, callbacks]);

  return { states, sending: isSending, film, trim, discard, keep, keepText, sendAll };
}
