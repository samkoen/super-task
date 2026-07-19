import type { TeamMember, TimelineTask } from "../services/dashboardService";
import { IN_PROGRESS_ALERT_MINUTES } from "./dashboardTimelineLayout";

export type TeamTimelineSortMode = "urgency" | "name" | "in_progress" | "workload";

export const TEAM_TIMELINE_SORT_MODES: TeamTimelineSortMode[] = [
  "urgency",
  "name",
  "in_progress",
  "workload",
];

export const TEAM_TIMELINE_SORT_STORAGE_KEY = "manager.timeline.sortMode";

const DUE_SOON_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isTeamTimelineSortMode(value: string): value is TeamTimelineSortMode {
  return (TEAM_TIMELINE_SORT_MODES as string[]).includes(value);
}

export function readStoredTeamTimelineSort(): TeamTimelineSortMode {
  try {
    const raw = localStorage.getItem(TEAM_TIMELINE_SORT_STORAGE_KEY) ?? "";
    return isTeamTimelineSortMode(raw) ? raw : "urgency";
  } catch {
    return "urgency";
  }
}

export function writeStoredTeamTimelineSort(mode: TeamTimelineSortMode): void {
  try {
    localStorage.setItem(TEAM_TIMELINE_SORT_STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

function isOverdueTask(task: TimelineTask): boolean {
  return task.segment === "overdue" || task.status === "overdue";
}

/** Score urgence (plus haut = plus prioritaire). */
export function memberUrgencyScore(member: TeamMember, nowMs = Date.now()): number {
  let score = 0;
  const tasks = [...member.timeline, ...member.overdue_backlog];
  for (const task of tasks) {
    score += taskUrgencyPoints(task, nowMs);
  }
  return score;
}

function taskUrgencyPoints(task: TimelineTask, nowMs: number): number {
  if (isOverdueTask(task)) {
    const days = Math.max(0, Math.floor((nowMs - new Date(task.due_at).getTime()) / DAY_MS));
    return 1000 + days * 100;
  }
  if (task.status === "pending_review" || task.segment === "pending_review") {
    return 250;
  }
  if (
    (task.status === "in_progress" || task.segment === "in_progress")
    && (task.elapsed_minutes ?? 0) >= IN_PROGRESS_ALERT_MINUTES
  ) {
    return 300;
  }
  if (task.status === "pending" || task.segment === "upcoming") {
    const untilDue = new Date(task.due_at).getTime() - nowMs;
    if (untilDue <= DUE_SOON_MS) return 150;
  }
  return 0;
}

function byName(a: TeamMember, b: TeamMember): number {
  return a.full_name.localeCompare(b.full_name, "he");
}

export function sortTeamTimeline(
  team: TeamMember[],
  mode: TeamTimelineSortMode,
  nowMs = Date.now(),
): TeamMember[] {
  const copy = [...team];
  if (mode === "name") {
    return copy.sort(byName);
  }
  if (mode === "workload") {
    return copy.sort((a, b) => b.open_tasks - a.open_tasks || byName(a, b));
  }
  if (mode === "in_progress") {
    return copy.sort((a, b) => {
      const aBusy = a.status === "in_progress" ? 1 : 0;
      const bBusy = b.status === "in_progress" ? 1 : 0;
      return bBusy - aBusy || memberUrgencyScore(b, nowMs) - memberUrgencyScore(a, nowMs) || byName(a, b);
    });
  }
  // urgency (default)
  return copy.sort(
    (a, b) => memberUrgencyScore(b, nowMs) - memberUrgencyScore(a, nowMs) || byName(a, b),
  );
}
