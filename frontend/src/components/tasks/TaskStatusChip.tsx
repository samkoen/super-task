import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import { Box, Chip } from "@mui/material";
import { taskStatusChipColor } from "../../constants/taskStatusVisual";
import { he } from "../../i18n/he";
import type { TaskStatus } from "../../services/taskService";

const STATUS_ICON: Record<TaskStatus, SvgIconComponent> = {
  pending: HourglassEmptyIcon,
  in_progress: PlayCircleOutlineIcon,
  pending_review: RateReviewOutlinedIcon,
  completed: CheckCircleOutlineIcon,
  overdue: WarningAmberOutlinedIcon,
  cancelled: BlockOutlinedIcon,
};

export interface TaskStatusChipProps {
  status: TaskStatus;
}

export default function TaskStatusChip({ status }: TaskStatusChipProps) {
  const Icon = STATUS_ICON[status];
  return (
    <Chip
      label={
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 0.25,
          }}
        >
          <Icon sx={{ fontSize: "1rem", flexShrink: 0 }} />
          <Box component="span">{he.taskStatusLabels[status]}</Box>
        </Box>
      }
      color={taskStatusChipColor(status)}
      size="small"
      data-status-chip=""
      data-testid={`task-status-chip-${status}`}
      sx={{
        height: 28,
        fontSize: "0.8rem",
        fontWeight: 700,
        flexShrink: 0,
        maxWidth: "100%",
        "& .MuiChip-label": {
          display: "flex",
          overflow: "hidden",
          px: 1,
        },
      }}
    />
  );
}
