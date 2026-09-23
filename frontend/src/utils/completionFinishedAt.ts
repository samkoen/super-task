import { he } from "../i18n/he";
import { formatDueAt } from "./dateView";
import { showsCompletionOutcome } from "./employeeIncompleteSubmit";

/** Heure du clic סיום משימה, ou null si la tâche n'est plus en revue / close. */
export function taskFinishedAtText(task: {
  status: string;
  completion?: { completed_at?: string | null } | null;
}): string | null {
  if (!showsCompletionOutcome(task.status)) return null;
  return completionFinishedText(task.completion?.completed_at);
}

export function completionFinishedText(completedAt: string | null | undefined): string | null {
  if (!completedAt?.trim()) return null;
  const when = formatDueAt(completedAt);
  if (when === "—") return null;
  return `${he.markDone}: ${when}`;
}
