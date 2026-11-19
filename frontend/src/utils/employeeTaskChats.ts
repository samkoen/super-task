import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import type { ChatStatusKind, ChatVisualKind, EmployeeTaskChat } from "../services/taskService";
import { formatChatDayBadge, messageDayKey } from "./chatDay";
import { formatDateIso } from "./dateView";

export type EmployeeChatRow =
  | {
      kind: "general";
      title: string;
      last_preview: string | null;
      last_at: string | null;
      unread_count: number;
      /** Initiales de la menahelet (avatar noir Figma), vide si plusieurs managers. */
      initials: string;
    }
  | {
      kind: "task";
      id: string;
      title: string;
      last_preview: string | null;
      last_at: string | null;
      unread_count: number;
      last_mine: boolean;
      visual_kind: ChatVisualKind;
      chat_status: ChatStatusKind | null;
    };

/** Filtres Figma (Filter Chip) de la liste des chats oved. */
export type EmployeeChatFilter = "all" | "action" | "pending" | "approved";

export function generalChatSummary(managers: DirectChatCard[]): {
  last_preview: string | null;
  last_at: string | null;
  unread_count: number;
} {
  let unread = 0;
  let latest: DirectChatCard | null = null;
  for (const card of managers) {
    unread += card.unread_count || 0;
    if (!latest || (card.last_at || "") > (latest.last_at || "")) {
      latest = card;
    }
  }
  return {
    last_preview: latest?.last_preview ?? null,
    last_at: latest?.last_at ?? null,
    unread_count: unread,
  };
}

/** Nom affiché du chat général : « צ׳אט כללי עם רונית » quand il n'y a qu'une menahelet. */
export function generalChatIdentity(managers: DirectChatCard[]): { title: string; initials: string } {
  const name = managers.length === 1 ? managers[0].counterpart_name?.trim() : "";
  if (!name) return { title: he.employeeGeneralChat, initials: "" };
  return { title: he.employeeGeneralChatWith(name), initials: nameInitials(name) };
}

export function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
  return (parts[0] ?? "").slice(0, 2);
}

/** Chat général épinglé en tête, puis les fils de tâche du plus récent au plus ancien. */
export function buildEmployeeChatRows(
  general: ReturnType<typeof generalChatSummary> & { title?: string; initials?: string },
  tasks: EmployeeTaskChat[],
  today: Date = new Date(),
): EmployeeChatRow[] {
  return [
    {
      kind: "general",
      title: general.title ?? he.employeeGeneralChat,
      initials: general.initials ?? "",
      last_preview: general.last_preview,
      last_at: general.last_at,
      unread_count: general.unread_count,
    },
    ...[...tasks].sort(byLastAtDesc).map((task) => taskRow(task, today)),
  ];
}

function taskRow(task: EmployeeTaskChat, today: Date): EmployeeChatRow {
  return {
    kind: "task",
    id: task.id,
    title: employeeTaskChatTitle(task, today),
    last_preview: task.last_preview,
    last_at: task.last_at,
    unread_count: Math.max(0, task.unread_count ?? 0),
    last_mine: Boolean(task.last_mine),
    visual_kind: task.visual_kind ?? "physical",
    chat_status: task.chat_status ?? null,
  };
}

function byLastAtDesc(a: EmployeeTaskChat, b: EmployeeTaskChat): number {
  return (b.last_at || "").localeCompare(a.last_at || "");
}

/** Titre seul pour la משמרת du jour ; la date n'apparaît que pour un fil d'un autre jour. */
export function employeeTaskChatTitle(
  task: Pick<EmployeeTaskChat, "title" | "due_at" | "last_at">,
  today: Date = new Date(),
): string {
  const ref = task.due_at || task.last_at;
  if (ref && messageDayKey(ref) === formatDateIso(today)) return task.title;
  return taskChatListTitle(task.title, ref);
}

export function taskChatListTitle(title: string, dateIso?: string | null): string {
  const day = dateIso ? messageDayKey(dateIso) : "";
  return day ? `${title} · ${formatChatDayBadge(day)}` : title;
}

/** « לטיפולך » = message non lu ou « צלם שוב ». */
export function chatNeedsAction(row: EmployeeChatRow): boolean {
  if (row.unread_count > 0) return true;
  return row.kind === "task" && row.chat_status === "retake";
}

export function matchesChatFilter(row: EmployeeChatRow, filter: EmployeeChatFilter): boolean {
  if (filter === "all") return true;
  if (filter === "action") return chatNeedsAction(row);
  if (row.kind !== "task") return false;
  if (filter === "pending") return row.chat_status === "pending_review";
  return row.chat_status === "approved";
}

export function matchesChatSearch(
  row: Pick<EmployeeChatRow, "title" | "last_preview">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.title, row.last_preview ?? ""].some((text) => text.toLowerCase().includes(q));
}

export function filterEmployeeChatRows(
  rows: EmployeeChatRow[],
  filter: EmployeeChatFilter,
  query: string,
): EmployeeChatRow[] {
  return rows.filter((row) => matchesChatFilter(row, filter) && matchesChatSearch(row, query));
}
