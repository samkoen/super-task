import type { DirectChatCard } from "../services/directChatService";
import type {
  ChatStatusKind,
  ChatVisualKind,
  ManagerDayTaskChat,
  TaskStatus,
} from "../services/taskService";

/**
 * Pastilles de l'onglet שיחות (Filter Chip, comme la liste oved) : toutes, « לטיפולך »
 * (ממתין לי), preuves à valider, seulement les fils de tâche, seulement les directs.
 */
export type ManagerChatsFilter = "all" | "action" | "pending" | "tasks" | "directs";

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
  /** Avatar : la personne (contact direct, ou oved du fil de tâche). */
  avatarName: string;
  avatarUrl: string | null;
  /** Fil de tâche : pastille de type (Figma Chat Row Role=Manager) et Chat Status Tag. */
  visualKind?: ChatVisualKind;
  chatStatus?: ChatStatusKind | null;
  lastMine?: boolean;
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
    avatarName: card.counterpart_name,
    avatarUrl: card.counterpart_avatar_url ?? null,
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
    avatarName: card.counterpart_name,
    avatarUrl: card.counterpart_avatar_url ?? null,
    visualKind: task.visual_kind ?? "physical",
    chatStatus: task.chat_status ?? null,
    lastMine: Boolean(task.last_mine),
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

function inBranch(rowBranchId: string | null | undefined, branchId: string): boolean {
  return !branchId || !rowBranchId || rowBranchId === branchId;
}

/**
 * Non-lus du point orange de « שיחות » : exactement les lignes de la page — non-lus directs de
 * chaque contact (mon manager compris, compté une fois) et non-lus de chaque fil de tâche du jour,
 * y compris ceux d'un oved sans conversation directe. Un snif choisi garde ses lignes et celles
 * hors snif, comme `scopeManagerInbox`.
 */
export function managerChatsUnread(directs: DirectChatCard[], tasks: ManagerDayTaskChat[], branchId: string): number {
  const seen = new Set<string>();
  let total = 0;
  for (const card of directs) {
    const key = `${card.kind}-${card.counterpart_user_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (card.kind === "up" || inBranch(card.branch_id, branchId)) total += Math.max(0, directUnreadOf(card));
  }
  for (const task of tasks) {
    if (inBranch(task.branch_id, branchId)) total += Math.max(0, task.unread_count ?? 0);
  }
  return total;
}

function matchesManagerFilter(entry: ManagerInboxEntry, filter: ManagerChatsFilter): boolean {
  if (filter === "action") return entry.waiting;
  if (filter === "pending") return entry.chatStatus === "pending_review";
  if (filter === "tasks") return entry.kind === "task";
  if (filter === "directs") return entry.kind === "direct";
  return true;
}

/** Filtre par pastille puis par recherche (titre, contexte ou aperçu). */
export function filterManagerInbox(
  entries: ManagerInboxEntry[],
  filter: ManagerChatsFilter,
  query: string,
): ManagerInboxEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!matchesManagerFilter(entry, filter)) return false;
    if (!needle) return true;
    return `${entry.title} ${entry.context ?? ""} ${entry.preview}`.toLowerCase().includes(needle);
  });
}
