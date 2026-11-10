import { he } from "../i18n/he";
import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";
import { isHandedOver, type SlotUploadStatus } from "./slotUploadState";

export type StepChoice = { index: number | null; label: string };

/** Puces « על איזה שלב ? » : « כללי » (toute la tâche) puis « N · titre » par sous-tâche du menahel. */
export function stepChoices(requirements: CompletionRequirement[]): StepChoice[] {
  return [
    { index: null, label: he.flowChatGeneral },
    ...requirements.map((req, index) => ({ index, label: he.flowChatChip(index + 1, slotDisplayTitle(req, index)) })),
  ];
}

/** Tag d'une bulle (« שלב 2 · ספירת מדפים ») ; null = message général ou étape disparue. */
export function stepTagLabel(requirements: CompletionRequirement[], index: number | null | undefined): string | null {
  if (typeof index !== "number" || !requirements[index]) return null;
  return he.flowChatStepTag(index + 1, slotDisplayTitle(requirements[index], index));
}

export type StepBar = "done" | "current" | "todo";

export type ChatProgress = { bars: StepBar[]; current: number | null };

/** Avancement du flow pour la barre de contexte : cartes remises, carte en cours (la première restante), à faire. */
export function chatProgress(statuses: SlotUploadStatus[]): ChatProgress {
  const firstTodo = statuses.findIndex((status) => !isHandedOver(status));
  const bars = statuses.map<StepBar>((status, index) => {
    if (isHandedOver(status)) return "done";
    return index === firstTodo ? "current" : "todo";
  });
  return { bars, current: firstTodo === -1 ? null : firstTodo };
}

export function chatStatusText(progress: ChatProgress): string {
  if (!progress.bars.length) return he.flowChatStatusPlain;
  if (progress.current === null) return he.flowChatStatusAllDone;
  return he.flowChatStatus(progress.current + 1, progress.bars.length);
}
