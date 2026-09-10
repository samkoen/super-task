import { useCallback, useEffect, useState } from "react";
import { directChatService } from "../services/directChatService";
import { employeeSurfaceChatState } from "../utils/employeeDirectChat";
import { useDirectChatLiveSync } from "./useDirectChatLiveSync";

export function useEmployeeChatUnread(enabled: boolean, role?: string): number {
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await directChatService.inbox();
      setUnread(employeeSurfaceChatState(data, role).unread);
    } catch {
      /* ignore poll errors */
    }
  }, [enabled, role]);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());
  return unread;
}
