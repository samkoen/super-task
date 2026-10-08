import { Box, Button } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";

const actionSx = {
  flex: "1 1 140px",
  minHeight: EMPLOYEE_TOUCH_MIN,
  borderRadius: "16px",
  fontWeight: 800,
  fontSize: "1.05rem",
} as const;

/** Deux grandes actions du menahel sur une discussion de tâche : clore ou programmer un rappel. */
export default function ChatTaskActions({
  disabled,
  onComplete,
  onRemind,
}: {
  disabled: boolean;
  onComplete: () => void;
  onRemind: () => void;
}) {
  return (
    <Box display="flex" gap={1} flexWrap="wrap">
      <Button
        variant="contained"
        color="success"
        startIcon={<TaskAltIcon />}
        disabled={disabled}
        onClick={onComplete}
        sx={actionSx}
      >
        {he.chatTaskComplete}
      </Button>
      <Button
        variant="outlined"
        startIcon={<EventIcon />}
        disabled={disabled}
        onClick={onRemind}
        sx={{ ...actionSx, color: EMPLOYEE_BRAND, borderColor: EMPLOYEE_BRAND, borderWidth: 2 }}
      >
        {he.chatTaskReminder}
      </Button>
    </Box>
  );
}
