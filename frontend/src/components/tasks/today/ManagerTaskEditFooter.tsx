import { Box, ButtonBase, Checkbox, FormControlLabel, Typography } from "@mui/material";
import type { TaskOccurrence } from "../../../services/taskService";
import { he } from "../../../i18n/he";
import { flowColor, flowText } from "../../../styles/flowTokens";
import { isManagerNextTask } from "../../../utils/employeeTaskFocus";

type Props = {
  task: TaskOccurrence;
  onSetManagerNext: (task: TaskOccurrence, enabled: boolean) => void;
  onDelete: (task: TaskOccurrence) => void;
};

/** Ce que la carte de l'ancienne liste proposait : « המשימה הבאה » et la suppression. */
export default function ManagerTaskEditFooter({ task, onSetManagerNext, onDelete }: Props) {
  const open = !["completed", "cancelled"].includes(task.status);
  const canMarkNext = open && Boolean(task.assignee_user_id) && task.status !== "pending_review";
  if (!open) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
      {canMarkNext ? (
        <FormControlLabel
          sx={{ m: 0 }}
          control={<Checkbox size="small" checked={isManagerNextTask(task)} onChange={(e) => onSetManagerNext(task, e.target.checked)} />}
          label={<Typography sx={{ ...flowText.body }}>{he.managerNextTask}</Typography>}
        />
      ) : null}
      <ButtonBase data-testid="task-edit-delete" onClick={() => onDelete(task)} sx={{ ...flowText.button, color: flowColor.rec, py: 1 }}>
        {he.managerTasksDelete}
      </ButtonBase>
    </Box>
  );
}
