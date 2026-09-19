import { Box, Button, Paper, Typography, alpha } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import type { TaskQueues } from "../../services/dashboardService";
import type { DirectChatCard } from "../../services/directChatService";
import { he } from "../../i18n/he";
import { directChatTitle } from "../../utils/directChat";
import { formatTime } from "../../utils/dashboardTime";
import {
  buildPendingReviewQueue,
  buildQuestionsQueue,
} from "../../utils/dashboardCarousels";
import ActionRequiredCarousel from "./ActionRequiredCarousel";

export default function ManagerActionsSection({
  queues,
  chats,
  onReviewTask,
  onOpenChat,
}: {
  queues: TaskQueues | null | undefined;
  chats: DirectChatCard[];
  onReviewTask: (taskId: string) => void;
  onOpenChat: (card: DirectChatCard) => void;
}) {
  const questions = buildQuestionsQueue(queues);
  const reviews = buildPendingReviewQueue(queues);
  const total = questions.length + reviews.length + chats.length;

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
        {he.dashboardActionsTitle}
        {total > 0 ? ` (${total})` : ""}
      </Typography>
      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardActionsEmpty}
        </Typography>
      ) : (
        <ActionsBody
          chats={chats}
          queues={queues}
          onOpenChat={onOpenChat}
          onReviewTask={onReviewTask}
        />
      )}
    </Box>
  );
}

function ActionsBody({
  chats,
  queues,
  onOpenChat,
  onReviewTask,
}: {
  chats: DirectChatCard[];
  queues: TaskQueues | null | undefined;
  onOpenChat: (card: DirectChatCard) => void;
  onReviewTask: (taskId: string) => void;
}) {
  const hasQuestions = buildQuestionsQueue(queues).length > 0;
  const hasReviews = buildPendingReviewQueue(queues).length > 0;
  return (
    <>
      {chats.map((card) => (
        <DirectChatActionCard key={card.counterpart_user_id} card={card} onOpen={onOpenChat} />
      ))}
      {hasQuestions ? (
        <ActionRequiredCarousel queues={queues} mode="questions" onReviewTask={onReviewTask} />
      ) : null}
      {hasReviews ? (
        <ActionRequiredCarousel queues={queues} mode="reviews" onReviewTask={onReviewTask} />
      ) : null}
    </>
  );
}

function DirectChatActionCard({
  card,
  onOpen,
}: {
  card: DirectChatCard;
  onOpen: (card: DirectChatCard) => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        mb: 1,
        borderWidth: 2,
        borderColor: "#c62828",
        bgcolor: alpha("#c62828", 0.04),
      }}
    >
      <Typography variant="subtitle2" fontWeight={800}>
        {directChatTitle(card)}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.75} noWrap>
        {[card.last_preview, card.last_at ? formatTime(card.last_at) : null]
          .filter(Boolean)
          .join(" · ")}
      </Typography>
      <Button
        size="small"
        variant="contained"
        startIcon={<ChatOutlinedIcon />}
        onClick={() => onOpen(card)}
        sx={{ bgcolor: "#c62828", "&:hover": { bgcolor: "#c62828" } }}
      >
        {he.dashboardDirectChatReply}
      </Button>
    </Paper>
  );
}
