import { he } from "../i18n/he";
import { formatDateIso, shiftDay } from "./dateView";
import type { ChatMessageView } from "./chatMessageView";

export type ChatDayItem = { kind: "day"; day: string; label: string };
export type ChatMessageItem = { kind: "message"; message: ChatMessageView };
export type ChatThreadItem = ChatDayItem | ChatMessageItem;

export function messageDayKey(iso: string): string {
  if (!iso.trim()) return "";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  return formatDateIso(value);
}

export function formatChatDayBadge(dayIso: string): string {
  const value = new Date(`${dayIso}T12:00:00`);
  if (Number.isNaN(value.getTime())) return dayIso;
  return value.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function chatDayLabel(dayIso: string, now = new Date()): string {
  if (!dayIso) return "";
  const today = formatDateIso(now);
  if (dayIso === today) return he.chatDayToday;
  if (dayIso === shiftDay(today, -1)) return he.chatDayYesterday;
  return formatChatDayBadge(dayIso);
}

export function chatThreadItems(
  messages: ChatMessageView[],
  now = new Date(),
): ChatThreadItem[] {
  const items: ChatThreadItem[] = [];
  let lastDay = "";
  for (const message of messages) {
    const day = messageDayKey(message.created_at);
    if (day && day !== lastDay) {
      items.push({ kind: "day", day, label: chatDayLabel(day, now) });
      lastDay = day;
    }
    items.push({ kind: "message", message });
  }
  return items;
}
