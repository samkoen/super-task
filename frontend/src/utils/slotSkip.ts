import { he } from "../i18n/he";
import type {
  CompletionAttachment,
  CompletionRequirement,
  SkipReasonCode,
  SlotSkip,
} from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";

/** « לא ניתן לצלם » : ce que l'oved renseigne dans la feuille (écran 05ב) avant de continuer. */
export const SKIP_REASON_CODES: SkipReasonCode[] = ["area_blocked", "no_stock", "camera_issue", "other"];

export const SKIP_TEXT_MAX = 500;

export type SkipDraft = {
  reasonCode: SkipReasonCode | null;
  reasonText: string;
  /** Explication vocale enregistrée dans la feuille (envoyée au serveur à l'envoi final). */
  audio: File | null;
};

export const emptySkipDraft: SkipDraft = { reasonCode: null, reasonText: "", audio: null };

export function skipReasonLabel(code: SkipReasonCode): string {
  if (code === "no_stock") return he.flowSkipReasonNoStock;
  if (code === "area_blocked") return he.flowSkipReasonAreaBlocked;
  if (code === "camera_issue") return he.flowSkipReasonCameraIssue;
  return he.flowSkipReasonOther;
}

/** Comme le serveur : une raison est requise ; « אחר » exige en plus un texte ou un audio. */
export function isSkipDraftValid(draft: SkipDraft): boolean {
  if (!draft.reasonCode) return false;
  if (draft.reasonText.trim().length > SKIP_TEXT_MAX) return false;
  if (draft.reasonCode !== "other") return true;
  return Boolean(draft.reasonText.trim() || draft.audio);
}

/** Raison courte affichée sous le titre (« האזור חסום ») ; pour « אחר », le texte libre s'il existe. */
export function skipReasonText(skip: { reasonCode: SkipReasonCode; reasonText?: string | null }): string {
  const text = (skip.reasonText || "").trim();
  if (skip.reasonCode === "other" && text) return text;
  return skipReasonLabel(skip.reasonCode);
}

/** Charge utile de `submitSlot` pour une case non filmée. */
export function skipAttachment(
  kind: CompletionRequirement["kind"],
  skip: { reasonCode: SkipReasonCode; reasonText?: string | null },
  audioUrl?: string | null,
): CompletionAttachment {
  const text = (skip.reasonText || "").trim();
  const skipped: SlotSkip = {
    reason_code: skip.reasonCode,
    ...(text ? { reason_text: text } : {}),
    ...(audioUrl ? { audio_url: audioUrl } : {}),
  };
  return { kind, skipped };
}

export type SkippedSlot = {
  index: number;
  title: string;
  skip: SlotSkip;
};

/** Cases non filmées d'une soumission : le menahel les lit à côté des sous-tâches à contrôler. */
export function skippedSlots(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[] | null | undefined,
): SkippedSlot[] {
  const out: SkippedSlot[] = [];
  (attachments ?? []).forEach((item, index) => {
    if (!item.skipped) return;
    const req = requirements[index];
    const title = req ? slotDisplayTitle(req, index) : `${he.completionRequirementN(index + 1)}`;
    out.push({ index, title, skip: item.skipped });
  });
  return out;
}
