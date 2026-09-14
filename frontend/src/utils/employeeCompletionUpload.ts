import { he } from "../i18n/he";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import { meetsCompletionRequirements } from "./completionMedia";
import { attachmentsFromCompletion, mapAttachmentsToSlots } from "./completionSlotView";
import {
  type PendingMedia,
  completionAttachmentFromPending,
  createKeptMedia,
  pendingSlotIsFilled,
  uploadPendingMedia,
} from "./pendingMedia";
import { posterFileFromVideoSrc } from "./videoPosterFile";

export type SlotUploaders = {
  photo: (file: File) => Promise<{ url: string }>;
  video: (file: File) => Promise<{ url: string }>;
  audio: (file: File) => Promise<{ url: string }>;
};

export function slotsMeetTaskRequirements(
  requirements: CompletionRequirement[],
  slots: Array<PendingMedia | null>,
): boolean {
  const kinds = slots.map((item, i) => slotKindForRequirement(requirements[i], item));
  if (!meetsCompletionRequirements(requirements, kinds)) return false;
  return requirements.every((_, i) => pendingSlotIsFilled(slots[i]));
}

export function slotsFromKeptAttachments(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[] | null | undefined,
): Array<PendingMedia | null> {
  return mapAttachmentsToSlots(requirements, attachments).fills.map((fill) =>
    fill?.url ? createKeptMedia(fill.url, fill.durationSeconds, fill.posterUrl) : null,
  );
}

export function slotsFromTaskCompletion(
  requirements: CompletionRequirement[],
  completion: Parameters<typeof attachmentsFromCompletion>[0],
): Array<PendingMedia | null> {
  return slotsFromKeptAttachments(requirements, attachmentsFromCompletion(completion));
}

function slotKindForRequirement(
  req: CompletionRequirement | undefined,
  item: PendingMedia | null,
): { kind: CompletionRequirement["kind"]; durationSeconds?: number | null } | null {
  if (!req || !pendingSlotIsFilled(item)) return null;
  const duration =
    item!.durationSeconds ?? (item!.keptUrl && req.kind === "video" ? req.min_seconds ?? 0 : undefined);
  return { kind: req.kind, durationSeconds: duration };
}

export async function uploadRequirementSlots(
  requirements: CompletionRequirement[],
  slots: Array<PendingMedia | null>,
  uploaders: SlotUploaders,
  requireAll = false,
): Promise<CompletionAttachment[]> {
  const attachments: CompletionAttachment[] = [];
  for (let i = 0; i < requirements.length; i += 1) {
    const item = await uploadOneRequirementSlot(requirements[i], slots[i], uploaders, requireAll);
    if (item) attachments.push(item);
  }
  return attachments;
}

async function uploadOneRequirementSlot(
  req: CompletionRequirement,
  media: PendingMedia | null,
  uploaders: SlotUploaders,
  requireAll: boolean,
): Promise<CompletionAttachment | null> {
  const url = await uploadPendingMedia(media, uploaders[req.kind]);
  if (url) {
    const withPoster = await withUploadedVideoPoster(req.kind, media, uploaders.photo);
    return completionAttachmentFromPending(req.kind, url, withPoster);
  }
  if (media?.keptUrl) {
    return {
      kind: req.kind,
      url: media.keptUrl,
      duration_seconds: media.durationSeconds ?? undefined,
      poster_url: media.posterUrl,
    };
  }
  if (requireAll) throw new Error(he.completionFillSlotsHint);
  return null;
}

async function withUploadedVideoPoster(
  kind: CompletionRequirement["kind"],
  media: PendingMedia | null,
  uploadPhoto: SlotUploaders["photo"],
): Promise<PendingMedia | null> {
  if (kind !== "video" || !media) return media;
  if (media.posterUrl) return media;
  const file = media.posterFile ?? (await posterFileFromVideoSrc(media.previewUrl));
  if (!file) return media;
  try {
    const uploaded = await uploadPhoto(file);
    return { ...media, posterUrl: uploaded.url };
  } catch {
    return media;
  }
}
