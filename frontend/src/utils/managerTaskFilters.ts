import type { TaskOccurrence, TaskStatus } from "../services/taskService";
import { defaultRangeFrom, shiftDay, todayIso, type TaskDateViewMode } from "./dateView";

export const MANAGER_TASK_STATUS_FILTERS: TaskStatus[] = [
  "pending",
  "in_progress",
  "pending_review",
  "overdue",
  "completed",
  "cancelled",
];

export type ManagerTasksUrlFilters = {
  employeeId: string;
  status: string;
  dueOn: string;
  dateViewMode: TaskDateViewMode;
  rangeFrom: string;
  rangeTo: string;
};

export function filterManagerTaskOccurrences(
  rows: TaskOccurrence[],
  filters: { employeeId?: string; status?: string }
): TaskOccurrence[] {
  const employeeId = (filters.employeeId || "").trim();
  const status = (filters.status || "").trim();
  return rows.filter((row) => {
    if (employeeId && row.assignee_user_id !== employeeId) return false;
    if (status && row.status !== status) return false;
    return true;
  });
}

function isTaskStatus(value: string): value is TaskStatus {
  return (MANAGER_TASK_STATUS_FILTERS as string[]).includes(value);
}

/** Parse deep-link query params from /manager/tasks?... */
export function parseManagerTasksSearchParams(
  params: URLSearchParams,
  fallbackDay = todayIso()
): ManagerTasksUrlFilters {
  const statusRaw = (params.get("status") || "").trim();
  const status = isTaskStatus(statusRaw) ? statusRaw : "";
  const employeeId = (params.get("employee") || "").trim();
  const dueOn = (params.get("due_on") || "").trim() || fallbackDay;
  const modeRaw = (params.get("mode") || "").trim();
  let dateViewMode: TaskDateViewMode =
    modeRaw === "range" || modeRaw === "day" ? modeRaw : "day";
  let rangeFrom = (params.get("from") || "").trim();
  let rangeTo = (params.get("to") || "").trim();

  // Overdue tasks often have due_at before "today" — open a range so they stay visible.
  if (status === "overdue" && modeRaw !== "day") {
    dateViewMode = "range";
    rangeFrom = rangeFrom || shiftDay(dueOn, -30);
    rangeTo = rangeTo || dueOn;
  } else if (!rangeFrom || !rangeTo) {
    const window = defaultRangeFrom(dueOn, 7);
    rangeFrom = rangeFrom || window.from;
    rangeTo = rangeTo || window.to;
  }

  return { employeeId, status, dueOn, dateViewMode, rangeFrom, rangeTo };
}

export function buildManagerTasksPath(filters: {
  employeeId?: string;
  status?: string;
  dueOn?: string;
  dateViewMode?: TaskDateViewMode;
  rangeFrom?: string;
  rangeTo?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.employeeId) params.set("employee", filters.employeeId);
  if (filters.status) params.set("status", filters.status);
  if (filters.dueOn) params.set("due_on", filters.dueOn);
  if (filters.dateViewMode === "range") {
    params.set("mode", "range");
    if (filters.rangeFrom) params.set("from", filters.rangeFrom);
    if (filters.rangeTo) params.set("to", filters.rangeTo);
  } else if (filters.dateViewMode === "day") {
    params.set("mode", "day");
  }
  const qs = params.toString();
  return qs ? `/manager/tasks?${qs}` : "/manager/tasks";
}
