import { he } from "../i18n/he";
import type { DirectChatCard } from "../services/directChatService";

export function directChatTitle(card: Pick<DirectChatCard, "kind" | "counterpart_name">): string {
  return card.kind === "up" ? he.directChatManagerTitle : card.counterpart_name;
}

export function sortDirectChatCards(items: DirectChatCard[]): DirectChatCard[] {
  return [...items].sort((a, b) => {
    if (Boolean(b.last_at) !== Boolean(a.last_at)) return a.last_at ? -1 : 1;
    return (b.last_at || "").localeCompare(a.last_at || "");
  });
}
