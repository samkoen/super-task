import type { DirectChatCard, DirectChatInbox } from "../services/directChatService";

/** Chats clali à traiter : non lus, y compris la carte « למעלה ». */
export function managerUnreadDirectChats(inbox: DirectChatInbox | null | undefined): DirectChatCard[] {
  if (!inbox) return [];
  const cards = [...(inbox.items ?? [])];
  if (inbox.up && !cards.some((c) => c.counterpart_user_id === inbox.up?.counterpart_user_id)) {
    cards.push(inbox.up);
  }
  return cards.filter((card) => (card.unread_count ?? 0) > 0);
}

export function emptyManagerMyWork() {
  return {
    urgent_tasks: [],
    in_progress_tasks: [],
    awaiting_response_tasks: [],
    pending_review_tasks: [],
    today_tasks: [],
    completed_tasks: [],
    progress_percent: 0,
  };
}
