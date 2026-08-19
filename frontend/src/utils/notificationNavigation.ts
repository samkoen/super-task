/** Navigation alerte oved → tâche. */
export function employeeTaskAlertPath(occurrenceId: string): string {
  return `/employee?task=${encodeURIComponent(occurrenceId)}`;
}

export function taskIdFromSearch(search: string): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const id = new URLSearchParams(raw).get("task")?.trim();
  return id || null;
}
