import { useCallback, useState } from "react";
import { ApiError } from "../services/api";
import { taskService, type TaskOccurrence } from "../services/taskService";
import type { ManagerReviewRequest } from "../components/review/ManagerReviewScreen";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import { defaultApplyAdHocEditToNetwork, isNetworkAdHocOccurrence } from "../utils/adHocNetworkTasks";
import { dashboardTaskUsesReview } from "../utils/dashboardTaskOpen";
import { reviewQueueFromTasks } from "../utils/managerTasksDay";

type Options = {
  /** Menahel reshet / admin : une tâche ponctuelle de toute la reshet peut être supprimée partout. */
  canPickBranch: boolean;
  networkIds: Set<string>;
  reload: (silent?: boolean) => Promise<void> | void;
};

function errorText(e: unknown): string {
  return e instanceof ApiError ? e.message : he.errorGeneric;
}

/** Suppression depuis la fiche d'une tâche : toujours confirmée, option « tous les snifim ». */
function useTaskDelete({ canPickBranch, networkIds, reload }: Options) {
  const { showSuccess, showError } = useFeedback();
  const [deleting, setDeleting] = useState<TaskOccurrence | null>(null);
  const [allBranches, setAllBranches] = useState(false);
  const [saving, setSaving] = useState(false);
  const networkWide = (task: TaskOccurrence | null) => Boolean(task && canPickBranch && isNetworkAdHocOccurrence(task, networkIds));

  const ask = (task: TaskOccurrence) => {
    setDeleting(task);
    setAllBranches(networkWide(task) ? defaultApplyAdHocEditToNetwork(task, canPickBranch, networkIds) : false);
  };
  const confirm = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await taskService.cancel(deleting.id, allBranches);
      showSuccess(he.managerAdHocDeletedNetwork(res.deleted_count ?? 1));
      await reload();
    } catch (e) {
      showError(errorText(e));
    } finally {
      setDeleting(null);
      setSaving(false);
    }
  };
  return { deleting, allBranches, setAllBranches, saving, ask, confirm, cancel: () => setDeleting(null), networkWide: networkWide(deleting) };
}

/**
 * Ouvrir une tâche du menahel (onglet משימות, fiche d'un oved) : preuve à valider → revue plein écran,
 * tâche fermée → son résumé, sinon la fiche d'édition (avec « המשימה הבאה » et suppression).
 */
export function useManagerTaskActions(options: Options) {
  const { showSuccess, showError } = useFeedback();
  const [reviewRequest, setReviewRequest] = useState<ManagerReviewRequest | null>(null);
  const [summaryTask, setSummaryTask] = useState<TaskOccurrence | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const del = useTaskDelete(options);
  const { reload } = options;

  const open = useCallback((task: TaskOccurrence, list: TaskOccurrence[]) => {
    if (task.status === "pending_review") setReviewRequest({ startId: task.id, queue: reviewQueueFromTasks(list) });
    else if (dashboardTaskUsesReview(task.status)) setSummaryTask(task);
    else setEditId(task.id);
  }, []);
  const askDelete = (task: TaskOccurrence) => {
    setEditId(null);
    del.ask(task);
  };
  const setManagerNext = async (task: TaskOccurrence, enabled: boolean) => {
    try {
      const res = await taskService.setManagerNext(task.id, enabled);
      showSuccess(res.message || (enabled ? he.managerNextTaskSet : he.managerNextTaskCleared));
      await reload(true);
    } catch (e) {
      showError(errorText(e));
    }
  };

  return {
    open, reviewRequest, closeReview: () => setReviewRequest(null), summaryTask, closeSummary: () => setSummaryTask(null),
    editId, closeEdit: () => setEditId(null), askDelete, setManagerNext, del,
  };
}

export type ManagerTaskActions = ReturnType<typeof useManagerTaskActions>;
