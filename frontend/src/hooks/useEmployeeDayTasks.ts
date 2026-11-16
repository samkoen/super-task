import { useCallback, useEffect, useRef, useState } from "react";
import { taskService, type TaskOccurrence } from "../services/taskService";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import { apiErrorMessage } from "../utils/apiErrorMessage";
import { todayIso } from "../utils/dateView";
import { filterTasksForEmployee } from "../utils/employeeDrawerTasks";
import { useTaskChangeListener } from "./useTaskChangeListener";

/**
 * Tâches du jour d'un oved, pour sa fiche : celles du snif donné (ou de toute la reshet si vide),
 * filtrées sur lui. Rien n'est chargé tant que la fiche est fermée (`employeeId` vide).
 */
export function useEmployeeDayTasks(employeeId: string, branchId: string, dueOn = todayIso()) {
  const { showError } = useFeedback();
  const [tasks, setTasks] = useState<TaskOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    const mine = ++seq.current;
    if (!employeeId) { setTasks([]); return; }
    if (!silent) setLoading(true);
    try {
      const rows = await taskService.listOccurrences({ branch_id: branchId || undefined, due_on: dueOn });
      if (mine === seq.current) setTasks(filterTasksForEmployee(rows, employeeId));
    } catch (e) {
      if (mine === seq.current) showError(apiErrorMessage(e, he.errorGeneric));
    } finally {
      if (mine === seq.current && !silent) setLoading(false);
    }
  }, [employeeId, branchId, dueOn, showError]);

  useEffect(() => { void load(); }, [load]);
  useTaskChangeListener(useCallback(() => { if (employeeId) void load(true); }, [employeeId, load]));
  return { tasks, loading, reload: load };
}
