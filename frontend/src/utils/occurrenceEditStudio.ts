import type { OccurrenceEditForm } from "../components/tasks/taskOccurrenceEditForm";
import type { TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import { splitDueAt } from "./studioOnce";

/** Champs comparés pour savoir s'il reste quelque chose à enregistrer (les médias ont leur propre drapeau). */
function comparable(form: OccurrenceEditForm) {
  return {
    title: form.title.trim(),
    description: form.description,
    due_at: form.due_at,
    assignee_user_id: form.assignee_user_id,
    completion_requirements: form.completion_requirements,
    apply_to_network: form.apply_to_network,
    start_url: (form.start_url ?? "").trim(),
  };
}

export function occurrenceDraftDirty(form: OccurrenceEditForm, initial: OccurrenceEditForm, mediaDirty: boolean): boolean {
  return mediaDirty || JSON.stringify(comparable(form)) !== JSON.stringify(comparable(initial));
}

/** Premier blocage avant « שמירת שינויים » : titre, date et heure, oved d'une tâche ponctuelle. */
export function occurrenceEditBlocker(form: OccurrenceEditForm, task: Pick<TaskOccurrence, "task_kind">): string {
  if (!form.title.trim()) return he.studioNeedTitle;
  const { date, time } = splitDueAt(form.due_at);
  if (!date || !time) return he.studioNeedDueAt;
  if (task.task_kind === "ad_hoc" && !form.assignee_user_id) return he.newTaskAssigneeRequired;
  return "";
}

/** « המשימה הבאה » n'a de sens que pour une tâche encore ouverte, attribuée, pas en attente d'ichour. */
export function canMarkManagerNext(task: Pick<TaskOccurrence, "status" | "assignee_user_id">): boolean {
  if (["completed", "cancelled", "pending_review"].includes(task.status)) return false;
  return Boolean(task.assignee_user_id);
}
