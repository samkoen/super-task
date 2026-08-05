import type { TeamMember, TimelineTask } from "../services/dashboardService";
import { memberTasks } from "./staffProgress";

/** Colonnes ניתוח מצב לפי עובדים (SPEC חלק ב'). */
export type StatusAnalysisColumn =
  | "awaiting_response"
  | "pending"
  | "in_progress"
  | "pending_review"
  | "completed_today";

export const STATUS_ANALYSIS_COLUMNS: StatusAnalysisColumn[] = [
  "awaiting_response",
  "pending",
  "in_progress",
  "pending_review",
  "completed_today",
];

export interface StatusAnalysisRow {
  userId: string;
  fullName: string;
  jobFunction: string | null;
  counts: Record<StatusAnalysisColumn, number>;
  tasksByColumn: Record<StatusAnalysisColumn, TimelineTask[]>;
}

export interface StatusAnalysisTotals {
  counts: Record<StatusAnalysisColumn, number>;
}

function emptyBuckets(): Record<StatusAnalysisColumn, TimelineTask[]> {
  return {
    awaiting_response: [],
    pending: [],
    in_progress: [],
    pending_review: [],
    completed_today: [],
  };
}

export function columnForTask(task: TimelineTask): StatusAnalysisColumn | null {
  if (task.status === "awaiting_response" || task.segment === "awaiting_response") {
    return "awaiting_response";
  }
  if (task.status === "pending_review" || task.segment === "pending_review") {
    return "pending_review";
  }
  if (task.status === "completed" || task.segment === "completed") {
    return "completed_today";
  }
  if (task.status === "in_progress" || task.segment === "in_progress") {
    return "in_progress";
  }
  if (
    task.status === "pending" ||
    task.segment === "upcoming" ||
    task.status === "overdue" ||
    task.segment === "overdue"
  ) {
    return "pending";
  }
  return null;
}

export function buildStatusAnalysisRows(team: TeamMember[] | null | undefined): StatusAnalysisRow[] {
  if (!team?.length) return [];
  return team.map((member) => {
    const buckets = emptyBuckets();
    for (const task of memberTasks(member)) {
      const col = columnForTask(task);
      if (col) buckets[col].push(task);
    }
    const counts = Object.fromEntries(
      STATUS_ANALYSIS_COLUMNS.map((c) => [c, buckets[c].length]),
    ) as Record<StatusAnalysisColumn, number>;
    return {
      userId: member.user_id,
      fullName: member.full_name,
      jobFunction: member.job_function,
      counts,
      tasksByColumn: buckets,
    };
  });
}

export function sumStatusAnalysis(rows: StatusAnalysisRow[]): StatusAnalysisTotals {
  const counts = Object.fromEntries(
    STATUS_ANALYSIS_COLUMNS.map((c) => [c, 0]),
  ) as Record<StatusAnalysisColumn, number>;
  for (const row of rows) {
    for (const col of STATUS_ANALYSIS_COLUMNS) {
      counts[col] += row.counts[col];
    }
  }
  return { counts };
}

export type PendingGroupMode = "assignee" | "department" | "promotion_stage";

export interface PendingTaskGroup {
  key: string;
  label: string;
  tasks: TimelineTask[];
}

/** Regroupe les tâches pending (שורה 2) selon le mode de filtre SPEC. */
export function groupPendingTasks(
  tasks: TimelineTask[],
  mode: PendingGroupMode,
  stageLabels?: Map<string, string>,
): PendingTaskGroup[] {
  const map = new Map<string, PendingTaskGroup>();
  for (const task of tasks) {
    const { key, label } = groupKeyLabel(task, mode, stageLabels);
    const existing = map.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(key, { key, label, tasks: [task] });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "he"));
}

function groupKeyLabel(
  task: TimelineTask,
  mode: PendingGroupMode,
  stageLabels?: Map<string, string>,
): { key: string; label: string } {
  if (mode === "department") {
    const name = task.department_name?.trim() || "";
    return { key: name || "__none__", label: name || "—" };
  }
  if (mode === "promotion_stage") {
    const stageId = (task as TimelineTask & { promotion_stage_id?: string | null }).promotion_stage_id;
    if (stageId && stageLabels?.has(stageId)) {
      return { key: stageId, label: stageLabels.get(stageId)! };
    }
    return { key: "__none__", label: "—" };
  }
  const name = task.assignee_name?.trim() || "";
  const dept = task.department_name?.trim();
  const label = name ? (dept ? `${name} (${dept})` : name) : "—";
  return { key: name || "__none__", label };
}
