import type { CompletionAttachment, CompletionKind, CompletionRequirement } from "./completionMedia";
import { attachmentsFromCompletion, mapAttachmentsToSlots } from "./completionSlotView";
import {
  type PendingMedia,
  createKeptMedia,
  createPendingMedia,
  revokePendingMedia,
} from "./pendingMedia";

export const MAX_EXTRA_COMPLETION_MEDIA = 6;

export type ExtraSlot = {
  kind: CompletionKind;
  media: PendingMedia;
};

export function canAddExtraMedia(extras: ExtraSlot[]): boolean {
  return extras.length < MAX_EXTRA_COMPLETION_MEDIA;
}

export function appendExtraMedia(
  extras: ExtraSlot[],
  kind: CompletionKind,
  file: File,
  durationSeconds?: number | null,
): ExtraSlot[] {
  if (!canAddExtraMedia(extras)) return extras;
  return [...extras, { kind, media: createPendingMedia(file, durationSeconds) }];
}

export function removeExtraMedia(extras: ExtraSlot[], index: number): ExtraSlot[] {
  const target = extras[index];
  if (!target) return extras;
  revokePendingMedia(target.media);
  return extras.filter((_, i) => i !== index);
}

export function revokeExtraMedia(extras: ExtraSlot[]): void {
  extras.forEach((item) => revokePendingMedia(item.media));
}

export function extrasFromAttachments(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[] | null | undefined,
): ExtraSlot[] {
  const leftover = mapAttachmentsToSlots(requirements, attachments).leftover;
  return leftover.slice(0, MAX_EXTRA_COMPLETION_MEDIA).map((item) => ({
    kind: item.kind,
    media: createKeptMedia(item.url, item.duration_seconds, item.poster_url),
  }));
}

export function extrasFromTaskCompletion(
  requirements: CompletionRequirement[],
  completion: Parameters<typeof attachmentsFromCompletion>[0],
): ExtraSlot[] {
  return extrasFromAttachments(requirements, attachmentsFromCompletion(completion));
}

export function mediaWithExtras(
  slots: Array<PendingMedia | null>,
  extras: ExtraSlot[],
): Array<PendingMedia | null> {
  return [...slots, ...extras.map((item) => item.media)];
}
