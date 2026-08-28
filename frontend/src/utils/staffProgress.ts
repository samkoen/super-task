import type { TeamMember, TimelineTask } from "../services/dashboardService";
import { formatTime } from "./dashboardTime";

export const STAFF_DEPARTURE_TIME = "15:00";

function isClosedPunch(task: TimelineTask): boolean {
  return (
    task.status === "completed" ||
    task.status === "pending_review" ||
    task.segment === "completed" ||
    task.segment === "pending_review"
  );
}

export type StaffSegmentKey =
  | "approved"
  | "awaiting_approval"
  | "attention"
  | "not_started";

export interface StaffSegments {
  approved: number;
  awaiting_approval: number;
  attention: number;
  not_started: number;
}

export interface StaffProgress {
  segments: StaffSegments;
  total: number;
  arrivedAt: string | null;
  departedAt: string | null;
  departureTime: string;
}

const SEGMENT_ORDER: StaffSegmentKey[] = [
  "approved",
  "awaiting_approval",
  "attention",
  "not_started",
];

export function memberTasks(member: TeamMember): TimelineTask[] {
  const byId = new Map<string, TimelineTask>();
  for (const task of [...(member.timeline ?? []), ...(member.overdue_backlog ?? [])]) {
    byId.set(task.id, task);
  }
  return [...byId.values()];
}

export function segmentForTask(task: TimelineTask): StaffSegmentKey {
  if (task.status === "completed" || task.segment === "completed") return "approved";
  if (task.status === "pending_review" || task.segment === "pending_review") {
    return "awaiting_approval";
  }
  if (
    task.status === "overdue" ||
    task.segment === "overdue" ||
    task.status === "in_progress" ||
    task.segment === "in_progress" ||
    (task.status as string) === "awaiting_response"
  ) {
    return "attention";
  }
  return "not_started";
}

export function computeStaffSegments(tasks: TimelineTask[]): StaffSegments {
  const segments: StaffSegments = {
    approved: 0,
    awaiting_approval: 0,
    attention: 0,
    not_started: 0,
  };
  for (const task of tasks) {
    segments[segmentForTask(task)] += 1;
  }
  return segments;
}

/** Arrivée = tâche שעון נוכחות fermée (started_at), sinon plus tôt started_at. */
export function computeArrivedAt(tasks: TimelineTask[]): string | null {
  const flagged = tasks.filter((t) => t.is_work_start);
  const pool = flagged.length ? flagged.filter(isClosedPunch) : tasks;
  let earliest: string | null = null;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const task of pool) {
    if (!task.started_at) continue;
    const ms = new Date(task.started_at).getTime();
    if (Number.isNaN(ms) || ms >= earliestMs) continue;
    earliestMs = ms;
    earliest = task.started_at;
  }
  return earliest;
}

/** Sortie = completed_at de la tâche סיום משמרת fermée. */
export function computeDepartedAt(tasks: TimelineTask[]): string | null {
  const flagged = tasks.filter((t) => t.is_work_end).filter(isClosedPunch);
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const task of flagged) {
    if (!task.completed_at) continue;
    const ms = new Date(task.completed_at).getTime();
    if (Number.isNaN(ms) || ms <= latestMs) continue;
    latestMs = ms;
    latest = task.completed_at;
  }
  return latest;
}

export function computeStaffProgress(member: TeamMember): StaffProgress {
  const tasks = memberTasks(member);
  const segments = computeStaffSegments(tasks);
  const total =
    segments.approved +
    segments.awaiting_approval +
    segments.attention +
    segments.not_started;
  const departedAt = computeDepartedAt(tasks);
  return {
    segments,
    total,
    arrivedAt: computeArrivedAt(tasks),
    departedAt,
    departureTime: departedAt ? formatTime(departedAt) : STAFF_DEPARTURE_TIME,
  };
}

export function segmentPercents(segments: StaffSegments, total: number): Record<StaffSegmentKey, number> {
  if (total <= 0) {
    return { approved: 0, awaiting_approval: 0, attention: 0, not_started: 0 };
  }
  const raw = SEGMENT_ORDER.map((key) => ({
    key,
    value: (segments[key] / total) * 100,
  }));
  const floored = raw.map((r) => ({ ...r, floor: Math.floor(r.value) }));
  let rest = 100 - floored.reduce((sum, r) => sum + r.floor, 0);
  const byRemainder = [...floored].sort(
    (a, b) => b.value - b.floor - (a.value - a.floor),
  );
  const result = Object.fromEntries(floored.map((r) => [r.key, r.floor])) as Record<
    StaffSegmentKey,
    number
  >;
  for (const row of byRemainder) {
    if (rest <= 0) break;
    result[row.key] += 1;
    rest -= 1;
  }
  return result;
}

export function formatPresenceLabel(
  arrivedAt: string | null,
  departedAt: string | null,
  labels: { arrival: string; departure: string; notArrived: string; stillOnShift: string },
): string {
  if (!arrivedAt) return labels.notArrived;
  const dep = departedAt ? formatTime(departedAt) : labels.stillOnShift;
  return `${labels.arrival} ${formatTime(arrivedAt)} · ${labels.departure} ${dep}`;
}

export function groupMemberTasks(tasks: TimelineTask[]): {
  inProgress: TimelineTask[];
  completed: TimelineTask[];
  waiting: TimelineTask[];
} {
  const inProgress: TimelineTask[] = [];
  const completed: TimelineTask[] = [];
  const waiting: TimelineTask[] = [];
  for (const task of tasks) {
    if (task.status === "completed" || task.segment === "completed") {
      completed.push(task);
    } else if (task.status === "in_progress" || task.segment === "in_progress") {
      inProgress.push(task);
    } else {
      waiting.push(task);
    }
  }
  waiting.sort((a, b) => {
    const aNext = Boolean(a.is_manager_next || a.manager_next_at);
    const bNext = Boolean(b.is_manager_next || b.manager_next_at);
    if (aNext !== bNext) return aNext ? -1 : 1;
    return a.due_at.localeCompare(b.due_at);
  });
  return { inProgress, completed, waiting };
}

export { SEGMENT_ORDER };
