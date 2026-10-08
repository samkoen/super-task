import { Button, CircularProgress } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { canDoTask, doTaskButtonLabel } from "../../utils/employeeDoTask";
import type { TaskStatus } from "../../services/taskService";
import { employeeBigButtonSx } from "../../styles/employeeUi";

interface EmployeeDoTaskButtonProps {
  status: TaskStatus;
  onClick: () => void;
  starting?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium" | "large";
  /** Gros bouton pleine largeur, pensé pour un pouce pressé. */
  prominent?: boolean;
}

/** Bouton unique oved : démarre si besoin puis envoie la clôture. */
export default function EmployeeDoTaskButton({
  status,
  onClick,
  starting = false,
  disabled = false,
  fullWidth = false,
  size = "medium",
  prominent = false,
}: EmployeeDoTaskButtonProps) {
  if (!canDoTask(status)) return null;
  const finishing = status === "in_progress" || status === "awaiting_response";
  const icon = starting ? (
    <CircularProgress size={16} color="inherit" />
  ) : finishing ? (
    <TaskAltIcon />
  ) : (
    <PlayArrowIcon />
  );
  return (
    <Button
      type="button"
      fullWidth={fullWidth || prominent}
      variant="contained"
      color={finishing ? "success" : "primary"}
      size={size}
      sx={prominent ? employeeBigButtonSx : undefined}
      startIcon={icon}
      onClick={onClick}
      disabled={starting || disabled}
    >
      {doTaskButtonLabel(status)}
    </Button>
  );
}
