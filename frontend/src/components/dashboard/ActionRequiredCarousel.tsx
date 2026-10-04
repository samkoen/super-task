import { Box, Button, Chip, Typography, alpha } from "@mui/material";
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
  embedded?: boolean;
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
  embedded = false,
}: ActionRequiredCarouselProps) {
  const items = itemsForMode(queues, mode);
  const cards = items.map((item) => (
    <ActionQueueCard key={item.task.id} item={item} onReviewTask={onReviewTask} onOpenChat={onOpenChat} />
  ));
  if (embedded) return cards.length ? <>{cards}</> : null;
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
    <DashboardCarousel
      title={resolvedTitle}
      count={items.length}
      emptyLabel={resolvedEmpty}
      showHeading={!embedded}
    >
      {cards}
    </DashboardCarousel>
  );
}

function reviewSquareOpen(
  reason: ActionQueueItem["reason"],
  taskId: string,
  onReviewTask?: (taskId: string) => void,
) {
  if (reason !== "pending_review" || !onReviewTask) return null;
  return () => onReviewTask(taskId);
}

function ActionQueueCard({
  item,
  onReviewTask,
  onOpenChat,
}: {
  item: ActionQueueItem;
  onReviewTask?: (taskId: string) => void;
  onOpenChat?: (taskId: string) => void;
}) {
  const { task, reason } = item;
  const border = BORDER[reason];
  const openReview = reviewSquareOpen(reason, task.id, onReviewTask);
  return (
    <Box
      {...(openReview ? reviewSquareButton(task.title, openReview) : {})}
      sx={{
        minWidth: 110,
        maxWidth: 130,
        width: 120,
        flex: "0 0 auto",
        p: 0.75,
        scrollSnapAlign: "start",
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: border,
        borderRadius: 1,
        bgcolor: alpha(border, 0.04),
        cursor: openReview ? "pointer" : undefined,
        textAlign: "start",
        font: "inherit",
        color: "inherit",
        "&:hover": openReview ? { bgcolor: alpha(border, 0.1) } : undefined,
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
            {openReview && (
              <Typography variant="caption" fontWeight={800} sx={{ color: border }}>
                {he.taskReviewAction}
              </Typography>
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
    </Box>
  );
}

function reviewSquareButton(title: string, onOpen: () => void) {
  return {
    component: "button" as const,
    type: "button" as const,
    onClick: onOpen,
    "aria-label": `${he.taskReviewAction}: ${title}`,
  };
}
