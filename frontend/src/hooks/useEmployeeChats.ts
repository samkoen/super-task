import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import {
  taskService,
  type EmployeeStartableChat,
  type EmployeeTaskChat,
} from "../services/taskService";
import { useFeedback } from "../context/FeedbackContext";
import { useAuth } from "../context/AuthContext";
import { he } from "../i18n/he";
import { employeeSurfaceChatState } from "../utils/employeeDirectChat";
import { useDirectChatLiveSync } from "./useDirectChatLiveSync";
import { useTaskChangeListener } from "./useTaskChangeListener";

/** Données de l'écran « צ׳אטים » oved : managers, fils de la משמרת, Sheet et archive. */
export function useEmployeeChats() {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const [managers, setManagers] = useState<DirectChatCard[]>([]);
  const [tasks, setTasks] = useState<EmployeeTaskChat[]>([]);
  const [startable, setStartable] = useState<EmployeeStartableChat[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [archive, setArchive] = useState<EmployeeTaskChat[] | null>(null);
  const [loading, setLoading] = useState(true);

  const reportError = useCallback(
    (e: unknown) => showError(e instanceof ApiError ? e.message : he.errorGeneric),
    [showError],
  );

  const reload = useCallback(async () => {
    try {
      const [inbox, chats] = await Promise.all([directChatService.inbox(), taskService.listEmployeeChats()]);
      setManagers(employeeSurfaceChatState(inbox, user?.role).managers);
      setTasks(chats.items);
      setStartable(chats.startable ?? []);
      setArchivedCount(chats.archived_count ?? 0);
    } catch (e) {
      reportError(e);
    } finally {
      setLoading(false);
    }
  }, [reportError, user?.role]);

  const loadArchive = useCallback(async () => {
    try {
      setArchive((await taskService.listEmployeeChatArchive()).items);
    } catch (e) {
      reportError(e);
      setArchive([]);
    }
  }, [reportError]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useDirectChatLiveSync(null, () => void reload());
  useTaskChangeListener(() => void reload());

  return { managers, tasks, startable, archivedCount, archive, loading, reload, loadArchive };
}
