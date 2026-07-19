import type { TaskOccurrence } from "../services/taskService";

/** Filtre les occurrences du drawer timeline (employé + jour déjà chargé côté API). */
export function filterTasksForEmployee(
  tasks: TaskOccurrence[],
  employeeId: string,
): TaskOccurrence[] {
  const id = employeeId.trim();
  if (!id) return [];
  return tasks.filter((t) => t.assignee_user_id === id);
}
