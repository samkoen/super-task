import { Box, Button, Paper, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";

interface EmployeeManagerWaitingSectionProps {
  tasks: EmployeeTaskCard[];
  onOpen: (task: EmployeeTaskCard) => void;
}

/** Rappel persistant : le menahel a écrit et attend encore une action. */
export default function EmployeeManagerWaitingSection({
  tasks,
  onOpen,
}: EmployeeManagerWaitingSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <Box mb={2}>
      <Typography variant="subtitle2" fontWeight={800} color="warning.dark" mb={0.75}>
        {he.employeeManagerWaiting} ({tasks.length})
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
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
    <Paper variant="outlined" sx={{ p: 1.25, borderColor: "warning.main", borderWidth: 2 }}>
      <Typography variant="body2" fontWeight={800} noWrap title={task.title}>
        {task.title}
      </Typography>
      {preview ? (
        <Typography variant="caption" color="text.secondary" display="block" noWrap title={preview}>
          {preview}
        </Typography>
      ) : null}
      <Button size="small" variant="contained" color="warning" onClick={() => onOpen(task)} sx={{ mt: 0.75 }}>
        {he.taskChatOpen}
      </Button>
    </Paper>
  );
}
