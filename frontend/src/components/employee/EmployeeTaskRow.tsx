import { Box, Chip, Paper, Typography, alpha } from "@mui/material";
import type { ReactNode } from "react";
import TaskPhotoThumb from "../tasks/TaskPhotoThumb";
import { taskStatusVisual } from "../../constants/taskStatusVisual";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { shouldHighlightEmployeeTask } from "../../utils/employeeDashboardSections";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import type { TaskStatus } from "../../services/taskService";

export type EmployeeTaskRowLayout = "tile" | "list";

interface EmployeeTaskRowProps {
  task: EmployeeTaskCard;
  onOpen: (task: EmployeeTaskCard) => void;
  layout?: EmployeeTaskRowLayout;
}

const TILE = 120;
const chipLabelSx = { height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } };

/** Tuile photo (מזדמנות) ou ligne sans image (קבועות). */
export default function EmployeeTaskRow({
  task,
  onOpen,
  layout = "tile",
}: EmployeeTaskRowProps) {
  if (layout === "list") {
    return <EmployeeTaskListRow task={task} onOpen={onOpen} />;
  }
  return <EmployeeTaskTile task={task} onOpen={onOpen} />;
}

function StatusChip({ status }: { status: TaskStatus }) {
  if (shouldHighlightEmployeeTask(status) && status === "overdue") {
    return <Chip size="small" color="error" label={he.alertOverdue} sx={chipLabelSx} />;
  }
  return (
    <Chip
      size="small"
      label={he.taskStatusLabels[status] ?? status}
      sx={chipLabelSx}
    />
  );
}

function EmployeeTaskTile({
  task,
  onOpen,
}: Omit<EmployeeTaskRowProps, "layout">) {
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
      <OpenTaskButton task={task} onOpen={onOpen} sx={{ p: 0.75 }}>
        <Typography variant="caption" fontWeight={800} display="block" noWrap title={task.title}>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" dir="ltr" noWrap display="block">
          {formatDueAt(task.due_at)}
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          <StatusChip status={task.status} />
        </Box>
      </OpenTaskButton>
    </Paper>
  );
}

function EmployeeTaskListRow({
  task,
  onOpen,
}: Omit<EmployeeTaskRowProps, "layout">) {
  const highlight = shouldHighlightEmployeeTask(task.status);
  const visual = taskStatusVisual(task.status);
  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        overflow: "hidden",
        borderColor: alpha(visual.bar, highlight ? 0.7 : 0.35),
        borderInlineStartWidth: 3,
        borderInlineStartColor: visual.bar,
      }}
    >
      <OpenTaskButton
        task={task}
        onOpen={onOpen}
        sx={{
          px: 1.25,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} noWrap title={task.title}>
            {task.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" dir="ltr" noWrap display="block">
            {formatDueAt(task.due_at)}
          </Typography>
        </Box>
        <StatusChip status={task.status} />
      </OpenTaskButton>
    </Paper>
  );
}

function OpenTaskButton({
  task,
  onOpen,
  sx,
  children,
}: {
  task: EmployeeTaskCard;
  onOpen: (task: EmployeeTaskCard) => void;
  sx: object;
  children: ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(task)}
      aria-label={`${he.openTask}: ${task.title}`}
      sx={{
        width: "100%",
        textAlign: "start",
        border: 0,
        bgcolor: "transparent",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        "&:hover": { bgcolor: "action.hover" },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
