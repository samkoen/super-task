import { useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, Dialog, Typography } from "@mui/material";
import FlowChatComposer from "./FlowChatComposer";
import { FlowChatContextBar, FlowChatHeader } from "./FlowChatHeader";
import FlowChatMessages from "./FlowChatMessages";
import { useAuth } from "../../context/AuthContext";
import { useChatThread } from "../../hooks/useChatThread";
import { useTaskChatLiveSync } from "../../hooks/useTaskChatLiveSync";
import { he } from "../../i18n/he";
import { flowColor } from "../../styles/flowTokens";
import type { TaskStatus } from "../../services/taskService";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { chatProgress, stepChoices, stepTagLabel } from "../../utils/flowChat";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { createTaskChatTransport } from "../../utils/taskChatTransport";
import type { SlotUploadStatus } from "../../utils/slotUploadState";

type Props = {
  open: boolean;
  occurrenceId: string;
  title: string;
  status?: TaskStatus;
  managerName?: string | null;
  requirements: CompletionRequirement[];
  /** Statut de chaque carte : alimente la barre de progression du contexte. */
  statuses: SlotUploadStatus[];
  onClose: () => void;
  onOccurrenceUpdated?: () => void;
  /** Pause du poll de secours du fil (tests) ; défaut : poll normal. */
  pollMs?: number | false;
};

type ScreenProps = Omit<Props, "open">;

function useTaskThread(props: ScreenProps, selected: number | null) {
  const slotRef = useRef<number | null>(selected);
  slotRef.current = selected;
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
  if (!thread.messages.length) {
    return (
      <Typography data-testid="flow-chat-empty" sx={{ textAlign: "center", color: flowColor.alphaNavy800_60, py: 4, px: 2 }}>
        {he.taskChatEmpty}
      </Typography>
    );
  }
  return (
    <FlowChatMessages
      messages={thread.messages}
      myId={myId}
      stepTagFor={(index) => stepTagLabel(props.requirements, index)}
      hasMore={thread.hasMore}
      loadingOlder={thread.loadingOlder}
      onLoadOlder={() => void thread.loadOlder()}
      bottomRef={thread.bottomRef}
    />
  );
}

function ChatScreen(props: ScreenProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const thread = useTaskThread(props, selected);
  const canCompose = props.status ? canComposeTaskChat(props.status, true) : true;
  return (
    <Box data-testid="flow-task-chat" dir="rtl" sx={{ width: "100%", maxWidth: 393, height: "100dvh", mx: "auto", display: "flex", flexDirection: "column", bgcolor: flowColor.neutral100 }}>
      <Box sx={{ flexShrink: 0 }}>
        <FlowChatHeader title={props.title} managerName={props.managerName} onBack={props.onClose} />
        <FlowChatContextBar progress={chatProgress(props.statuses)} onOpenTask={props.onClose} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Feed props={props} thread={thread} myId={user?.id} />
      </Box>
      {canCompose ? (
        <FlowChatComposer
          choices={stepChoices(props.requirements)}
          selected={selected}
          onSelect={setSelected}
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
 * Chat de la tâche (Figma écran 12), ouvert par l'icône de chat du haut de l'écran de tâche :
 * fil de la tâche, avancement par étape et choix de l'étape visée par chaque message.
 */
export default function FlowTaskChat({ open, ...rest }: Props) {
  return (
    <Dialog fullScreen open={open} onClose={rest.onClose} dir="rtl" PaperProps={paperProps}>
      <ChatScreen {...rest} />
    </Dialog>
  );
}
