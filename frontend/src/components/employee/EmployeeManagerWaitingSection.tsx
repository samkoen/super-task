import { Box, Button, Paper, Typography, alpha } from "@mui/material";
import MarkChatUnreadOutlinedIcon from "@mui/icons-material/MarkChatUnreadOutlined";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import { employeeCardSx, employeeSectionTitleSx } from "../../styles/employeeUi";

interface EmployeeManagerWaitingSectionProps {
  tasks: EmployeeTaskCard[];
  onOpen: (task: EmployeeTaskCard) => void;
}

const AMBER = "#D97706";

/** Rappel persistant : le menahel a écrit et attend encore une action. */
export default function EmployeeManagerWaitingSection({
  tasks,
  onOpen,
}: EmployeeManagerWaitingSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <Box mb={2.5}>
      <Typography component="h2" sx={{ ...employeeSectionTitleSx, color: "warning.dark" }}>
        <MarkChatUnreadOutlinedIcon aria-hidden />
        {`${he.employeeManagerWaiting} (${tasks.length})`}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {tasks.map((task) => (
          <WaitingCard key={task.id} task={task} onOpen={onOpen} />
        ))}
      </Box>
    </Box>
  );
}

function WaitingCard({
  task,
  onOpen,
}: {
  task: EmployeeTaskCard;
  onOpen: (task: EmployeeTaskCard) => void;
}) {
  const preview = task.manager_message_preview?.trim();
  return (
    <Paper
      variant="outlined"
      sx={{
        ...employeeCardSx,
        p: 2,
        borderRadius: "18px",
        borderColor: alpha(AMBER, 0.55),
        borderWidth: 2,
        bgcolor: alpha(AMBER, 0.06),
      }}
    >
      <Typography variant="body1" fontWeight={800} title={task.title}>
        {task.title}
      </Typography>
      {preview ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} title={preview}>
          {preview}
        </Typography>
      ) : null}
      <Button
        fullWidth
        variant="contained"
        color="warning"
        onClick={() => onOpen(task)}
        sx={{ mt: 1.5, minHeight: 52, fontSize: "1.05rem", fontWeight: 800, borderRadius: "14px" }}
      >
        {he.taskChatOpen}
      </Button>
    </Paper>
  );
}
