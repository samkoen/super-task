import { useCallback, useEffect, useState } from "react";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { directChatTitle } from "../utils/directChat";
import { managerUnreadDirectChats } from "../utils/managerUnreadChats";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { he } from "../i18n/he";

export function useManagerInboxChats() {
  const [chats, setChats] = useState<DirectChatCard[]>([]);
  const [openChat, setOpenChat] = useState<{ id: string; title: string } | null>(null);
  const [openError, setOpenError] = useState("");

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
    try {
      const opened =
        card.kind === "up"
          ? await directChatService.openMine(card.scope === "network" ? "network" : undefined)
          : await directChatService.openWith(card.counterpart_user_id);
      setOpenError("");
      setOpenChat({ id: opened.conversation.id, title: directChatTitle(card) || he.employeeGeneralChat });
    } catch (error) {
      setOpenError(apiErrorMessage(error, he.errorGeneric));
    }
  }, []);

  return {
    chats,
    openChat,
    openError,
    openCard,
    closeChat: () => {
      setOpenChat(null);
      setOpenError("");
      void load();
    },
    clearOpenError: () => setOpenError(""),
    reload: load,
  };
}
