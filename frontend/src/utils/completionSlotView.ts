import { he } from "../i18n/he";
import { mediaUrl } from "./mediaUrl";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";

export type SlotFill = {
  url?: string | null;
  previewUrl?: string | null;
  kind?: CompletionRequirement["kind"];
};

export function slotGuideText(req: CompletionRequirement): string {
  return (req.hint || "").trim() || (req.title || "").trim();
}

export function slotDisplayTitle(req: CompletionRequirement, index: number): string {
  const title = (req.title || "").trim();
  if (title) return title;
  if (req.kind === "video") {
    return `${he.completionRequirementN(index + 1)} · ${he.completionSlotVideoMin(req.min_seconds ?? 10)}`;
  }
  const kindLabel = req.kind === "audio" ? he.completionSlotAudio : he.completionSlotPhoto;
  return `${he.completionRequirementN(index + 1)} · ${kindLabel}`;
}

export function slotFillSrc(fill: SlotFill | null | undefined): string | null {
  if (!fill) return null;
  if (fill.previewUrl) return fill.previewUrl;
  return mediaUrl(fill.url || null);
}

export function slotExampleSrc(req: CompletionRequirement): string | null {
  return mediaUrl(req.example_url || null);
}

export function attachmentsFromCompletion(completion?: {
  completion_attachments?: CompletionAttachment[] | null;
  photo_path?: string | null;
  video_path?: string | null;
  audio_path?: string | null;
} | null): CompletionAttachment[] {
  if (completion?.completion_attachments?.length) {
    return completion.completion_attachments;
  }
  return (
    [
      completion?.photo_path ? { kind: "photo" as const, url: completion.photo_path } : null,
      completion?.video_path ? { kind: "video" as const, url: completion.video_path } : null,
      completion?.audio_path ? { kind: "audio" as const, url: completion.audio_path } : null,
    ] as Array<CompletionAttachment | null>
  ).filter((item): item is CompletionAttachment => Boolean(item));
}

export function fillsFromAttachments(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[] | null | undefined,
): Array<SlotFill | null> {
  return requirements.map((req, index) => {
    const item = attachments?.[index];
    if (!item?.url || item.kind !== req.kind) return null;
    return { url: item.url, kind: item.kind };
  });
}

export function filledVisualCount(
  requirements: CompletionRequirement[],
  fills: Array<SlotFill | null | undefined>,
): number {
  return requirements.reduce((count, req, index) => {
    if (req.kind === "audio") return count;
    return slotFillSrc(fills[index] ?? null) ? count + 1 : count;
  }, 0);
}

export function visualSlotCount(requirements: CompletionRequirement[]): number {
  return requirements.filter((req) => req.kind !== "audio").length;
}
