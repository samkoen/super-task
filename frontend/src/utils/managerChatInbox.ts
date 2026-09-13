import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import type { ManagerDayTaskChat } from "../services/taskService";

export type ManagerEmployeeRow =
  | {
      kind: "general";
      title: string;
      last_preview: string | null;
      last_at: string | null;
      unread_count: number;
    }
  | {
      kind: "task";
      id: string;
      title: string;
      status: ManagerDayTaskChat["status"];
      last_preview: string | null;
      last_at: string | null;
      unread_count: number;
    };

export function filterManagerContacts(cards: DirectChatCard[], query: string): DirectChatCard[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return cards;
  return cards.filter((card) => {
    const name = (card.kind === "up" ? he.directChatManagerTitle : card.counterpart_name).toLowerCase();
    const branch = (card.branch_name || "").toLowerCase();
    return name.includes(needle) || branch.includes(needle);
  });
}

export function directUnreadOf(card: Pick<DirectChatCard, "direct_unread_count" | "unread_count">): number {
  return card.direct_unread_count ?? card.unread_count ?? 0;
}

export function buildManagerEmployeeRows(
  card: DirectChatCard,
  tasks: ManagerDayTaskChat[],
): ManagerEmployeeRow[] {
  return [
    {
      kind: "general",
      title: he.employeeGeneralChat,
      last_preview: card.last_preview,
      last_at: card.last_at,
      unread_count: directUnreadOf(card),
    },
    ...tasks.map((task) => ({
      kind: "task" as const,
      id: task.id,
      title: task.title,
      status: task.status,
      last_preview: task.last_preview,
      last_at: task.last_at,
      unread_count: task.unread_count || 0,
    })),
  ];
}
