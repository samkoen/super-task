import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";
import type { EmployeeTaskChat } from "../services/taskService";

export type EmployeeChatRow =
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
      last_preview: string | null;
      last_at: string | null;
    };

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

export function buildEmployeeChatRows(
  general: ReturnType<typeof generalChatSummary>,
  tasks: EmployeeTaskChat[],
): EmployeeChatRow[] {
  return [
    { kind: "general", title: he.employeeGeneralChat, ...general },
    ...tasks.map((task) => ({
      kind: "task" as const,
      id: task.id,
      title: task.title,
      last_preview: task.last_preview,
      last_at: task.last_at,
    })),
  ];
}
