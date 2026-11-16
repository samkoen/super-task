import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type User } from "../services/api";
import { branchService, type Branch } from "../services/branchService";
import { taskService, type TaskOccurrence } from "../services/taskService";
import { userService } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import { withSelfAssignee } from "../utils/assigneeOptions";
import type { ManagerTasksFilterValues } from "./useManagerTasksFilters";
import { useTaskChangeListener } from "./useTaskChangeListener";

type Query = Pick<ManagerTasksFilterValues, "day" | "mode" | "from" | "to"> & { branchId: string };

function dateParams(q: Query) {
  return q.mode === "day" ? { due_on: q.day } : { due_from: q.from, due_to: q.to };
}

/** Tâches du périmètre et du jour (ou de la période), plus snifim et oveds pour les filtres. */
export function useManagerTasksList(query: Query) {
  const { user } = useAuth();
  const { showError } = useFeedback();
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { branchId, day, mode, from, to } = query;

  // Seule la dernière demande compte : un changement de filtre pendant un chargement n'est plus perdu.
  const loadSeq = useRef(0);
  const load = useCallback(async (silent = false) => {
    const seq = ++loadSeq.current;
    if (!silent) setLoading(true);
    try {
      // Afficher la liste dès que les occurrences arrivent (ne pas attendre branches/équipe).
      const occ = await taskService.listOccurrences({ branch_id: branchId || undefined, ...dateParams({ branchId, day, mode, from, to }) });
      if (seq !== loadSeq.current) return;
      setOccurrences(occ);
      if (!silent) setLoading(false);
      void Promise.all([branchService.list(), userService.listTeam("employee")])
        .then(([branchList, team]) => { setBranches(branchList); setEmployees(withSelfAssignee(team, user)); })
        .catch(() => { /* filtres incomplets — la liste reste utilisable */ });
    } catch (e) {
      if (seq !== loadSeq.current) return;
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      if (!silent) setLoading(false);
    }
  }, [branchId, day, mode, from, to, showError, user]);

  useEffect(() => { void load(); }, [load]);
  useTaskChangeListener(useCallback(() => { void load(true); }, [load]));
  return { occurrences, branches, employees, loading, load };
}
