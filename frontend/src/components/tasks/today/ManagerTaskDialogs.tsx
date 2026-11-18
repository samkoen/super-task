import type { User } from "../../../services/api";
import type { TaskOccurrence } from "../../../services/taskService";
import type { ManagerTaskActions } from "../../../hooks/useManagerTaskActions";
import { he } from "../../../i18n/he";
import ManagerReviewScreen from "../../review/ManagerReviewScreen";
import ManagerTaskSummaryScreen from "../../review/ManagerTaskSummaryScreen";
import ConfirmDeleteDialog from "../../ui/ConfirmDeleteDialog";
import ManagerTaskEditScreen from "./ManagerTaskEditScreen";

type Props = {
  actions: ManagerTaskActions;
  /** Liste affichée : l'écran reprend la dernière version d'une tâche (marque « הבאה » à jour). */
  tasks: TaskOccurrence[];
  employees?: User[];
  canManage: boolean;
  /** Après une décision, une édition ou une suppression : message éventuel, puis rechargement. */
  onChanged: (message?: string) => void;
};

/** Les écrans ouverts depuis une ligne de tâche : revue, résumé d'une tâche fermée, édition, confirmation. */
export default function ManagerTaskDialogs({ actions, tasks, employees, canManage, onChanged }: Props) {
  const { del } = actions;
  return (
    <>
      <ManagerReviewScreen request={actions.reviewRequest} onClose={actions.closeReview} onDone={(message) => onChanged(message)} />
      <ManagerTaskSummaryScreen taskId={actions.summaryTask?.id ?? null} onClose={actions.closeSummary} onDone={(message) => onChanged(message)} />
      <ManagerTaskEditScreen
        occurrenceId={actions.editId}
        employees={employees}
        listTask={tasks.find((o) => o.id === actions.editId)}
        onClose={actions.closeEdit}
        onSaved={(message) => onChanged(message)}
        onSetManagerNext={canManage ? (t, enabled) => void actions.setManagerNext(t, enabled) : undefined}
        onDelete={canManage ? actions.askDelete : undefined}
      />
      <ConfirmDeleteDialog
        open={Boolean(del.deleting)}
        title={he.managerAdHocDelete}
        itemName={del.deleting?.title}
        message={he.managerAdHocDeleteConfirm}
        optionLabel={del.networkWide ? he.managerFixedTasksDeleteAllBranches : undefined}
        optionChecked={del.allBranches}
        onOptionChange={del.setAllBranches}
        saving={del.saving}
        onCancel={del.cancel}
        onConfirm={() => void del.confirm()}
      />
    </>
  );
}
