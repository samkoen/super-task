import type { CompletionAttachment } from "./completionMedia";
import { attachmentsFromCompletion } from "./completionSlotView";

/** Photos et vidéos prises pour la tâche, sans l'audio ni les exemples. */
export function taskChatVisualAttachments(
  completion?: Parameters<typeof attachmentsFromCompletion>[0],
): CompletionAttachment[] {
  return attachmentsFromCompletion(completion).filter(
    (item) => (item.kind === "photo" || item.kind === "video") && Boolean(item.url?.trim()),
  );
}
