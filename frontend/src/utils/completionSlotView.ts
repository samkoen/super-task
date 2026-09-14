import { he } from "../i18n/he";
import { mediaUrl } from "./mediaUrl";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";

export type SlotFill = {
  url?: string | null;
  previewUrl?: string | null;
  posterUrl?: string | null;
  pending?: boolean;
  kind?: CompletionRequirement["kind"];
  durationSeconds?: number | null;
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

function toSlotFill(
  item: CompletionAttachment,
  req: CompletionRequirement,
  opts?: { videosPending?: boolean },
): SlotFill {
  return {
    url: item.url,
    kind: item.kind,
    posterUrl: item.poster_url,
    durationSeconds: item.duration_seconds,
    pending: req.kind === "video" && Boolean(opts?.videosPending),
  };
}

function pickAttachmentIndex(
  req: CompletionRequirement,
  items: CompletionAttachment[],
  used: Set<number>,
  index: number,
): number {
  const direct = items[index];
  if (direct?.url && direct.kind === req.kind && !used.has(index)) return index;
  return items.findIndex((item, i) => !used.has(i) && item.kind === req.kind && Boolean(item.url));
}

/** Associe chaque case à un fichier, même si l’ordre des attachments diffère. */
export function mapAttachmentsToSlots(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[] | null | undefined,
  opts?: { videosPending?: boolean },
): { fills: Array<SlotFill | null>; leftover: CompletionAttachment[] } {
  const items = attachments ?? [];
  const used = new Set<number>();
  const fills = requirements.map((req, index) => {
    const pick = pickAttachmentIndex(req, items, used, index);
    if (pick < 0) return null;
    used.add(pick);
    return toSlotFill(items[pick], req, opts);
  });
  return { fills, leftover: items.filter((item, i) => !used.has(i) && Boolean(item.url)) };
}

export function fillsFromAttachments(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[] | null | undefined,
  opts?: { videosPending?: boolean },
): Array<SlotFill | null> {
  return mapAttachmentsToSlots(requirements, attachments, opts).fills;
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
