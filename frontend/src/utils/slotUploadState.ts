import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import { attachmentsFromCompletion, mapAttachmentsToSlots } from "./completionSlotView";
import type { QueuedSlot, SlotQueueEvent } from "./slotUploadQueue";

/**
 * État d'envoi d'une sous-tâche, du point de vue de l'oved :
 * idle → filmed (capturé, pas encore confirmé) → queued (gardé sur l'appareil) → uploading → sent,
 * ou failed quand le serveur refuse. Aucun titre ni nombre de cartes n'est figé ici.
 */
export type SlotUploadStatus = "idle" | "filmed" | "queued" | "uploading" | "sent" | "failed";

export type SlotUiState = {
  status: SlotUploadStatus;
  kind: CompletionRequirement["kind"];
  capturedAt?: string | null;
  sentAt?: string | null;
  durationSeconds?: number | null;
  /** Fichier local (aperçu) ou URL serveur de la miniature. */
  previewUrl?: string | null;
  posterUrl?: string | null;
  url?: string | null;
  text?: string | null;
  /** Remarque du menahel quand il a refusé cette sous-tâche. */
  remark?: string | null;
  error?: string | null;
};

type CompletionLike = Parameters<typeof attachmentsFromCompletion>[0];

export function emptySlotStates(requirements: CompletionRequirement[]): SlotUiState[] {
  return requirements.map((req) => ({ status: "idle", kind: req.kind }));
}

function stateFromAttachment(
  req: CompletionRequirement,
  fill: NonNullable<ReturnType<typeof mapAttachmentsToSlots>["fills"][number]>,
  attachments: CompletionAttachment[],
): SlotUiState {
  const item = fill.attachmentIndex !== undefined ? attachments[fill.attachmentIndex] : undefined;
  const base: SlotUiState = {
    status: "sent",
    kind: req.kind,
    url: fill.url ?? null,
    text: fill.text ?? null,
    posterUrl: fill.posterUrl ?? null,
    durationSeconds: fill.durationSeconds ?? null,
    capturedAt: item?.captured_at ?? null,
    sentAt: item?.captured_at ?? null,
  };
  if (fill.review?.status === "rejected") {
    return { ...base, status: "idle", remark: fill.review.remark || "", sentAt: null };
  }
  return base;
}

function withQueueEntry(state: SlotUiState, entry: QueuedSlot | undefined): SlotUiState {
  if (!entry) return state;
  return {
    ...state,
    status: entry.status === "failed" ? "failed" : "queued",
    capturedAt: entry.capturedAt,
    durationSeconds: entry.durationSeconds,
    error: entry.lastError ?? null,
  };
}

/** Ce que le serveur a déjà reçu, puis ce qui attend encore sur l'appareil. */
export function slotStatesFromCompletion(
  requirements: CompletionRequirement[],
  completion: CompletionLike,
  queued: QueuedSlot[] = [],
): SlotUiState[] {
  const attachments = attachmentsFromCompletion(completion);
  const { fills } = mapAttachmentsToSlots(requirements, attachments);
  return requirements.map((req, index) => {
    const fill = fills[index];
    const base: SlotUiState = fill
      ? stateFromAttachment(req, fill, attachments)
      : { status: "idle", kind: req.kind };
    return withQueueEntry(base, queued.find((entry) => entry.slotIndex === index));
  });
}

function patch(states: SlotUiState[], index: number, change: Partial<SlotUiState>): SlotUiState[] {
  if (index < 0 || index >= states.length) return states;
  return states.map((state, i) => (i === index ? { ...state, ...change } : state));
}

/** Capture faite sur l'appareil, en attente de confirmation (écran de revue). */
export function markFilmed(
  states: SlotUiState[],
  index: number,
  media: { capturedAt: string; durationSeconds?: number | null; previewUrl?: string | null },
): SlotUiState[] {
  return patch(states, index, {
    status: "filmed",
    capturedAt: media.capturedAt,
    durationSeconds: media.durationSeconds ?? null,
    previewUrl: media.previewUrl ?? null,
    remark: null,
    error: null,
  });
}

/** L'oved annule la revue : la case redevient libre. */
export function discardFilmed(states: SlotUiState[], index: number): SlotUiState[] {
  if (states[index]?.status !== "filmed") return states;
  return patch(states, index, { status: "idle", capturedAt: null, durationSeconds: null, previewUrl: null });
}

export function applyQueueEvent(
  states: SlotUiState[],
  occurrenceId: string,
  event: SlotQueueEvent,
  nowIso: () => string = () => new Date().toISOString(),
): SlotUiState[] {
  if (event.entry.occurrenceId !== occurrenceId) return states;
  const index = event.entry.slotIndex;
  if (event.type === "queued") {
    return patch(states, index, { status: "queued", error: event.entry.lastError ?? null });
  }
  if (event.type === "uploading") return patch(states, index, { status: "uploading", error: null });
  if (event.type === "failed") {
    return patch(states, index, { status: "failed", error: event.entry.lastError ?? null });
  }
  return patch(states, index, { status: "sent", sentAt: nowIso(), error: null, remark: null });
}

/** Remise au serveur faite ou en cours : l'oved n'a plus rien à filmer pour cette case. */
export function isHandedOver(status: SlotUploadStatus): boolean {
  return status === "sent" || status === "queued" || status === "uploading";
}

export function handedOverCount(states: SlotUiState[]): number {
  return states.filter((state) => isHandedOver(state.status)).length;
}

export function sentCount(states: SlotUiState[]): number {
  return states.filter((state) => state.status === "sent").length;
}

export function waitingUploadCount(states: SlotUiState[]): number {
  return states.filter((state) => state.status === "queued" || state.status === "uploading").length;
}

export function allHandedOver(states: SlotUiState[]): boolean {
  return states.length > 0 && states.every((state) => isHandedOver(state.status));
}

/** Prochaine case à faire après `from` (puis depuis le début) — l'oved reste libre de choisir autrement. */
export function nextOpenIndex(states: SlotUiState[], from: number): number | null {
  const count = states.length;
  for (let step = 1; step <= count; step += 1) {
    const index = (from + step) % count;
    if (!isHandedOver(states[index].status)) return index;
  }
  return null;
}

export function firstOpenIndex(states: SlotUiState[]): number {
  const index = states.findIndex((state) => !isHandedOver(state.status));
  return index < 0 ? 0 : index;
}
