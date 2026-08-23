import { Button, CircularProgress } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { canDoTask, doTaskButtonLabel } from "../../utils/employeeDoTask";
import type { TaskStatus } from "../../services/taskService";

interface EmployeeDoTaskButtonProps {
  status: TaskStatus;
  onClick: () => void;
  starting?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium" | "large";
}

/** Bouton unique oved : démarre si besoin puis envoie la clôture. */
export default function EmployeeDoTaskButton({
  status,
  onClick,
  starting = false,
  disabled = false,
  fullWidth = false,
  size = "medium",
}: EmployeeDoTaskButtonProps) {
  if (!canDoTask(status)) return null;
  const finishing = status === "in_progress";
  const icon = starting ? (
    <CircularProgress size={16} color="inherit" />
  ) : finishing ? (
    <TaskAltIcon />
  ) : (
    <PlayArrowIcon />
  );
  return (
    <Button
      fullWidth={fullWidth}
      variant="contained"
      color={finishing ? "success" : "primary"}
      size={size}
      startIcon={icon}
      onClick={onClick}
      disabled={starting || disabled}
    >
      {doTaskButtonLabel(status)}
    </Button>
  );
}
