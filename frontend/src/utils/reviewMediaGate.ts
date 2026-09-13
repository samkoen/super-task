import type { CompletionAttachment } from "./completionMedia";

export function completionHasVideo(
  attachments: CompletionAttachment[] | null | undefined,
  videoPath?: string | null,
): boolean {
  if (videoPath?.trim()) return true;
  return Boolean(attachments?.some((item) => item.kind === "video" && item.url?.trim()));
}

export function reviewActionsBlocked(opts: {
  isReview: boolean;
  mediaReady: boolean;
}): boolean {
  return opts.isReview && !opts.mediaReady;
}

export function initialReviewMediaReady(mediaReady: boolean | undefined): boolean {
  return mediaReady !== false;
}
