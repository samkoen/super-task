/** Tri focus oved : בטיפול, sinon next menahel, sinon plus en retard. */

export function sortInProgressFocusFirst<T extends { started_at?: string | null; due_at: string }>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const sa = a.started_at || "";
    const sb = b.started_at || "";
    if (sa !== sb) return sb.localeCompare(sa);
    return a.due_at.localeCompare(b.due_at);
  });
}

export function sortMostOverdueFirst<T extends { due_at: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => a.due_at.localeCompare(b.due_at));
}

export function isManagerNextTask(task: {
  manager_next_at?: string | null;
  is_manager_next?: boolean;
}): boolean {
  return Boolean(task.is_manager_next || task.manager_next_at);
}

export function sortEmployeeOpenFocus<
  T extends {
    due_at: string;
    manager_next_at?: string | null;
    is_manager_next?: boolean;
  },
>(tasks: T[], hasInProgress: boolean): T[] {
  if (hasInProgress) return sortMostOverdueFirst(tasks);
  const nextTasks = tasks.filter((t) => isManagerNextTask(t));
  const rest = tasks.filter((t) => !isManagerNextTask(t));
  const nextSorted = [...nextTasks].sort((a, b) =>
    (b.manager_next_at || "").localeCompare(a.manager_next_at || ""),
  );
  return [...nextSorted, ...sortMostOverdueFirst(rest)];
}
