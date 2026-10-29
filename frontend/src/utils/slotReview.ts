import { he } from "../i18n/he";
import type { ReviewSlotsPayload, SlotReviewDecision } from "../services/taskService";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";

export type SlotVerdict = "approved" | "rejected";

/** Choix du menahel sur une sous-tâche, gardé localement jusqu'à « סיום הבדיקה ». */
export type SlotDraft = {
  status: SlotVerdict;
  remark: string;
  /** Image avec flèches / ronds, envoyée seulement à la fin de la vérification. */
  annotatedFile: File | null;
  annotatedPreviewUrl: string | null;
};

export type SlotDrafts = Record<number, SlotDraft>;

export type ReviewItem = {
  /** Position dans completion_attachments : c'est la clé envoyée à l'API. */
  index: number;
  attachment: CompletionAttachment;
  requirement: CompletionRequirement | null;
  title: string;
  /** Les fichiers en plus des exigences sont facultatifs : ils ne bloquent pas la fin. */
  required: boolean;
};

export type ReviewSummary = {
  total: number;
  decided: number;
  approved: number;
  rejected: number;
  /** Cases obligatoires encore sans V ni X. */
  remaining: number;
  canFinish: boolean;
  outcome: "pending" | "approve" | "reopen";
};

export const REMARK_MAX = 500;

function isFilled(item: CompletionAttachment): boolean {
  if (item.kind === "message") return Boolean((item.text || "").trim());
  return Boolean((item.url || "").trim());
}

const KIND_LABEL = {
  photo: () => he.completionSlotPhoto,
  video: () => he.slotReviewKindVideo,
  audio: () => he.completionSlotAudio,
  message: () => he.completionSlotMessage,
} as const;

function itemTitle(
  req: CompletionRequirement | null,
  index: number,
  kind: CompletionAttachment["kind"],
): string {
  if (req && req.kind === kind) return slotDisplayTitle(req, index);
  return `${he.completionRequirementN(index + 1)} · ${KIND_LABEL[kind]()}`;
}

/** Un extra refusé et renvoyé tel quel bloque la fin, comme une sous-tâche exigée. */
function slotMustBeDecided(
  requirements: CompletionRequirement[],
  index: number,
  attachment: CompletionAttachment,
): boolean {
  if (requirements.length === 0 || index < requirements.length) return true;
  return attachment.review?.status === "rejected";
}

/** Même règle que le backend : une case par exigence, ou tous les fichiers sans exigence. */
export function buildReviewItems(
  requirements: CompletionRequirement[],
  attachments: CompletionAttachment[],
): ReviewItem[] {
  const items: ReviewItem[] = [];
  attachments.forEach((attachment, index) => {
    if (!isFilled(attachment)) return;
    const requirement = requirements[index] ?? null;
    items.push({
      index,
      attachment,
      requirement,
      title: itemTitle(requirement, index, attachment.kind),
      required: slotMustBeDecided(requirements, index, attachment),
    });
  });
  return items;
}

/** Un V posé au tour précédent sur un fichier inchangé reste acquis. */
export function initialDrafts(items: ReviewItem[]): SlotDrafts {
  const drafts: SlotDrafts = {};
  for (const item of items) {
    if (item.attachment.review?.status === "approved") drafts[item.index] = approvedDraft();
  }
  return drafts;
}

export function approvedDraft(): SlotDraft {
  return { status: "approved", remark: "", annotatedFile: null, annotatedPreviewUrl: null };
}

export function rejectedDraft(input: {
  remark: string;
  annotatedFile?: File | null;
  annotatedPreviewUrl?: string | null;
}): SlotDraft {
  return {
    status: "rejected",
    remark: input.remark.trim().slice(0, REMARK_MAX),
    annotatedFile: input.annotatedFile ?? null,
    annotatedPreviewUrl: input.annotatedPreviewUrl ?? null,
  };
}

export function approveAll(items: ReviewItem[]): SlotDrafts {
  return Object.fromEntries(items.map((item) => [item.index, approvedDraft()]));
}

export function setDraft(drafts: SlotDrafts, index: number, draft: SlotDraft): SlotDrafts {
  return { ...drafts, [index]: draft };
}

export function summarizeReview(items: ReviewItem[], drafts: SlotDrafts): ReviewSummary {
  const decidedItems = items.filter((item) => drafts[item.index]);
  const rejected = decidedItems.filter((item) => drafts[item.index].status === "rejected").length;
  const remaining = items.filter((item) => item.required && !drafts[item.index]).length;
  const decided = decidedItems.length;
  const canFinish = items.length > 0 && remaining === 0 && (decided > 0);
  const outcome = !canFinish ? "pending" : rejected > 0 ? "reopen" : "approve";
  return { total: items.length, decided, approved: decided - rejected, rejected, remaining, canFinish, outcome };
}

/** Un X avec remarque ou image garde sa trace côté UI ; sans rien, il reste un X nu. */
export function hasRemarkContent(draft: SlotDraft | undefined): boolean {
  return Boolean(draft && (draft.remark || draft.annotatedFile));
}

export function isRejectedAttachment(attachment: CompletionAttachment | null | undefined): boolean {
  return attachment?.review?.status === "rejected";
}

type UploadPhoto = (file: File) => Promise<{ url: string }>;

async function toDecision(
  index: number,
  draft: SlotDraft,
  uploadPhoto: UploadPhoto,
): Promise<SlotReviewDecision> {
  if (draft.status === "approved") return { index, status: "approved" };
  const decision: SlotReviewDecision = { index, status: "rejected" };
  if (draft.remark) decision.remark = draft.remark;
  if (draft.annotatedFile) decision.annotated_url = (await uploadPhoto(draft.annotatedFile)).url;
  return decision;
}

/** Envoie les images annotées puis construit la charge utile de l'API. */
export async function buildReviewPayload(input: {
  items: ReviewItem[];
  drafts: SlotDrafts;
  rating: number | null;
  uploadPhoto: UploadPhoto;
}): Promise<ReviewSlotsPayload> {
  const decisions: SlotReviewDecision[] = [];
  for (const item of input.items) {
    const draft = input.drafts[item.index];
    if (draft) decisions.push(await toDecision(item.index, draft, input.uploadPhoto));
  }
  const allApproved = decisions.every((d) => d.status === "approved");
  return { decisions, ...(allApproved ? { quality_rating: input.rating } : {}) };
}
