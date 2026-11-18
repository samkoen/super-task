import { he } from "../i18n/he";
import type { CompletionRequirement } from "./completionMedia";
import { slotDisplayTitle } from "./completionSlotView";
import type { ChatMessageView } from "./chatMessageView";

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

/** Fil d'une sous-tâche : ses messages et les messages généraux de la tâche (sans sous-tâche). */
export function slotThreadMessages<T extends Pick<ChatMessageView, "slot_index">>(messages: T[], slotIndex: number): T[] {
  return messages.filter((msg) => typeof msg.slot_index !== "number" || msg.slot_index === slotIndex);
}
