import type { ElementType, ReactNode } from "react";
import { Box, Chip, Paper, Typography, alpha } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import TaskPhotoThumb from "../tasks/TaskPhotoThumb";
import { taskSquareClickProps } from "../tasks/taskSquareClick";
import { taskStatusChipColor, taskStatusVisual } from "../../constants/taskStatusVisual";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { shouldHighlightEmployeeTask } from "../../utils/employeeDashboardSections";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import type { TaskStatus } from "../../services/taskService";
import { employeeCardSx } from "../../styles/employeeUi";

export type EmployeeTaskRowLayout = "tile" | "list";

interface EmployeeTaskRowProps {
  task: EmployeeTaskCard;
  onOpen: (task: EmployeeTaskCard) => void;
  layout?: EmployeeTaskRowLayout;
}

const PHOTO = 88;
const chipLabelSx = { height: 26, "& .MuiChip-label": { px: 1, fontSize: 12.5, fontWeight: 700 } };

const STATUS_ICON: Partial<Record<TaskStatus, ElementType>> = {
  pending: ScheduleIcon,
  in_progress: PlayCircleOutlineIcon,
  awaiting_response: ChatBubbleOutlineIcon,
  pending_review: HourglassTopIcon,
  completed: CheckCircleOutlineIcon,
  overdue: ErrorOutlineIcon,
};

/** Carte photo (מזדמנות) ou ligne sans image (קבועות). */
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
  const color = taskStatusChipColor(status);
  return (
    <Chip
      size="small"
      color={color === "default" ? undefined : color}
      label={he.taskStatusLabels[status] ?? status}
      sx={chipLabelSx}
    />
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const visual = taskStatusVisual(status);
  const Icon = STATUS_ICON[status] ?? ScheduleIcon;
  return (
    <Box
      aria-hidden
      sx={{
        width: 46,
        height: 46,
        flexShrink: 0,
        borderRadius: "14px",
        display: "grid",
        placeItems: "center",
        color: visual.bar,
        bgcolor: alpha(visual.bar, 0.12),
      }}
    >
      <Icon sx={{ fontSize: 26 }} />
    </Box>
  );
}

function cardSx(task: EmployeeTaskCard) {
  const visual = taskStatusVisual(task.status);
  const highlight = shouldHighlightEmployeeTask(task.status);
  return {
    ...employeeCardSx,
    width: "100%",
    overflow: "hidden",
    borderRadius: "18px",
    borderInlineStart: `6px solid ${visual.bar}`,
    ...(highlight ? { borderColor: alpha(visual.bar, 0.5), bgcolor: alpha(visual.bar, 0.03) } : {}),
    transition: "box-shadow 0.15s, transform 0.12s",
    "&:active": { transform: "scale(0.99)" },
  } as const;
}

function TaskTexts({ task }: { task: EmployeeTaskCard }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, textAlign: "start" }}>
      <Typography
        variant="body1"
        fontWeight={800}
        title={task.title}
        sx={{
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {task.title}
      </Typography>
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
        <Typography variant="body2" color="text.secondary" dir="ltr" fontWeight={600}>
          {formatDueAt(task.due_at)}
        </Typography>
        <StatusChip status={task.status} />
      </Box>
    </Box>
  );
}

function EmployeeTaskTile({ task, onOpen }: Omit<EmployeeTaskRowProps, "layout">) {
  const visual = taskStatusVisual(task.status);
  return (
    <Paper
      variant="outlined"
      {...taskSquareClickProps(`${he.openTask}: ${task.title}`, () => onOpen(task))}
      sx={{
        ...cardSx(task),
        p: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box
        sx={{
          width: PHOTO,
          height: PHOTO,
          flexShrink: 0,
          borderRadius: "14px",
          overflow: "hidden",
          bgcolor: alpha(visual.bar, 0.08),
        }}
      >
        <TaskPhotoThumb
          photoUrl={task.reference_photo_url}
          title={task.title}
          accent={visual.bar}
          height={PHOTO}
        />
      </Box>
      <TaskTexts task={task} />
      <ChevronLeftIcon sx={{ color: "text.disabled", flexShrink: 0 }} />
    </Paper>
  );
}

function EmployeeTaskListRow({ task, onOpen }: Omit<EmployeeTaskRowProps, "layout">) {
  return (
    <Paper variant="outlined" sx={cardSx(task)}>
      <OpenTaskButton
        task={task}
        onOpen={onOpen}
        sx={{
          px: 1.5,
          py: 1.5,
          minHeight: 76,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <StatusBadge status={task.status} />
        <TaskTexts task={task} />
        <ChevronLeftIcon sx={{ color: "text.disabled", flexShrink: 0 }} />
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
