/** Média capturé en local — upload serveur uniquement à la soumission. */

export type PendingMedia = {
  file: File;
  previewUrl: string;
  durationSeconds?: number | null;
};

export function createPendingMedia(
  file: File,
  durationSeconds?: number | null,
): PendingMedia {
  return { file, previewUrl: URL.createObjectURL(file), durationSeconds };
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
  if (!pending) return undefined;
  const res = await upload(pending.file);
  return res.url;
}
