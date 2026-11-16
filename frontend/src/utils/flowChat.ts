import { he } from "../i18n/he";
import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";
import { isHandedOver, type SlotUploadStatus } from "./slotUploadState";

export type TopicChoice = { index: number; label: string; done: boolean };

/** Pastilles « על איזה סרטון מדברים ? » : une par sous-tâche du menahel ; `done` quand la carte est remise (ou non filmée). */
export function topicChoices(requirements: CompletionRequirement[], statuses: SlotUploadStatus[]): TopicChoice[] {
  return requirements.map((req, index) => ({
    index,
    label: slotDisplayTitle(req, index),
    done: isHandedOver(statuses[index] ?? "idle"),
  }));
}

/** Tag d'une bulle (titre du sous-tâche) ; null = message général ou sous-tâche disparue. */
export function stepTagLabel(requirements: CompletionRequirement[], index: number | null | undefined): string | null {
  if (typeof index !== "number" || !requirements[index]) return null;
  return slotDisplayTitle(requirements[index], index);
}

/** Sous-titre du champ de saisie : « כתבו הודעה על סרטון מקרר ריק… » une fois un sujet choisi. */
export function composerPlaceholder(requirements: CompletionRequirement[], selected: number | null): string {
  const title = stepTagLabel(requirements, selected);
  return title ? he.flowChatPlaceholderTopic(title) : he.flowChatPlaceholder;
}
