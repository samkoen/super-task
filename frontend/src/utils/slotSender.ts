import { taskService, type SubmitSlotResponse } from "../services/taskService";
import type { CompletionAttachment } from "./completionMedia";
import { posterFileFromVideoSrc } from "./videoPosterFile";
import {
  createDefaultSlotStorage,
  createSlotUploadQueue,
  type QueuedSlot,
  type SlotUploadQueue,
} from "./slotUploadQueue";

export type SlotSenderDeps = {
  uploadFile: (kind: QueuedSlot["kind"], file: File) => Promise<{ url: string }>;
  uploadPoster: (file: File) => Promise<{ url: string }>;
  submit: typeof taskService.submitSlot;
  makePoster: (file: File) => Promise<File | null>;
};

const defaultDeps: SlotSenderDeps = {
  uploadFile: (kind, file) =>
    kind === "video"
      ? taskService.uploadVideo(file)
      : kind === "photo"
        ? taskService.uploadPhoto(file)
        : taskService.uploadAudio(file),
  uploadPoster: (file) => taskService.uploadPhoto(file),
  submit: taskService.submitSlot,
  makePoster: async (file) => {
    const src = URL.createObjectURL(file);
    try {
      return await posterFileFromVideoSrc(src);
    } finally {
      URL.revokeObjectURL(src);
    }
  },
};

function asFile(entry: QueuedSlot): File {
  if (entry.file instanceof File) return entry.file;
  return new File([entry.file], entry.fileName, { type: entry.mimeType });
}

/** La vignette est un confort : son échec ne bloque jamais l'envoi de la sous-tâche. */
async function uploadPosterQuietly(file: File, deps: SlotSenderDeps): Promise<string | undefined> {
  try {
    const poster = await deps.makePoster(file);
    if (!poster) return undefined;
    return (await deps.uploadPoster(poster)).url;
  } catch {
    return undefined;
  }
}

export function attachmentFromUpload(entry: QueuedSlot, url: string, posterUrl?: string): CompletionAttachment {
  return {
    kind: entry.kind,
    url,
    duration_seconds: entry.durationSeconds ?? undefined,
    captured_at: entry.capturedAt || undefined,
    ...(entry.kind === "video" && posterUrl ? { poster_url: posterUrl } : {}),
  };
}

/** Téléverse le fichier gardé sur l'appareil, puis déclare la sous-tâche au serveur. */
export async function sendQueuedSlot(
  entry: QueuedSlot,
  deps: SlotSenderDeps = defaultDeps,
): Promise<SubmitSlotResponse> {
  const file = asFile(entry);
  const { url } = await deps.uploadFile(entry.kind, file);
  const posterUrl = entry.kind === "video" ? await uploadPosterQuietly(file, deps) : undefined;
  return deps.submit(entry.occurrenceId, entry.slotIndex, attachmentFromUpload(entry, url, posterUrl));
}

let shared: SlotUploadQueue | null = null;

/** Une seule file pour toute l'app : les envois en attente survivent aux écrans. */
export function getSlotUploadQueue(): SlotUploadQueue {
  shared ??= createSlotUploadQueue({ storage: createDefaultSlotStorage(), send: (entry) => sendQueuedSlot(entry) });
  return shared;
}
