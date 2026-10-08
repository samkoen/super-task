import { Box, Button, Paper, Typography } from "@mui/material";
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
import SectionHeading from "../ui/SectionHeading";
import { actionCardButtonSx, actionCardSx, clampSx } from "./actionCardStyle";

const CHAT_COLOR = "#c62828";

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
      <SectionHeading title={he.dashboardChatWaiting} count={count} color="#c62828" />
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
    <Paper variant="outlined" sx={actionCardSx(CHAT_COLOR, false)}>
      <Typography fontWeight={800} sx={clampSx(1)}>
        {directChatTitle(card)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={clampSx(2)}>
        {[card.last_preview, card.last_at ? formatTime(card.last_at) : null]
          .filter(Boolean)
          .join(" · ")}
      </Typography>
      <Button
        variant="contained"
        startIcon={<ChatOutlinedIcon />}
        onClick={() => onOpen(card)}
        sx={{ ...actionCardButtonSx(CHAT_COLOR), mt: "auto" }}
      >
        {he.dashboardDirectChatReply}
      </Button>
    </Paper>
  );
}
