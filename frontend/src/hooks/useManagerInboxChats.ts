import { useCallback, useEffect, useState } from "react";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { directChatTitle } from "../utils/directChat";
import { managerUnreadDirectChats } from "../utils/managerUnreadChats";
import { he } from "../i18n/he";

export function useManagerInboxChats() {
  const [chats, setChats] = useState<DirectChatCard[]>([]);
  const [openChat, setOpenChat] = useState<{ id: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const inbox = await directChatService.inbox();
      setChats(managerUnreadDirectChats(inbox));
    } catch {
      setChats([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCard = useCallback(async (card: DirectChatCard) => {
    const opened =
      card.kind === "up"
        ? await directChatService.openMine(card.scope === "network" ? "network" : undefined)
        : await directChatService.openWith(card.counterpart_user_id);
    setOpenChat({ id: opened.conversation.id, title: directChatTitle(card) || he.employeeGeneralChat });
  }, []);

  return {
    chats,
    openChat,
    openCard,
    closeChat: () => {
      setOpenChat(null);
      void load();
    },
    reload: load,
  };
}
