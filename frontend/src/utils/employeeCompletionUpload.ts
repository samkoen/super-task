import { he } from "../i18n/he";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import { meetsCompletionRequirements } from "./completionMedia";
import {
  type PendingMedia,
  completionAttachmentFromPending,
  pendingSlotHasFile,
  uploadPendingMedia,
} from "./pendingMedia";

export type SlotUploaders = {
  photo: (file: File) => Promise<{ url: string }>;
  video: (file: File) => Promise<{ url: string }>;
  audio: (file: File) => Promise<{ url: string }>;
};

export function slotsMeetTaskRequirements(
  requirements: CompletionRequirement[],
  slots: Array<PendingMedia | null>,
): boolean {
  const kinds = slots.map((item, i) =>
    item ? { kind: requirements[i]?.kind ?? "photo", durationSeconds: item.durationSeconds } : null,
  );
  if (!meetsCompletionRequirements(requirements, kinds)) return false;
  return requirements.every((_, i) => pendingSlotHasFile(slots[i]));
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
  if (url) return completionAttachmentFromPending(req.kind, url, media);
  if (requireAll) throw new Error(he.completionFillSlotsHint);
  return null;
}
