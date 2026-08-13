import { Box, Button, Chip, Paper, Typography, alpha } from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import type { TaskQueues } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { formatTime } from "../../utils/dashboardTime";
import {
  buildActionQueue,
  buildPendingReviewQueue,
  buildQuestionsQueue,
  type ActionQueueItem,
} from "../../utils/dashboardCarousels";
import DashboardCarousel from "./DashboardCarousel";

const BORDER: Record<ActionQueueItem["reason"], string> = {
  awaiting_response: "#c62828",
  pending_review: "#1565c0",
};

export type ActionCarouselMode = "all" | "questions" | "reviews";

interface ActionRequiredCarouselProps {
  queues: TaskQueues | null | undefined;
  mode?: ActionCarouselMode;
  title?: string;
  emptyLabel?: string;
  onReviewTask?: (taskId: string) => void;
  onOpenChat?: (taskId: string) => void;
}

function itemsForMode(queues: TaskQueues | null | undefined, mode: ActionCarouselMode) {
  if (mode === "questions") return buildQuestionsQueue(queues);
  if (mode === "reviews") return buildPendingReviewQueue(queues);
  return buildActionQueue(queues);
}

export default function ActionRequiredCarousel({
  queues,
  mode = "all",
  title,
  emptyLabel,
  onReviewTask,
  onOpenChat,
}: ActionRequiredCarouselProps) {
  const items = itemsForMode(queues, mode);
  const resolvedTitle =
    title ??
    (mode === "questions"
      ? he.dashboardQuestionsRow
      : mode === "reviews"
        ? he.dashboardReviewRow
        : he.dashboardActionQueue);
  const resolvedEmpty =
    emptyLabel ??
    (mode === "questions"
      ? he.dashboardQuestionsRowEmpty
      : mode === "reviews"
        ? he.dashboardReviewRowEmpty
        : he.dashboardActionQueueEmpty);

  return (
    <DashboardCarousel title={resolvedTitle} count={items.length} emptyLabel={resolvedEmpty}>
      {items.map(({ task, reason }) => {
        const border = BORDER[reason];
        return (
          <Paper
            key={task.id}
            variant="outlined"
            sx={{
              minWidth: 110,
              maxWidth: 130,
              width: 120,
              flex: "0 0 auto",
              p: 0.75,
              scrollSnapAlign: "start",
              borderWidth: 2,
              borderColor: border,
              bgcolor: alpha(border, 0.04),
            }}
          >
            <Box display="flex" gap={0.5} flexWrap="wrap" mb={0.5}>
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
                  height: 20,
                  "& .MuiChip-label": { px: 0.75, fontSize: 11 },
                }}
              />
            </Box>
            <Typography variant="caption" fontWeight={800} display="block" noWrap title={task.title}>
              {reason === "awaiting_response"
                ? he.dashboardQuestionCard(task.assignee_name || task.title)
                : task.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75} noWrap>
              {[
                reason === "awaiting_response" ? task.title : task.assignee_name,
                task.department_name,
                task.completed_at ? formatTime(task.completed_at) : formatDueAt(task.due_at),
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
                sx={{
                  bgcolor: border,
                  "&:hover": { bgcolor: border },
                  minWidth: 0,
                  px: 0.75,
                  py: 0.15,
                  fontSize: 11,
                  "& .MuiButton-startIcon": { marginInlineEnd: 4 },
                }}
              >
                {he.taskReviewAction}
              </Button>
            )}
            {reason === "awaiting_response" && (onOpenChat || onReviewTask) && (
              <Button
                size="small"
                variant="contained"
                onClick={() => (onOpenChat ?? onReviewTask)?.(task.id)}
                sx={{
                  bgcolor: border,
                  "&:hover": { bgcolor: border },
                  minWidth: 0,
                  px: 0.75,
                  py: 0.15,
                  fontSize: 11,
                }}
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
