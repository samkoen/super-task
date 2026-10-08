import { Box, Button, Chip, Paper, Typography, alpha } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { he } from "../../i18n/he";
import { taskStatusVisual } from "../../constants/taskStatusVisual";
import { formatDueAt } from "../../utils/dateView";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import EmployeeTaskTitle from "../tasks/EmployeeTaskTitle";
import TaskPhotoThumb from "../tasks/TaskPhotoThumb";
import {
  EMPLOYEE_BRAND,
  EMPLOYEE_CARD_RADIUS,
  employeeBigButtonSx,
  employeeCardSx,
} from "../../styles/employeeUi";

interface EmployeeNextTaskCardProps {
  task: EmployeeTaskCard;
  onOpen: (task: EmployeeTaskCard) => void;
}

const STARTED = new Set(["in_progress", "awaiting_response"]);

function isStarted(status: string): boolean {
  return STARTED.has(status);
}

function CardLabel({ task, accent }: { task: EmployeeTaskCard; accent: string }) {
  const overdue = task.status === "overdue";
  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: accent }} />
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: accent }}>
        {he.employeeNextTaskLabel}
      </Typography>
      {overdue ? (
        <Chip size="small" color="error" label={he.alertOverdue} sx={{ fontWeight: 700 }} />
      ) : null}
    </Box>
  );
}

function DueRow({ task }: { task: EmployeeTaskCard }) {
  return (
    <Box display="flex" alignItems="center" gap={0.75} color="text.secondary">
      <AccessTimeIcon fontSize="small" />
      <Typography variant="body1" fontWeight={600} dir="ltr">
        {formatDueAt(task.due_at)}
      </Typography>
    </Box>
  );
}

function ReferencePhoto({ task, accent }: { task: EmployeeTaskCard; accent: string }) {
  if (!task.reference_photo_url) return null;
  return (
    <Box
      sx={{
        borderRadius: "16px",
        overflow: "hidden",
        bgcolor: alpha(accent, 0.06),
      }}
    >
      <TaskPhotoThumb
        photoUrl={task.reference_photo_url}
        title={task.title}
        accent={accent}
        height={170}
      />
    </Box>
  );
}

/** La tâche à faire maintenant : un titre, une heure, un seul gros bouton. */
export default function EmployeeNextTaskCard({ task, onOpen }: EmployeeNextTaskCardProps) {
  const accent = task.status === "overdue" ? taskStatusVisual("overdue").bar : EMPLOYEE_BRAND;
  const started = isStarted(task.status);
  return (
    <Paper
      variant="outlined"
      data-testid="employee-next-task"
      sx={{
        ...employeeCardSx,
        p: { xs: 2, sm: 2.5 },
        mb: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
        borderTop: `6px solid ${accent}`,
        borderRadius: EMPLOYEE_CARD_RADIUS,
      }}
    >
      <CardLabel task={task} accent={accent} />
      <ReferencePhoto task={task} accent={accent} />
      <EmployeeTaskTitle task={task} variant="h6" fontWeight={800} />
      <DueRow task={task} />
      <Button
        type="button"
        fullWidth
        variant="contained"
        color={started ? "success" : "primary"}
        startIcon={<PlayArrowRoundedIcon sx={{ fontSize: "2rem !important" }} />}
        onClick={() => onOpen(task)}
        sx={employeeBigButtonSx}
      >
        {started ? he.employeeNextTaskResume : he.doTask}
      </Button>
    </Paper>
  );
}
