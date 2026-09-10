/** Média capturé en local — upload serveur uniquement à la soumission. */

export type PendingMedia = {
  file: File;
  previewUrl: string;
  durationSeconds?: number | null;
  capturedAt: string;
};

export function createPendingMedia(
  file: File,
  durationSeconds?: number | null,
): PendingMedia {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    durationSeconds,
    capturedAt: new Date().toISOString(),
  };
}

export function completionAttachmentFromPending(
  kind: "photo" | "video" | "audio",
  url: string,
  media: PendingMedia | null | undefined,
): {
  kind: "photo" | "video" | "audio";
  url: string;
  duration_seconds?: number;
  captured_at?: string;
} {
  return {
    kind,
    url,
    duration_seconds: media?.durationSeconds ?? undefined,
    captured_at: media?.capturedAt,
  };
}

export function revokePendingMedia(media: PendingMedia | null | undefined): void {
  if (media?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(media.previewUrl);
  }
}

export function replacePendingMedia(
  previous: PendingMedia | null | undefined,
  file: File,
  durationSeconds?: number | null,
): PendingMedia {
  revokePendingMedia(previous);
  return createPendingMedia(file, durationSeconds);
}

export async function uploadPendingMedia(
  pending: PendingMedia | null | undefined,
  upload: (file: File) => Promise<{ url: string }>,
): Promise<string | undefined> {
  if (!pendingSlotHasFile(pending)) return undefined;
  const res = await upload(pending.file);
  return res.url;
}

export function pendingSlotHasFile(media: PendingMedia | null | undefined): media is PendingMedia {
  return Boolean(media && media.file.size > 0);
}

export function applyPendingSlot(
  slots: Array<PendingMedia | null>,
  index: number,
  file: File,
  durationSeconds?: number | null,
): Array<PendingMedia | null> {
  const next = slots.slice();
  while (next.length <= index) next.push(null);
  next[index] = replacePendingMedia(next[index], file, durationSeconds ?? null);
  return next;
}
