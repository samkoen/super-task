import { useEffect, useMemo, useRef } from "react";
import { Box, CircularProgress, Dialog, Typography } from "@mui/material";
import FlowChatComposer from "./FlowChatComposer";
import { FlowChatHeader } from "./FlowChatHeader";
import FlowChatMessages from "./FlowChatMessages";
import { useAuth } from "../../context/AuthContext";
import { useChatThread } from "../../hooks/useChatThread";
import { useTaskChatLiveSync } from "../../hooks/useTaskChatLiveSync";
import { he } from "../../i18n/he";
import { flowColor } from "../../styles/flowTokens";
import type { TaskStatus } from "../../services/taskService";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { composerPlaceholder, slotThreadMessages, stepTagLabel } from "../../utils/flowChat";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { createTaskChatTransport } from "../../utils/taskChatTransport";

type Props = {
  /** Sous-tâche dont on ouvre le chat ; null = fermé. */
  slotIndex: number | null;
  occurrenceId: string;
  /** Titre de la tâche (« פתיחת משמרת ») : début du sous-titre. */
  title: string;
  status?: TaskStatus;
  managerName?: string | null;
  requirements: CompletionRequirement[];
  onClose: () => void;
  onOccurrenceUpdated?: () => void;
  /** Pause du poll de secours du fil (tests) ; défaut : poll normal. */
  pollMs?: number | false;
};

type ScreenProps = Omit<Props, "slotIndex"> & { slotIndex: number };

function useTaskThread(props: ScreenProps) {
  const slotRef = useRef<number | null>(props.slotIndex);
  slotRef.current = props.slotIndex;
  const onUpdated = useRef(props.onOccurrenceUpdated);
  onUpdated.current = props.onOccurrenceUpdated;
  const transport = useMemo(
    () => createTaskChatTransport({
      occurrenceId: props.occurrenceId,
      onPosted: () => onUpdated.current?.(),
      getSlotIndex: () => slotRef.current,
    }),
    [props.occurrenceId],
  );
  const thread = useChatThread({ transport, enabled: true });
  useTaskChatLiveSync(props.occurrenceId, () => void thread.loadLatest(true), { pollMs: props.pollMs });
  useEffect(() => {
    if (thread.stickToBottom.current) thread.bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [thread.messages.length, thread.loading, thread.stickToBottom, thread.bottomRef]);
  return thread;
}

function Feed({ props, thread, myId }: { props: ScreenProps; thread: ReturnType<typeof useChatThread>; myId?: string }) {
  if (thread.loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  const messages = slotThreadMessages(thread.messages, props.slotIndex);
  if (!messages.length) {
    return (
      <Typography data-testid="flow-chat-empty" sx={{ textAlign: "center", color: flowColor.alphaNavy800_60, py: 4, px: 2 }}>
        {he.taskChatEmpty}
      </Typography>
    );
  }
  return (
    <FlowChatMessages
      messages={messages}
      myId={myId}
      stepTagFor={() => null}
      hasMore={thread.hasMore}
      loadingOlder={thread.loadingOlder}
      onLoadOlder={() => void thread.loadOlder()}
      bottomRef={thread.bottomRef}
    />
  );
}

function ChatScreen(props: ScreenProps) {
  const { user } = useAuth();
  const thread = useTaskThread(props);
  const slotTitle = stepTagLabel(props.requirements, props.slotIndex) ?? "";
  const canCompose = props.status ? canComposeTaskChat(props.status, true) : true;
  return (
    <Box data-testid="flow-task-chat" dir="rtl" sx={{ width: "100%", maxWidth: 393, height: "100dvh", mx: "auto", display: "flex", flexDirection: "column", bgcolor: flowColor.neutral100 }}>
      <Box sx={{ flexShrink: 0 }}>
        <FlowChatHeader title={slotTitle} taskTitle={props.title} managerName={props.managerName} onBack={props.onClose} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pt: "16px" }}>
        <Feed props={props} thread={thread} myId={user?.id} />
      </Box>
      {canCompose ? (
        <FlowChatComposer
          placeholder={composerPlaceholder(props.requirements, props.slotIndex)}
          body={thread.body}
          onBodyChange={thread.setBody}
          sending={thread.sending}
          error={thread.error}
          onSend={() => void thread.sendText()}
          onSendMedia={thread.sendMedia}
        />
      ) : null}
    </Box>
  );
}

const paperProps = { sx: { bgcolor: flowColor.neutral100 } };

/**
 * Chat d'une sous-tâche (Figma écrans 12ב → 12ב4), ouvert depuis le menu « ••• » de la carte ou depuis
 * la caméra. Chaque message part avec `slot_index` ; le fil montre les messages de cette sous-tâche
 * et les messages généraux de la tâche (sans sous-tâche).
 */
export default function FlowTaskChat({ slotIndex, ...rest }: Props) {
  return (
    <Dialog fullScreen open={slotIndex !== null} onClose={rest.onClose} dir="rtl" PaperProps={paperProps}>
      {slotIndex !== null ? <ChatScreen {...rest} slotIndex={slotIndex} /> : null}
    </Dialog>
  );
}
