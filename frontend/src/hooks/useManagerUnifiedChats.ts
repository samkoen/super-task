import { useCallback, useEffect, useMemo, useState } from "react";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { taskService, type ManagerDayTaskChat } from "../services/taskService";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { he } from "../i18n/he";
import {
  buildManagerInboxEntries,
  sortManagerInbox,
  type ManagerEmployeeTaskChats,
} from "../utils/managerChatInbox";
import { useDirectChatLiveSync } from "./useDirectChatLiveSync";
import { useTaskChangeListener } from "./useTaskChangeListener";

/** Ajoute la carte « למעלה » (mon manager) en tête si elle n'est pas déjà dans les contacts. */
function mergeDirects(items: DirectChatCard[], up: DirectChatCard | null): DirectChatCard[] {
  if (up && !items.some((c) => c.counterpart_user_id === up.counterpart_user_id)) {
    return [up, ...items];
  }
  return items;
}

/**
 * Carte d'appoint pour un oved absent de la boîte directe (aucune conversation, hors liste) :
 * elle sert seulement à nommer ses fils de tâche, elle ne crée pas de ligne directe.
 */
function ovedCardFromTask(task: ManagerDayTaskChat, ovedId: string): DirectChatCard {
  return {
    id: null,
    kind: "down",
    counterpart_user_id: ovedId,
    counterpart_name: task.assignee_name || "",
    counterpart_role: "employee",
    branch_id: task.branch_id ?? null,
    branch_name: null,
    last_preview: null,
    last_at: null,
    unread_count: 0,
  };
}

/**
 * Rattache chaque fil de tâche à son oved : la carte de la boîte directe s'il y en a une, sinon
 * une carte d'appoint, pour qu'aucun message d'oved ne disparaisse de « שיחות ».
 */
export function groupTaskChatsByOved(
  directs: DirectChatCard[],
  tasks: ManagerDayTaskChat[],
): ManagerEmployeeTaskChats[] {
  const groups = new Map<string, ManagerEmployeeTaskChats>();
  for (const card of directs) {
    if (card.kind === "down") groups.set(card.counterpart_user_id, { card, tasks: [] });
  }
  for (const task of tasks) {
    const ovedId = task.assignee_user_id;
    if (!ovedId) continue;
    if (!groups.has(ovedId)) groups.set(ovedId, { card: ovedCardFromTask(task, ovedId), tasks: [] });
    groups.get(ovedId)!.tasks.push(task);
  }
  return [...groups.values()];
}

/** Un seul appel pour tous les oveds ; s'il échoue, la boîte reste utilisable avec les directs. */
async function fetchAllTaskChats(): Promise<ManagerDayTaskChat[]> {
  try {
    const { items } = await taskService.listManagerAllDayChats();
    return items ?? [];
  } catch {
    return [];
  }
}

/**
 * Boîte unifiée du menahel (étape 7) : directs + fils de tâche dans une seule liste, rechargée
 * sur chaque événement temps réel (SSE direct et changement de tâche).
 */
export function useManagerUnifiedChats(onError: (message: string) => void) {
  const [directs, setDirects] = useState<DirectChatCard[]>([]);
  const [taskChats, setTaskChats] = useState<ManagerEmployeeTaskChats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [inbox, tasks] = await Promise.all([directChatService.inbox(), fetchAllTaskChats()]);
      const people = mergeDirects(inbox.items ?? [], inbox.up);
      setDirects(people);
      setTaskChats(groupTaskChatsByOved(people, tasks));
    } catch (error) {
      onError(apiErrorMessage(error, he.errorGeneric));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());
  useTaskChangeListener(() => void load());

  const entries = useMemo(
    () => sortManagerInbox(buildManagerInboxEntries(directs, taskChats)),
    [directs, taskChats],
  );
  return { entries, loading, reload: load };
}
