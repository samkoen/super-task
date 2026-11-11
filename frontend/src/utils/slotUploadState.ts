import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import { attachmentsFromCompletion, mapAttachmentsToSlots } from "./completionSlotView";
import type { CaptureLocation } from "./geoCheck";
import type { QueuedSlot, SlotQueueEvent } from "./slotUploadQueue";

/**
 * État d'envoi d'une sous-tâche, du point de vue de l'oved :
 * idle → filmed (capturé, pas encore confirmé) → ready (confirmé, gardé sur l'appareil) → queued → uploading → sent,
 * ou failed quand le serveur refuse. L'envoi au serveur se fait à la fin, depuis l'écran récap (10).
 * Aucun titre ni nombre de cartes n'est figé ici.
 */
export type SlotUploadStatus = "idle" | "filmed" | "ready" | "queued" | "uploading" | "sent" | "failed";

export type SlotUiState = {
  status: SlotUploadStatus;
  kind: CompletionRequirement["kind"];
  capturedAt?: string | null;
  sentAt?: string | null;
  durationSeconds?: number | null;
  /** Lumière mesurée pendant le tournage : null/absent = non mesurée. */
  lightOk?: boolean | null;
  /** GPS relevé au tournage : null/absent = refusé ou pas encore reçu. */
  location?: CaptureLocation | null;
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

/** Aperçu local d'un média gardé sur disque (rien hors navigateur, ex. tests sans `URL.createObjectURL`). */
function previewOf(entry: QueuedSlot): string | null {
  return typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(entry.file) : null;
}

function withQueueEntry(state: SlotUiState, entry: QueuedSlot | undefined): SlotUiState {
  // Déjà reçu par le serveur, ou copie locale qu'on ne renverra plus : la file ne réécrit pas l'état.
  if (!entry || state.status === "sent" || entry.status === "acked") return state;
  if (entry.status === "held") {
    // Confirmé avant un rechargement : la carte est « prête », il ne manque que l'envoi final.
    return {
      ...state,
      status: "ready",
      capturedAt: entry.capturedAt,
      durationSeconds: entry.durationSeconds,
      location: entry.location ?? null,
      previewUrl: previewOf(entry),
      error: null,
    };
  }
  return {
    ...state,
    status: entry.status === "failed" ? "failed" : "queued",
    capturedAt: entry.capturedAt,
    durationSeconds: entry.durationSeconds,
    error: entry.lastError ?? null,
  };
}

/**
 * Rechargement : une case déjà touchée dans cette session (filmée, confirmée, en file) gagne.
 * La copie disque ne remplit que les cases encore libres.
 */
export function mergeStoredSlots(current: SlotUiState[], stored: SlotUiState[]): SlotUiState[] {
  if (current.length !== stored.length) return stored;
  const next = current.map((state, index) => (state.status === "idle" ? stored[index] : state));
  return next.some((state, index) => state !== current[index]) ? next : current;
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
  media: { capturedAt: string; durationSeconds?: number | null; previewUrl?: string | null; lightOk?: boolean | null },
): SlotUiState[] {
  return patch(states, index, {
    status: "filmed",
    capturedAt: media.capturedAt,
    durationSeconds: media.durationSeconds ?? null,
    lightOk: media.lightOk ?? null,
    previewUrl: media.previewUrl ?? null,
    remark: null,
    error: null,
  });
}

/** La vidéo filmée a été découpée : nouvelle durée et nouvel aperçu, le reste de la prise est conservé. */
export function markTrimmed(
  states: SlotUiState[],
  index: number,
  media: { durationSeconds: number; previewUrl: string },
): SlotUiState[] {
  if (states[index]?.status !== "filmed") return states;
  return patch(states, index, { durationSeconds: media.durationSeconds, previewUrl: media.previewUrl });
}

/** Le GPS arrive après la capture ; ignoré si l'oved a déjà jeté ou envoyé la prise. */
export function withLocation(states: SlotUiState[], index: number, location: CaptureLocation | null): SlotUiState[] {
  const status = states[index]?.status;
  if (status !== "filmed" && status !== "ready") return states;
  return patch(states, index, { location });
}

/** Sous-tâche confirmée : elle reste sur l'appareil jusqu'à l'envoi final (écran 10). */
export function markReady(states: SlotUiState[], index: number, nowIso: string, text?: string): SlotUiState[] {
  const current = states[index];
  if (!current || current.status === "sent") return states;
  // Un fichier ne se garde qu'après capture ; seul un message n'en a pas besoin.
  if (current.status !== "filmed" && current.kind !== "message") return states;
  return patch(states, index, {
    status: "ready",
    capturedAt: current.capturedAt ?? nowIso,
    ...(text !== undefined ? { text } : {}),
    remark: null,
    error: null,
  });
}

/** L'oved annule la revue : la case redevient libre. */
export function discardFilmed(states: SlotUiState[], index: number): SlotUiState[] {
  if (states[index]?.status !== "filmed") return states;
  return patch(states, index, { status: "idle", capturedAt: null, durationSeconds: null, lightOk: null, location: null, previewUrl: null });
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
  return status === "sent" || status === "ready" || status === "queued" || status === "uploading";
}

/** Reste-t-il quelque chose à envoyer au serveur (confirmé mais pas parti, ou refusé) ? */
export function needsSending(states: SlotUiState[]): boolean {
  return states.some((state) => state.status === "ready" || state.status === "failed");
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
