import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { taskService, type SubmitSlotResponse } from "../services/taskService";
import type { CompletionRequirement } from "../utils/completionMedia";
import type { CaptureLocation } from "../utils/geoCheck";
import { getCurrentLocation } from "../utils/geoPosition";
import type { TrimRange } from "../utils/flowTrim";
import { getSlotUploadQueue, submitSlotStarting } from "../utils/slotSender";
import { skipAttachment, type SkipDraft } from "../utils/slotSkip";
import { trimVideo, type TrimResult } from "../utils/videoTrim";
import { slotQueueId, type QueuedSlot, type SlotUploadQueue } from "../utils/slotUploadQueue";
import { flushFinishSignals, rememberFinished } from "../utils/finishSignals";
import {
  applyQueueEvent,
  clearSkip,
  discardFilmed,
  isSkipPending,
  markFilmed,
  markReady,
  markSkipFailed,
  markSkipSent,
  markSkipped,
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
  lightOk: boolean | null;
  /** GPS demandé à la capture ; attendu au plus quelques secondes avant l'envoi. */
  location: Promise<CaptureLocation | null>;
  /** GPS une fois reçu : recopié dans la prise gardée sur disque. */
  found?: CaptureLocation | null;
  /** « אישור » donné : la copie disque devient `held`, on ne la réécrit plus en brouillon. */
  confirmed?: boolean;
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

/** Prise filmée avant une sortie de l'app : on reprend son fichier pour la confirmer, la couper ou l'envoyer. */
function restoreDrafts(files: FilmedFiles, queued: QueuedSlot[]) {
  for (const entry of queued) {
    if (entry.status !== "draft" || files.has(entry.slotIndex)) continue;
    const file = entry.file instanceof File ? entry.file : new File([entry.file], entry.fileName, { type: entry.mimeType });
    files.set(entry.slotIndex, {
      file,
      capturedAt: entry.capturedAt,
      durationSeconds: entry.durationSeconds,
      lightOk: entry.lightOk ?? null,
      location: Promise.resolve(entry.location ?? null),
      found: entry.location ?? null,
    });
  }
}

/** Charge l'état au départ : ce que le serveur a déjà + ce qui attend sur l'appareil. */
function useInitialStates(
  occurrenceId: string,
  requirements: CompletionRequirement[],
  completion: Completion,
  queue: SlotUploadQueue,
  files: { current: FilmedFiles },
  /** Cases déjà filmées ou annulées dans cette session : la lecture du disque ne les écrase pas. */
  touched: { current: Set<number> },
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
      .then((all) => {
        if (cancelled) return;
        const queued = all.filter((entry) => !touched.current.has(entry.slotIndex));
        restoreDrafts(files.current, queued);
        setStates((current) => mergeStoredSlots(current, picture(queued)));
      });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId, queue, latest, files, touched]);
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
  const files = useRef<FilmedFiles>(new Map());
  const touched = useRef(new Set<number>());
  const [states, setStates] = useInitialStates(occurrenceId, requirements, completion, queue, files, touched);
  const callbacks = useLatest({ onSent, onSavedOnDevice, onFailed });
  const statesRef = useLatest(states);
  const sending = useRef(false);
  const [isSending, setSending] = useState(false);
  /** Écritures disque par case, faites l'une après l'autre : l'envoi final les attend. */
  const holds = useRef(new Map<number, Promise<void>>());
  /** Confirmation en cours (attend la découpe et le GPS) : l'envoi final l'attend. */
  const confirming = useRef(new Map<number, Promise<void>>());
  /** Découpe en cours : une confirmation attend son résultat et garde le fichier coupé. */
  const trims = useRef(new Map<number, Promise<void>>());

  const onDisk = useCallback((index: number, write: () => Promise<unknown>) => {
    touched.current.add(index);
    const previous = holds.current.get(index) ?? Promise.resolve();
    // Quota ou stockage indisponible : le fichier reste en mémoire et partira quand même à l'envoi.
    const job = previous.then(write).then(
      () => undefined,
      () => undefined,
    );
    holds.current.set(index, job);
    return job;
  }, []);

  /** La case est annulée : la prise gardée sur disque n'a plus d'objet. */
  const dropHeld = useCallback(
    (index: number) => void onDisk(index, () => queue.dropHeld(slotQueueId(occurrenceId, index))),
    [queue, occurrenceId, onDisk],
  );

  /** Prise filmée, pas encore confirmée : écrite sur disque tout de suite (une sortie de l'app ne la perd pas). */
  const saveDraft = useCallback(
    (index: number, kept: Filmed) => {
      const kind = requirements[index]?.kind;
      if (!kind || !isMediaKind(kind)) return;
      const { file, capturedAt, durationSeconds, lightOk } = kept;
      const id = slotQueueId(occurrenceId, index);
      void onDisk(index, () =>
        queue
          .draft({ occurrenceId, slotIndex: index, kind, file, capturedAt, durationSeconds, lightOk, location: kept.found ?? null })
          // Écriture impossible : l'ancienne prise de la case ne doit pas rester sur disque à sa place.
          .catch(() => queue.dropHeld(id)),
      );
    },
    [queue, occurrenceId, requirements, onDisk],
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
      const location = locate().catch(() => null);
      const kept: Filmed = { file, capturedAt, durationSeconds: durationSeconds ?? null, lightOk: lightOk ?? null, location };
      files.current.set(index, kept);
      // Remplace sur disque la prise précédente de cette case (refilmée).
      saveDraft(index, kept);
      setStates((prev) =>
        markFilmed(prev, index, { capturedAt, durationSeconds, lightOk, previewUrl: URL.createObjectURL(file) }),
      );
      void location.then((found) => {
        // Même prise (éventuellement coupée entre-temps) : le GPS rejoint la copie disque, puis l'écran.
        const current = files.current.get(index);
        if (current?.location !== location) return;
        current.found = found;
        if (!current.confirmed && found) saveDraft(index, current);
        setStates((prev) => withLocation(prev, index, found));
      });
    },
    [setStates, locate, saveDraft],
  );

  /** Découpe la vidéo en cours de revue ; ignoré si l'oved l'a refilmée entre-temps. */
  const cut = useCallback(
    async (index: number, range: TrimRange) => {
      const kept = files.current.get(index);
      const preview = statesRef.current[index]?.previewUrl;
      if (!kept || !preview) return;
      const result = await trimmer(preview, range);
      if (files.current.get(index) !== kept) return;
      const next: Filmed = { ...kept, file: result.file as File, durationSeconds: result.durationSeconds };
      files.current.set(index, next);
      saveDraft(index, next);
      setStates((prev) =>
        markTrimmed(prev, index, { durationSeconds: result.durationSeconds, previewUrl: URL.createObjectURL(result.file) }),
      );
    },
    [setStates, trimmer, statesRef, saveDraft],
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
      dropHeld(index);
      setStates((prev) => discardFilmed(prev, index));
    },
    [setStates, dropHeld],
  );

  /** Écrit le média confirmé sur disque ; en cas d'échec il reste en mémoire et partira quand même à l'envoi. */
  const holdOnDisk = useCallback(
    async (index: number, kind: CompletionRequirement["kind"]) => {
      const kept = files.current.get(index);
      if (!kept || !isMediaKind(kind)) return;
      const { file, capturedAt, durationSeconds, lightOk } = kept;
      const found = await kept.location;
      // Refilmée pendant l'attente du GPS : la nouvelle prise est déjà sur disque, on ne l'écrase pas.
      if (files.current.get(index) !== kept) return;
      await onDisk(index, () =>
        queue.hold({ occurrenceId, slotIndex: index, kind, file, capturedAt, durationSeconds, lightOk, location: found }),
      );
    },
    [queue, occurrenceId, onDisk],
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
        const kept = files.current.get(index);
        if (kept) kept.confirmed = true;
        setStates((prev) => markReady(prev, index, new Date().toISOString()));
        await holdOnDisk(index, requirements[index]?.kind ?? "message");
      })();
      confirming.current.set(index, job);
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
        const response = await submitSlotStarting(occurrenceId, index, { kind: "message", text });
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

  /** « לא ניתן לצלם » : la case est remise avec sa raison ; le fichier éventuel est abandonné. */
  const skip = useCallback(
    (index: number, draft: SkipDraft) => {
      if (!draft.reasonCode) return;
      files.current.delete(index);
      dropHeld(index);
      const reasonText = draft.reasonText.trim() || null;
      setStates((prev) => markSkipped(prev, index, { reasonCode: draft.reasonCode!, reasonText, audio: draft.audio }));
    },
    [setStates, dropHeld],
  );

  const unskip = useCallback((index: number) => setStates((prev) => clearSkip(prev, index)), [setStates]);

  /** Envoie la raison d'une case non filmée (avec son explication vocale, si elle existe). */
  const sendSkip = useCallback(
    async (index: number, state: SlotUiState) => {
      const reason = state.skip;
      if (!reason) return;
      try {
        const audioUrl = reason.audio ? (await taskService.uploadAudio(reason.audio)).url : reason.audioUrl ?? null;
        const attachment = skipAttachment(requirements[index].kind, reason, audioUrl);
        const response = await submitSlotStarting(occurrenceId, index, attachment);
        setStates((prev) => markSkipSent(prev, index, audioUrl));
        callbacks.current.onSent?.(index, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "");
        setStates((prev) => markSkipFailed(prev, index, message));
        callbacks.current.onFailed?.(index, message);
      }
    },
    [occurrenceId, requirements, setStates, callbacks],
  );

  /**
   * Média confirmé → file d'envoi. La prise en mémoire est celle que l'oved vient de valider : elle part
   * en priorité (elle remplace toute copie disque plus ancienne). Après un rechargement, seule la copie
   * disque existe : on la libère.
   */
  const enqueueKept = useCallback(
    async (index: number, kind: CompletionRequirement["kind"]) => {
      if (!isMediaKind(kind)) return;
      await confirming.current.get(index);
      confirming.current.delete(index);
      await holds.current.get(index);
      holds.current.delete(index);
      const kept = files.current.get(index);
      files.current.delete(index);
      if (!kept) {
        await queue.release(slotQueueId(occurrenceId, index));
        return;
      }
      const { file, capturedAt, durationSeconds, lightOk } = kept;
      const location = await kept.location;
      await queue.enqueue({ occurrenceId, slotIndex: index, kind, file, capturedAt, durationSeconds, lightOk, location });
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
        else if (isSkipPending(state)) await sendSkip(index, state);
        else if (state.status === "failed") await queue.retry(`${occurrenceId}:${index}`);
      }
      await queue.flush();
      const waiting = (await queue.list(occurrenceId)).find((entry) => entry.status === "pending");
      if (waiting) {
        // Pas de קליטה : la tâche est finie pour l'oved ; le menahel le saura dès qu'un peu de réseau revient.
        rememberFinished(occurrenceId);
        void flushFinishSignals((marker) => taskService.finishedOffline(marker.occurrenceId, marker.finishedAt));
        callbacks.current.onSavedOnDevice?.(waiting.slotIndex);
      }
    } finally {
      sending.current = false;
      setSending(false);
    }
  }, [queue, occurrenceId, requirements, sendText, sendSkip, enqueueKept, callbacks]);

  return { states, sending: isSending, film, trim, discard, keep, keepText, skip, unskip, sendAll };
}
