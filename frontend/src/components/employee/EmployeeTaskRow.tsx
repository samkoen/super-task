import { Box, Chip, Paper, Typography, alpha } from "@mui/material";
import TaskPhotoThumb from "../tasks/TaskPhotoThumb";
import { taskStatusVisual } from "../../constants/taskStatusVisual";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { shouldHighlightEmployeeTask } from "../../utils/employeeDashboardSections";
import type { EmployeeTaskCard } from "../../services/dashboardService";

interface EmployeeTaskRowProps {
  task: EmployeeTaskCard;
  onOpen: (task: EmployeeTaskCard) => void;
}

const TILE = 120;

/** Petite tuile photo (comme le dashboard menahel). */
export default function EmployeeTaskRow({ task, onOpen }: EmployeeTaskRowProps) {
  const highlight = shouldHighlightEmployeeTask(task.status);
  const visual = taskStatusVisual(task.status);
  return (
    <Paper
      variant="outlined"
      sx={{
        width: TILE,
        flex: "0 0 auto",
        p: 0,
        overflow: "hidden",
        borderColor: alpha(visual.bar, highlight ? 0.7 : 0.35),
        borderInlineStartWidth: 3,
        borderInlineStartColor: visual.bar,
      }}
    >
      <Box sx={{ height: TILE, bgcolor: alpha(visual.bar, 0.06) }}>
        <TaskPhotoThumb
          photoUrl={task.reference_photo_url}
          title={task.title}
          accent={visual.bar}
          height={TILE}
        />
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(task)}
        aria-label={`${he.openTask}: ${task.title}`}
        sx={{
          p: 0.75,
          width: "100%",
          textAlign: "start",
          border: 0,
          bgcolor: "transparent",
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
          display: "block",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Typography variant="caption" fontWeight={800} display="block" noWrap title={task.title}>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" dir="ltr" noWrap display="block">
          {formatDueAt(task.due_at)}
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          {highlight && task.status === "overdue" ? (
            <Chip
              size="small"
              color="error"
              label={he.alertOverdue}
              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
            />
          ) : (
            <Chip
              size="small"
              label={he.taskStatusLabels[task.status] ?? task.status}
              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
