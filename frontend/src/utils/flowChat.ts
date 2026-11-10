import { he } from "../i18n/he";
import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";

export type SubtaskChoice = { index: number | null; label: string };

/** Choix du sélecteur : « כללי » (toute la tâche) puis une entrée par sous-tâche du menahel. */
export function subtaskChoices(requirements: CompletionRequirement[]): SubtaskChoice[] {
  return [
    { index: null, label: he.flowChatGeneral },
    ...requirements.map((req, index) => ({ index, label: slotDisplayTitle(req, index) })),
  ];
}

/** Brouillon pré-écrit dans le chat : question sur la sous-tâche choisie, rien pour « כללי ». */
export function chatDraftFor(requirements: CompletionRequirement[], index: number | null): string | undefined {
  if (index === null || !requirements[index]) return undefined;
  return he.subtaskQuestionDraft(slotDisplayTitle(requirements[index], index));
}
