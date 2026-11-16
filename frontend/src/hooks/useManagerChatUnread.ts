import { useCallback, useEffect, useMemo, useState } from "react";
import { directChatService, type DirectChatCard, type DirectChatInbox } from "../services/directChatService";
import { taskService, type ManagerDayTaskChat } from "../services/taskService";
import { managerChatsUnread } from "../utils/managerChatInbox";
import { useDirectChatLiveSync } from "./useDirectChatLiveSync";
import { useTaskChangeListener } from "./useTaskChangeListener";

type Sources = { directs: DirectChatCard[]; tasks: ManagerDayTaskChat[] };

function cardsOf(inbox: DirectChatInbox): DirectChatCard[] {
  return [...(inbox.up ? [inbox.up] : []), ...(inbox.items ?? [])];
}

/**
 * Point orange de « שיחות » dans la coque : mêmes lignes que la page (directs + fils de tâche du
 * jour), restreintes au snif choisi. Rafraîchi par le temps réel des chats directs et des tâches ;
 * une source en panne garde sa dernière valeur sans éteindre l'autre.
 */
export function useManagerChatUnread(branchId: string): number {
  const [sources, setSources] = useState<Sources>({ directs: [], tasks: [] });
  const load = useCallback(async () => {
    const [inbox, taskChats] = await Promise.allSettled([directChatService.inbox(), taskService.listManagerAllDayChats()]);
    setSources((prev) => ({
      directs: inbox.status === "fulfilled" ? cardsOf(inbox.value) : prev.directs,
      tasks: taskChats.status === "fulfilled" ? taskChats.value.items ?? [] : prev.tasks,
    }));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());
  useTaskChangeListener(() => void load());

  return useMemo(() => managerChatsUnread(sources.directs, sources.tasks, branchId), [sources, branchId]);
}
