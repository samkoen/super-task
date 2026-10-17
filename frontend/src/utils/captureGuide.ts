import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle, slotExampleSrc } from "./completionSlotView";

/** Ce que le menahel a défini pour une sous-tâche, rappelé dans l'écran caméra. */
export type CaptureGuide = {
  title: string;
  hint?: string;
  exampleSrc?: string | null;
};

export function guideFromRequirement(req: CompletionRequirement, index: number): CaptureGuide {
  const hint = (req.hint || "").trim();
  const exampleSrc = req.kind === "photo" || req.kind === "video" ? slotExampleSrc(req) : null;
  return {
    title: slotDisplayTitle(req, index),
    ...(hint ? { hint } : {}),
    ...(exampleSrc ? { exampleSrc } : {}),
  };
}

/** Hauteur d'une sous-tâche : un tiers de l'écran visible, jamais écrasée. */
export const SUBTASK_TILE_HEIGHT = "max(176px, calc((100dvh - 250px) / 3))";

/** Texte lu / écouté pour la tâche entière : titre puis consigne. */
export function taskSpeechText(title: string, description?: string | null): string {
  return [title, (description || "").trim()].filter((part) => part.trim()).join(". ");
}
