import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { taskService, type TaskStatus } from "../../services/taskService";
import { he } from "../../i18n/he";
import { useTaskChatLiveSync } from "../../hooks/useTaskChatLiveSync";
import { useChatThread } from "../../hooks/useChatThread";
import { createTaskChatTransport } from "../../utils/taskChatTransport";
import { lastEmployeeChatMessage, type ChatMessageView } from "../../utils/chatMessageView";
import { isOpenChatTask } from "../../utils/chatTaskFollowUp";
import ChatFollowUpDialog from "../chat/ChatFollowUpDialog";
import ChatTaskActions from "../chat/ChatTaskActions";
import ChatThread from "../chat/ChatThread";
import TaskChatQuestionBanner from "../chat/TaskChatQuestionBanner";

interface TaskChatPanelProps {
  occurrenceId: string;
  occurrenceStatus?: TaskStatus;
  chatFollowUpAt?: string | null;
  chatResolvedAt?: string | null;
  onOccurrenceUpdated?: (status: string, notice?: string) => void;
  compact?: boolean;
  /** Si false : fil visible, pas de composition (statut terminé / annulé…). */
  composeEnabled?: boolean;
  /**
   * Poll de secours du fil (ms). Défaut 10s ; `false` pour désactiver ;
   * sinon `VITE_TASK_CHAT_POLL_MS`.
   */
  pollMs?: number | false;
}

export default function TaskChatPanel({
  occurrenceId,
  occurrenceStatus,
  chatFollowUpAt,
  chatResolvedAt,
  onOccurrenceUpdated,
  compact = false,
  composeEnabled = true,
  pollMs,
}: TaskChatPanelProps) {
  const { user } = useAuth();
  const onUpdatedRef = useRef(onOccurrenceUpdated);
  onUpdatedRef.current = onOccurrenceUpdated;
  const transport = useMemo(
    () => createTaskChatTransport({
      occurrenceId,
      onPosted: (status, notice) => onUpdatedRef.current?.(status, notice),
    }),
    [occurrenceId],
  );
  const thread = useChatThread({ transport, enabled: true });
  useTaskChatLiveSync(occurrenceId, () => void thread.loadLatest(true), { pollMs });
  const manager = useTaskChatManager({
    userRole: user?.role,
    occurrenceId,
    occurrenceStatus,
    chatFollowUpAt,
    chatResolvedAt,
    onOccurrenceUpdated,
    runBusy: thread.runBusy,
  });
  const lastQuestion = user?.role === "employee"
    ? undefined
    : lastEmployeeChatMessage(thread.messages);

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <ChatThread
        thread={thread}
        myId={user?.id}
        emptyText={he.taskChatEmpty}
        composeEnabled={composeEnabled}
        layout="bounded"
        compact={compact}
        highlightEmployee
        stickyComposer
        header={(
          <TaskChatHeader
            showActions={manager.showActions}
            sending={thread.sending}
            lastQuestion={lastQuestion}
            composeEnabled={composeEnabled}
            onComplete={manager.complete}
            onRemind={() => manager.setRemindOpen(true)}
            onAnnotateReply={thread.annotateReply.start}
          />
        )}
      />
      <ChatFollowUpDialog
        open={manager.remindOpen}
        initialIso={manager.followUpAt}
        saving={thread.sending}
        onClose={() => manager.setRemindOpen(false)}
        onSave={manager.saveFollowUp}
      />
    </Box>
  );
}

function TaskChatHeader({
  showActions,
  sending,
  lastQuestion,
  composeEnabled,
  onComplete,
  onRemind,
  onAnnotateReply,
}: {
  showActions: boolean;
  sending: boolean;
  lastQuestion?: ChatMessageView;
  composeEnabled: boolean;
  onComplete: () => void;
  onRemind: () => void;
  onAnnotateReply: (photoUrl: string) => void;
}) {
  return (
    <>
      <Typography variant="subtitle2" fontWeight={700}>{he.taskChatTitle}</Typography>
      {showActions && (
        <ChatTaskActions disabled={sending} onComplete={onComplete} onRemind={onRemind} />
      )}
      {lastQuestion && (
        <TaskChatQuestionBanner
          message={lastQuestion}
          composeEnabled={composeEnabled}
          onAnnotateReply={onAnnotateReply}
        />
      )}
    </>
  );
}

type ChatOccurrencePatch = {
  status: string;
  chat_resolved_at?: string | null;
  chat_follow_up_at?: string | null;
};

function chatActionNotice(occurrence: ChatOccurrencePatch): string {
  return occurrence.chat_follow_up_at && !occurrence.chat_resolved_at
    ? he.chatTaskReminderSet
    : he.chatTaskCompleted;
}

function useTaskChatManager(opts: {
  userRole?: string;
  occurrenceId: string;
  occurrenceStatus?: TaskStatus;
  chatFollowUpAt?: string | null;
  chatResolvedAt?: string | null;
  onOccurrenceUpdated?: (status: string, notice?: string) => void;
  runBusy: (work: () => Promise<void>) => Promise<void>;
}) {
  const [status, setStatus] = useState(opts.occurrenceStatus);
  const [resolvedAt, setResolvedAt] = useState(opts.chatResolvedAt);
  const [followUpAt, setFollowUpAt] = useState(opts.chatFollowUpAt);
  const [remindOpen, setRemindOpen] = useState(false);
  const canManage =
    opts.userRole === "branch_manager" ||
    opts.userRole === "network_manager" ||
    opts.userRole === "admin";

  useEffect(() => {
    setStatus(opts.occurrenceStatus);
    setResolvedAt(opts.chatResolvedAt);
    setFollowUpAt(opts.chatFollowUpAt);
  }, [opts.occurrenceStatus, opts.chatResolvedAt, opts.chatFollowUpAt]);

  const applyOccurrence = (occurrence: ChatOccurrencePatch) => {
    setStatus(occurrence.status as TaskStatus);
    setResolvedAt(occurrence.chat_resolved_at);
    setFollowUpAt(occurrence.chat_follow_up_at);
    opts.onOccurrenceUpdated?.(occurrence.status, chatActionNotice(occurrence));
  };

  return {
    followUpAt,
    remindOpen,
    setRemindOpen,
    showActions: canManage && isOpenChatTask(status, resolvedAt),
    complete: () => {
      void opts.runBusy(async () => {
        applyOccurrence((await taskService.resolveChatTask(opts.occurrenceId)).occurrence);
      });
    },
    saveFollowUp: (iso: string) => {
      setRemindOpen(false);
      void opts.runBusy(async () => {
        applyOccurrence((await taskService.setChatFollowUp(opts.occurrenceId, iso)).occurrence);
      });
    },
  };
}
