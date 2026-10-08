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
import { actionCardButtonSx, actionCardSx, clampSx } from "./actionCardStyle";

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
      sx={actionCardSx(border, Boolean(openReview))}
    >
      <Box display="flex" gap={0.5} flexWrap="wrap">
        <Chip
          size="small"
          label={
            reason === "awaiting_response"
              ? he.dashboardActionAwaitingResponse
              : he.dashboardQueuePendingReview
          }
          sx={{
            bgcolor: alpha(border, 0.14),
            color: border,
            fontWeight: 800,
            height: 26,
            "& .MuiChip-label": { px: 1.25, fontSize: 13 },
          }}
        />
      </Box>
      <Typography fontWeight={800} sx={clampSx(2)} title={task.title}>
        {reason === "awaiting_response"
          ? he.dashboardQuestionCard(task.assignee_name || task.title)
          : task.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={clampSx(2)}>
        {[
          reason === "awaiting_response" ? task.title : task.assignee_name,
          task.department_name,
          task.completed_at ? formatTime(task.completed_at) : formatDueAt(task.due_at),
        ]
          .filter(Boolean)
          .join(" · ")}
      </Typography>
      {openReview && (
        <Typography fontWeight={800} sx={{ color: border, mt: "auto", pt: 0.5 }}>
          {he.taskReviewAction}
        </Typography>
      )}
      {reason === "awaiting_response" && (onOpenChat || onReviewTask) && (
        <Button
          variant="contained"
          onClick={() => (onOpenChat ?? onReviewTask)?.(task.id)}
          sx={{ ...actionCardButtonSx(border), mt: "auto" }}
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
