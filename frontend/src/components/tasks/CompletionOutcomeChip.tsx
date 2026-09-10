import { Chip } from "@mui/material";
import { he } from "../../i18n/he";
import {
  completionOutcomeLabel,
  isTaskNotCompleted,
} from "../../utils/employeeIncompleteSubmit";
import type { CompletionStatus } from "../../services/taskService";

type CompletionOutcomeChipProps = {
  status?: CompletionStatus | string | null;
};

/** Badge בוצע / לא בוצע pour la revue menahel. */
export default function CompletionOutcomeChip({ status }: CompletionOutcomeChipProps) {
  const notDone = isTaskNotCompleted(status);
  return (
    <Chip
      size="small"
      color={notDone ? "warning" : "success"}
      label={status ? completionOutcomeLabel(status) : he.taskCompleted}
      data-testid={notDone ? "completion-outcome-not-done" : "completion-outcome-done"}
    />
  );
}
