import type { User } from "../../../services/api";
import type { TaskOccurrence } from "../../../services/taskService";
import type { ManagerTaskActions } from "../../../hooks/useManagerTaskActions";
import { he } from "../../../i18n/he";
import ManagerReviewScreen from "../../review/ManagerReviewScreen";
import ConfirmDeleteDialog from "../../ui/ConfirmDeleteDialog";
import TaskCompletionReviewDialog from "../TaskCompletionReviewDialog";
import TaskOccurrenceEditDialog from "../TaskOccurrenceEditDialog";
import ManagerTaskEditFooter from "./ManagerTaskEditFooter";

type Props = {
  actions: ManagerTaskActions;
  /** Liste affichée : la fiche reprend la dernière version d'une tâche (marque « הבאה » à jour). */
  tasks: TaskOccurrence[];
  employees?: User[];
  canManage: boolean;
  /** Après une décision, une édition ou une suppression : message éventuel, puis rechargement. */
  onChanged: (message?: string) => void;
};

/** Les fenêtres ouvertes depuis une ligne de tâche : revue plein écran, résumé, fiche, confirmation. */
export default function ManagerTaskDialogs({ actions, tasks, employees, canManage, onChanged }: Props) {
  const { del } = actions;
  return (
    <>
      <ManagerReviewScreen request={actions.reviewRequest} onClose={actions.closeReview} onDone={(message) => onChanged(message)} />
      <TaskCompletionReviewDialog task={actions.summaryTask} onClose={actions.closeSummary} onDone={(message) => onChanged(message)} />
      <TaskOccurrenceEditDialog
        occurrenceId={actions.editId}
        employees={employees}
        onClose={actions.closeEdit}
        onSaved={() => onChanged()}
        footer={canManage ? (task) => (
          <ManagerTaskEditFooter
            task={tasks.find((o) => o.id === task.id) ?? task}
            onSetManagerNext={(t, enabled) => void actions.setManagerNext(t, enabled)}
            onDelete={actions.askDelete}
          />
        ) : undefined}
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
