import { he } from "../i18n/he";
import type { CompletionKind, CompletionRequirement } from "./completionMedia";

export function requirementKindLabel(kind: CompletionKind): string {
  if (kind === "video") return he.completionReqVideo;
  if (kind === "audio") return he.completionReqAudio;
  return he.completionReqPhoto;
}

export function requirementRowName(req: CompletionRequirement): string {
  return (req.title || "").trim() || he.completionUntitledSlot;
}

export function requirementRowLabel(req: CompletionRequirement): string {
  return `${requirementRowName(req)}: ${requirementKindLabel(req.kind)}`;
}

export function nextOpenIndexAfterRemove(open: number | null, removed: number): number | null {
  if (open == null || open === removed) return null;
  return open > removed ? open - 1 : open;
}
