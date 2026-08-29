import { Box, Chip, Paper, Typography, alpha } from "@mui/material";
import type { TimelineTask } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { isPendingFollowUpTask } from "../../utils/chatTaskFollowUp";
import TaskPhotoThumb from "../tasks/TaskPhotoThumb";

function statusAccent(status: string): string {
  if (status === "overdue") return "#d32f2f";
  if (status === "in_progress") return "#ed6c02";
  return "#757575";
}

interface PendingTaskMediaCardProps {
  task: TimelineTask;
  onOpen?: (task: TimelineTask) => void;
}

/** Carte carrousel : moitié photo (zoom) + infos ; clic infos → ouvrir/éditer. */
export default function PendingTaskMediaCard({ task, onOpen }: PendingTaskMediaCardProps) {
  const border = statusAccent(task.status);
  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: 120,
        maxWidth: 130,
        width: 120,
        flex: "0 0 auto",
        p: 0,
        overflow: "hidden",
        scrollSnapAlign: "start",
        borderColor: alpha(border, 0.45),
        borderInlineStartWidth: 3,
        borderInlineStartColor: border,
      }}
    >
      <Box
        sx={{
          height: 60,
          bgcolor: alpha(border, 0.06),
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <TaskPhotoThumb
          photoUrl={task.reference_photo_url}
          title={task.title}
          accent={border}
          height={60}
        />
      </Box>
      <Box
        component={onOpen ? "button" : "div"}
        type={onOpen ? "button" : undefined}
        onClick={onOpen ? () => onOpen(task) : undefined}
        aria-label={onOpen ? `${he.openTask}: ${task.title}` : undefined}
        sx={{
          p: 0.75,
          width: "100%",
          textAlign: "start",
          border: 0,
          bgcolor: "transparent",
          cursor: onOpen ? "pointer" : "default",
          font: "inherit",
          color: "inherit",
          display: "block",
          "&:hover": onOpen ? { bgcolor: "action.hover" } : undefined,
        }}
      >
        <Typography variant="caption" fontWeight={800} display="block" noWrap title={task.title}>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {[task.assignee_name, task.department_name].filter(Boolean).join(" · ") || "—"}
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
          <Chip
            size="small"
            label={`${he.dashboardDueAt} ${formatDueAt(task.due_at)}`}
            variant="outlined"
            sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
          />
          {task.status === "overdue" && (
            <Chip
              size="small"
              color="error"
              label={he.timelineSegmentOverdue}
              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
            />
          )}
          {isPendingFollowUpTask(task) && (
            <Chip
              size="small"
              color="info"
              label={he.chatTaskFollowUpChip(formatDueAt(task.chat_follow_up_at!))}
              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
            />
          )}
          {task.status === "in_progress" && (
            <Chip
              size="small"
              color="warning"
              label={he.timelineSegmentInProgress}
              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
