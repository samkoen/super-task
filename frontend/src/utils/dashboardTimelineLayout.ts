import type { TimelineTask } from "../services/dashboardService";

export const IN_PROGRESS_ALERT_MINUTES = 120;
export const BAR_REFERENCE_MINUTES = 90;

export type TimelineRowKind = TimelineTask["segment"];

export interface TimelineRowModel {
  task: TimelineTask;
  kind: TimelineRowKind;
  sortKey: string;
  timeLabel: string;
  barPercent: number;
  durationLabel: string | null;
}

function parseMs(iso: string): number {
  return new Date(iso).getTime();
}

export function taskDisplayTime(task: TimelineTask, kind: TimelineRowKind): string {
  if (kind === "completed" || kind === "in_progress" || kind === "pending_review") {
    if (task.started_at) {
      const d = new Date(task.started_at);
      return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    }
  }
  if (kind === "overdue" || kind === "upcoming") {
    const d = new Date(task.due_at);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
  return "—";
}

export function barWidthPercent(task: TimelineTask, kind: TimelineRowKind): number {
  if (kind === "upcoming") return 18;
  if (kind === "overdue") return 22;
  const minutes =
    kind === "completed"
      ? task.duration_minutes
      : kind === "in_progress" || kind === "pending_review"
        ? task.elapsed_minutes ?? task.duration_minutes
        : null;
  if (minutes == null || minutes <= 0) return 20;
  return Math.min(100, Math.max(20, Math.round((minutes / BAR_REFERENCE_MINUTES) * 100)));
}

export function buildTimelineRows(
  timeline: TimelineTask[],
  overdueBacklog: TimelineTask[],
): TimelineRowModel[] {
  const rows: TimelineRowModel[] = [];

  const completed = timeline
    .filter((t) => t.segment === "completed")
    .sort((a, b) => parseMs(a.started_at ?? a.due_at) - parseMs(b.started_at ?? b.due_at));
  const inProgress = timeline.filter((t) => t.segment === "in_progress");
  const pendingReview = timeline.filter((t) => t.segment === "pending_review");
  const upcoming = timeline
    .filter((t) => t.segment === "upcoming")
    .sort((a, b) => parseMs(a.due_at) - parseMs(b.due_at));
  const overdue = [...overdueBacklog]
    .map((t) => ({ ...t, segment: "overdue" as const }))
    .sort((a, b) => parseMs(a.due_at) - parseMs(b.due_at));

  for (const task of completed) {
    rows.push(toRow(task, "completed"));
  }
  for (const task of inProgress) {
    rows.push(toRow(task, "in_progress"));
  }
  for (const task of pendingReview) {
    rows.push(toRow(task, "pending_review"));
  }
  for (const task of upcoming) {
    rows.push(toRow(task, "upcoming"));
  }
  for (const task of overdue) {
    rows.push(toRow(task, "overdue"));
  }
  return rows;
}

function toRow(task: TimelineTask, kind: TimelineRowKind): TimelineRowModel {
  const durationLabel =
    kind === "completed" && task.duration_minutes != null
      ? formatDurationShort(task.duration_minutes)
      : kind === "in_progress" && task.elapsed_minutes != null
        ? formatDurationShort(task.elapsed_minutes)
        : kind === "pending_review" && task.completed_at
          ? formatTimeShort(task.completed_at)
          : null;

  return {
    task,
    kind,
    sortKey: task.started_at ?? task.due_at,
    timeLabel: taskDisplayTime(task, kind),
    barPercent: barWidthPercent(task, kind),
    durationLabel,
  };
}

function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function sortCompletedTasks(tasks: TimelineTask[]): TimelineTask[] {
  return [...tasks].sort(
    (a, b) => parseMs(b.completed_at ?? b.due_at) - parseMs(a.completed_at ?? a.due_at),
  );
}

export function sortCompletedByEmployee(tasks: TimelineTask[]): TimelineTask[] {
  return [...tasks].sort((a, b) => {
    const nameCmp = (a.assignee_name ?? "").localeCompare(b.assignee_name ?? "", "he");
    if (nameCmp !== 0) return nameCmp;
    return parseMs(b.completed_at ?? b.due_at) - parseMs(a.completed_at ?? a.due_at);
  });
}

export function sortInProgressTasks(tasks: TimelineTask[]): TimelineTask[] {
  return [...tasks].sort(
    (a, b) => (b.elapsed_minutes ?? 0) - (a.elapsed_minutes ?? 0),
  );
}

export function isLongInProgress(task: TimelineTask): boolean {
  return (task.elapsed_minutes ?? 0) >= IN_PROGRESS_ALERT_MINUTES;
}
