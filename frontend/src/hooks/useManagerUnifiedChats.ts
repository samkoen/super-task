import { useCallback, useEffect, useMemo, useState } from "react";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { taskService } from "../services/taskService";
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

/** Les fils de tâche de chaque oved, chargés en parallèle ; un échec isolé ne vide pas la boîte. */
async function loadTaskChats(directs: DirectChatCard[]): Promise<ManagerEmployeeTaskChats[]> {
  const ovdim = directs.filter((card) => card.kind === "down");
  return Promise.all(
    ovdim.map(async (card) => {
      try {
        const { items } = await taskService.listManagerDayChats(card.counterpart_user_id);
        return { card, tasks: items };
      } catch {
        return { card, tasks: [] };
      }
    }),
  );
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
      const inbox = await directChatService.inbox();
      const people = mergeDirects(inbox.items ?? [], inbox.up);
      setDirects(people);
      setTaskChats(await loadTaskChats(people));
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
