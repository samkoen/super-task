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
import { dashboardCarouselRowSx } from "./DashboardCarousel";

export default function ManagerActionsSection({
  queues,
  chats,
  onReviewTask,
  onOpenChat,
  onOpenTaskChat,
}: {
  queues: TaskQueues | null | undefined;
  chats: DirectChatCard[];
  onReviewTask: (taskId: string) => void;
  onOpenChat: (card: DirectChatCard) => void;
  onOpenTaskChat?: (taskId: string) => void;
}) {
  const questions = buildQuestionsQueue(queues);
  const reviews = buildPendingReviewQueue(queues);
  const waiting = questions.length + chats.length;

  return (
    <Box mb={3}>
      {reviews.length > 0 ? (
        <ActionRequiredCarousel queues={queues} mode="reviews" onReviewTask={onReviewTask} />
      ) : null}
      {waiting > 0 ? (
        <ChatWaitingBlock
          count={waiting}
          chats={chats}
          queues={queues}
          onOpenChat={onOpenChat}
          onOpenTaskChat={onOpenTaskChat ?? onReviewTask}
        />
      ) : reviews.length === 0 ? (
        <ChatWaitingHeading />
      ) : null}
    </Box>
  );
}

function ChatWaitingHeading({ count = 0 }: { count?: number }) {
  return (
    <>
      <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
        {he.dashboardChatWaiting}
        {count > 0 ? ` (${count})` : ""}
      </Typography>
      {count === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.dashboardChatWaitingEmpty}
        </Typography>
      ) : null}
    </>
  );
}

function ChatWaitingBlock({
  count,
  chats,
  queues,
  onOpenChat,
  onOpenTaskChat,
}: {
  count: number;
  chats: DirectChatCard[];
  queues: TaskQueues | null | undefined;
  onOpenChat: (card: DirectChatCard) => void;
  onOpenTaskChat: (taskId: string) => void;
}) {
  const hasQuestions = buildQuestionsQueue(queues).length > 0;
  return (
    <>
      <ChatWaitingHeading count={count} />
      <Box data-testid="chat-waiting-row" sx={dashboardCarouselRowSx}>
        {chats.map((card) => (
          <DirectChatActionCard key={card.counterpart_user_id} card={card} onOpen={onOpenChat} />
        ))}
        {hasQuestions ? (
          <ActionRequiredCarousel
            queues={queues}
            mode="questions"
            embedded
            onOpenChat={onOpenTaskChat}
          />
        ) : null}
      </Box>
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
        minWidth: 110,
        maxWidth: 130,
        width: 120,
        flex: "0 0 auto",
        p: 0.75,
        scrollSnapAlign: "start",
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
        sx={{
          bgcolor: "#c62828",
          "&:hover": { bgcolor: "#c62828" },
          minWidth: 0,
          px: 0.75,
          py: 0.15,
          fontSize: 11,
        }}
      >
        {he.dashboardDirectChatReply}
      </Button>
    </Paper>
  );
}
