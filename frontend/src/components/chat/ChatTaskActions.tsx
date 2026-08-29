import { Box, Button } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { he } from "../../i18n/he";

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
        sx={{ minHeight: 44, fontWeight: 800 }}
      >
        {he.chatTaskComplete}
      </Button>
      <Button
        variant="outlined"
        startIcon={<EventIcon />}
        disabled={disabled}
        onClick={onRemind}
        sx={{ minHeight: 44, fontWeight: 700 }}
      >
        {he.chatTaskReminder}
      </Button>
    </Box>
  );
}
