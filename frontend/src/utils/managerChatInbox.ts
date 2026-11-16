import type { DirectChatCard } from "../services/directChatService";
import type { ManagerDayTaskChat, TaskStatus } from "../services/taskService";

/** Pastilles de l'onglet שיחות : toutes, seulement les fils de tâche, seulement les directs. */
export type ManagerChatsFilter = "all" | "tasks" | "directs";

/** Une ligne de la boîte unifiée : un chat direct ou un fil de tâche, au même niveau. */
export interface ManagerInboxEntry {
  key: string;
  kind: "direct" | "task";
  title: string;
  /** Sous-titre : nom du snif (direct) ou nom de l'oved (fil de tâche). */
  context: string | null;
  preview: string;
  lastAt: string | null;
  unread: number;
  /** « ממתין לי » : remonte en tête de la boîte. */
  waiting: boolean;
  /** Snif de la ligne ; `null` = hors snif (mon manager, conversation réseau), gardée partout. */
  branchId: string | null;
  direct?: DirectChatCard;
  task?: ManagerInboxTask;
}

export interface ManagerInboxTask {
  occurrenceId: string;
  title: string;
  status: TaskStatus;
  employeeId: string;
  employeeName: string;
}

/** Fils de tâche d'un oved (issus de `listManagerAllDayChats`, regroupés par oved). */
export interface ManagerEmployeeTaskChats {
  card: DirectChatCard;
  tasks: ManagerDayTaskChat[];
}

/** Non-lus directs d'un contact (sans compter les non-lus de ses fils de tâche). */
export function directUnreadOf(card: Pick<DirectChatCard, "direct_unread_count" | "unread_count">): number {
  return card.direct_unread_count ?? card.unread_count ?? 0;
}

/** Statuts où un fil de tâche attend le menahel : question de l'oved, ou preuve à valider. */
const TASK_WAITING: TaskStatus[] = ["awaiting_response", "pending_review"];

export function taskWaitsForManager(status: TaskStatus, unread: number): boolean {
  return unread > 0 || TASK_WAITING.includes(status);
}

function directEntry(card: DirectChatCard): ManagerInboxEntry {
  const unread = directUnreadOf(card);
  return {
    key: `direct-${card.kind}-${card.counterpart_user_id}`,
    kind: "direct",
    title: card.counterpart_name,
    context: card.kind === "down" ? card.branch_name ?? null : null,
    preview: card.last_preview ?? "",
    lastAt: card.last_at,
    unread,
    waiting: unread > 0,
    branchId: card.kind === "down" ? card.branch_id ?? null : null,
    direct: card,
  };
}

function taskEntry(card: DirectChatCard, task: ManagerDayTaskChat): ManagerInboxEntry {
  const unread = task.unread_count ?? 0;
  return {
    key: `task-${task.id}`,
    kind: "task",
    title: task.title,
    context: card.counterpart_name,
    preview: task.last_preview ?? "",
    lastAt: task.last_at,
    unread,
    waiting: taskWaitsForManager(task.status, unread),
    branchId: task.branch_id ?? card.branch_id ?? null,
    task: {
      occurrenceId: task.id,
      title: task.title,
      status: task.status,
      employeeId: card.counterpart_user_id,
      employeeName: card.counterpart_name,
    },
  };
}

/** Met directs et fils de tâche au même niveau, dans une seule liste. */
export function buildManagerInboxEntries(
  directs: DirectChatCard[],
  taskChats: ManagerEmployeeTaskChats[],
): ManagerInboxEntry[] {
  const entries = directs.map(directEntry);
  for (const { card, tasks } of taskChats) {
    for (const task of tasks) entries.push(taskEntry(card, task));
  }
  return entries;
}

function timeMs(at: string | null): number {
  return at ? new Date(at).getTime() : 0;
}

/** « ממתין לי » d'abord, puis du plus récent au plus ancien. */
export function sortManagerInbox(entries: ManagerInboxEntry[]): ManagerInboxEntry[] {
  return [...entries].sort((a, b) => {
    if (a.waiting !== b.waiting) return a.waiting ? -1 : 1;
    return timeMs(b.lastAt) - timeMs(a.lastAt);
  });
}

/**
 * Périmètre du menahel reshet (étape 8) : un snif choisi ne garde que ses lignes, plus celles
 * qui n'appartiennent à aucun snif (son propre manager, une conversation réseau).
 */
export function scopeManagerInbox(entries: ManagerInboxEntry[], branchId: string): ManagerInboxEntry[] {
  if (!branchId) return entries;
  return entries.filter((entry) => !entry.branchId || entry.branchId === branchId);
}

/** Filtre par pastille puis par recherche (titre ou contexte). */
export function filterManagerInbox(
  entries: ManagerInboxEntry[],
  filter: ManagerChatsFilter,
  query: string,
): ManagerInboxEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter === "tasks" && entry.kind !== "task") return false;
    if (filter === "directs" && entry.kind !== "direct") return false;
    if (!needle) return true;
    return `${entry.title} ${entry.context ?? ""}`.toLowerCase().includes(needle);
  });
}
