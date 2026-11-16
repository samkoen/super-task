import { useCallback, useEffect, useMemo, useState } from "react";
import { directChatService, type DirectChatInbox } from "../services/directChatService";
import { employeeSurfaceChatState } from "../utils/employeeDirectChat";
import { scopedInboxUnread } from "../utils/managerChatInbox";
import { useDirectChatLiveSync } from "./useDirectChatLiveSync";

/**
 * Point orange de « שיחות » dans la coque : tous les non-lus pour « כל הרשת » (ou un menahel
 * snif), seulement ceux du snif choisi sinon — la page « שיחות » filtre de la même façon.
 */
export function useManagerChatUnread(branchId: string): number {
  const [inbox, setInbox] = useState<DirectChatInbox | null>(null);
  const load = useCallback(async () => {
    try {
      setInbox(await directChatService.inbox());
    } catch {
      /* ignore poll errors */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());

  return useMemo(() => {
    if (!inbox) return 0;
    // Rôle non transmis exprès : total de toutes les conversations menahel (comportement d'origine).
    return branchId ? scopedInboxUnread(inbox, branchId) : employeeSurfaceChatState(inbox, undefined).unread;
  }, [inbox, branchId]);
}
