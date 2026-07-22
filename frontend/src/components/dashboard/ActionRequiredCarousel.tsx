import { Box, Button, Chip, Paper, Typography, alpha } from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import type { TaskQueues } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { formatTime } from "../../utils/dashboardTime";
import { buildActionQueue, type ActionQueueItem } from "../../utils/dashboardCarousels";
import DashboardCarousel from "./DashboardCarousel";

const BORDER: Record<ActionQueueItem["reason"], string> = {
  awaiting_response: "#e65100",
  pending_review: "#1565c0",
};

interface ActionRequiredCarouselProps {
  queues: TaskQueues | null | undefined;
  onReviewTask?: (taskId: string) => void;
  onOpenChat?: (taskId: string) => void;
}

export default function ActionRequiredCarousel({
  queues,
  onReviewTask,
  onOpenChat,
}: ActionRequiredCarouselProps) {
  const items = buildActionQueue(queues);

  return (
    <DashboardCarousel
      title={he.dashboardActionQueue}
      count={items.length}
      emptyLabel={he.dashboardActionQueueEmpty}
    >
      {items.map(({ task, reason }) => {
        const border = BORDER[reason];
        return (
          <Paper
            key={task.id}
            variant="outlined"
            sx={{
              minWidth: 260,
              maxWidth: 280,
              flex: "0 0 auto",
              p: 2,
              scrollSnapAlign: "start",
              borderWidth: 2,
              borderColor: border,
              bgcolor: alpha(border, 0.04),
            }}
          >
            <Box display="flex" gap={0.75} flexWrap="wrap" mb={1}>
              <Chip
                size="small"
                label={
                  reason === "awaiting_response"
                    ? he.dashboardActionAwaitingResponse
                    : he.dashboardQueuePendingReview
                }
                sx={{
                  bgcolor: alpha(border, 0.12),
                  color: border,
                  fontWeight: 700,
                }}
              />
            </Box>
            <Typography fontWeight={800} mb={0.5} noWrap title={task.title}>
              {task.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              {[
                task.assignee_name,
                task.department_name,
                task.completed_at
                  ? formatTime(task.completed_at)
                  : formatDueAt(task.due_at),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
            {reason === "pending_review" && onReviewTask && (
              <Button
                size="small"
                variant="contained"
                startIcon={<RateReviewIcon />}
                onClick={() => onReviewTask(task.id)}
                sx={{ bgcolor: border, "&:hover": { bgcolor: border } }}
              >
                {he.taskReviewAction}
              </Button>
            )}
            {reason === "awaiting_response" && (onOpenChat || onReviewTask) && (
              <Button
                size="small"
                variant="contained"
                onClick={() => (onOpenChat ?? onReviewTask)?.(task.id)}
                sx={{ bgcolor: border, "&:hover": { bgcolor: border } }}
              >
                {he.taskChatOpen}
              </Button>
            )}
          </Paper>
        );
      })}
    </DashboardCarousel>
  );
}
