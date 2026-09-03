import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { taskService, type TaskMessage } from "../../services/taskService";
import { he } from "../../i18n/he";
import { formatTime } from "../../utils/dashboardTime";
import { useTaskChatLiveSync } from "../../hooks/useTaskChatLiveSync";
import { usePagedChatMessages } from "../../hooks/usePagedChatMessages";
import type { MediaKind } from "../media/MediaCaptureActions";
import type { TaskStatus } from "../../services/taskService";
import { chatBubbleCopySx, chatBubbleMetaSx, chatBubbleSx, isChatAudioOnly } from "../../utils/chatBubbleSx";
import BreakAlertDialog from "../chat/BreakAlertDialog";
import ChatComposerBar from "../chat/ChatComposerBar";
import ChatFollowUpDialog from "../chat/ChatFollowUpDialog";
import ChatMessageMedia from "../chat/ChatMessageMedia";
import ChatPhotoAnnotateReplyDialog from "../chat/ChatPhotoAnnotateReplyDialog";
import ChatTaskActions from "../chat/ChatTaskActions";
import { useChatPhotoAnnotateReply } from "../../hooks/useChatPhotoAnnotateReply";
import { parseRecipientBreak, type BreakAlertTarget } from "../../utils/breakAlert";
import { canAnnotateChatReply } from "../../utils/chatAnnotateReply";
import { isOpenChatTask } from "../../utils/chatTaskFollowUp";

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

function asTaskChatPage(data: unknown): { messages: TaskMessage[]; has_more: boolean } {
  if (Array.isArray(data)) return { messages: data as TaskMessage[], has_more: false };
  if (data && typeof data === "object" && Array.isArray((data as { messages?: unknown }).messages)) {
    const page = data as { messages: TaskMessage[]; has_more?: boolean };
    return { messages: page.messages, has_more: Boolean(page.has_more) };
  }
  return { messages: [], has_more: false };
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
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [breakAlert, setBreakAlert] = useState<BreakAlertTarget | null>(null);
  const [status, setStatus] = useState(occurrenceStatus);
  const [resolvedAt, setResolvedAt] = useState(chatResolvedAt);
  const [followUpAt, setFollowUpAt] = useState(chatFollowUpAt);
  const [remindOpen, setRemindOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canManage =
    user?.role === "branch_manager" || user?.role === "network_manager" || user?.role === "admin";
  const showChatActions = canManage && isOpenChatTask(status, resolvedAt);

  useEffect(() => {
    setStatus(occurrenceStatus);
    setResolvedAt(chatResolvedAt);
    setFollowUpAt(chatFollowUpAt);
  }, [occurrenceStatus, chatResolvedAt, chatFollowUpAt]);

  const fetchPage = useCallback(async (before?: string) => {
    try {
      return asTaskChatPage(await taskService.listMessages(occurrenceId, { before }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
      throw e;
    }
  }, [occurrenceId]);

  const { messages, hasMore, loading, loadingOlder, loadLatest, loadOlder, stickToBottom } =
    usePagedChatMessages({ enabled: true, fetchPage });

  useTaskChatLiveSync(occurrenceId, () => void loadLatest(true), { pollMs });

  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, loading, stickToBottom]);

  const finishPosted = async (result: Awaited<ReturnType<typeof taskService.postMessage>>) => {
    setBreakAlert(parseRecipientBreak(result));
    stickToBottom.current = true;
    await loadLatest(true);
    setBody("");
    onOccurrenceUpdated?.(result.occurrence.status, he.taskChatSent);
  };

  const handleSend = async () => {
    if (!body.trim()) {
      setError(he.taskChatNeedContent);
      return;
    }
    setSending(true);
    setError("");
    try {
      const result = await taskService.postMessage(occurrenceId, { body: body.trim() });
      await finishPosted(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const sendInstantMedia = async (file: File, kind: MediaKind) => {
    setSending(true);
    setError("");
    try {
      const uploaded = await uploadChatKind(file, kind);
      const result = await taskService.postMessage(occurrenceId, uploaded);
      await finishPosted(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const annotateReply = useChatPhotoAnnotateReply((file) => sendInstantMedia(file, "photo"));

  const runChatAction = async (action: () => Promise<{ occurrence: { status: string; chat_resolved_at?: string | null; chat_follow_up_at?: string | null } }>) => {
    setSending(true);
    setError("");
    try {
      const result = await action();
      setStatus(result.occurrence.status as TaskStatus);
      setResolvedAt(result.occurrence.chat_resolved_at);
      setFollowUpAt(result.occurrence.chat_follow_up_at);
      onOccurrenceUpdated?.(
        result.occurrence.status,
        result.occurrence.chat_follow_up_at && !result.occurrence.chat_resolved_at
          ? he.chatTaskReminderSet
          : he.chatTaskCompleted,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const lastEmployeeQuestion = [...messages]
    .reverse()
    .find((m) => m.sender_role === "employee");

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <Typography variant="subtitle2" fontWeight={700}>
        {he.taskChatTitle}
      </Typography>
      {showChatActions && (
        <ChatTaskActions
          disabled={sending}
          onComplete={() => void runChatAction(() => taskService.resolveChatTask(occurrenceId))}
          onRemind={() => setRemindOpen(true)}
        />
      )}

      {user?.role !== "employee" && lastEmployeeQuestion && (
        <Alert severity="warning" sx={{ alignItems: "flex-start" }}>
          <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>
            {he.taskChatEmployeeQuestion}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.primary" }}>
            {(lastEmployeeQuestion.display_body ?? lastEmployeeQuestion.body)?.trim() ||
              lastEmployeeQuestion.display_audio_transcript ||
              he.taskChatMediaOnly}
          </Typography>
          {(lastEmployeeQuestion.photo_url ||
            lastEmployeeQuestion.video_url ||
            lastEmployeeQuestion.audio_url) && (
            <Box mt={1}>
              <ChatMessageMedia
                photoUrl={lastEmployeeQuestion.photo_url}
                videoUrl={lastEmployeeQuestion.video_url}
                audioUrl={lastEmployeeQuestion.audio_url}
                onAnnotateReply={
                  canAnnotateChatReply(composeEnabled, false)
                    ? annotateReply.start
                    : undefined
                }
              />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {lastEmployeeQuestion.sender_name || "—"} · {formatTime(lastEmployeeQuestion.created_at)}
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      ) : messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {he.taskChatEmpty}
        </Typography>
      ) : (
        <Box
          sx={{
            maxHeight: compact ? 220 : 320,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            p: 1.25,
            bgcolor: "grey.100",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {hasMore && (
            <Button type="button" size="small" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? <CircularProgress size={16} /> : he.chatLoadOlder}
            </Button>
          )}
          {messages.map((msg) => {
            const mine = Boolean(user?.id && msg.sender_user_id === user.id);
            const fromEmployee = msg.sender_role === "employee" || (!mine && !msg.sender_role);
            const text = (msg.display_body ?? msg.body)?.trim();
            const transcript = msg.display_audio_transcript ?? msg.audio_transcript;
            const audioOnly = isChatAudioOnly({
              text,
              photoUrl: msg.photo_url,
              videoUrl: msg.video_url,
              audioUrl: msg.audio_url,
            });
            return (
              <Box
                key={msg.id}
                sx={chatBubbleSx({ mine, fromEmployee, audioOnly })}
              >
                <Typography variant="caption" sx={chatBubbleMetaSx} display="block">
                  {msg.sender_name || "—"} · {formatTime(msg.created_at)}
                </Typography>
                {text ? (
                  <Typography
                    variant="body2"
                    fontWeight={fromEmployee && !mine ? 600 : 400}
                    sx={chatBubbleCopySx}
                  >
                    {text}
                  </Typography>
                ) : null}
                <ChatMessageMedia
                  photoUrl={msg.photo_url}
                  videoUrl={msg.video_url}
                  audioUrl={msg.audio_url}
                  transcript={text ? undefined : transcript}
                  onAnnotateReply={
                    canAnnotateChatReply(composeEnabled, mine)
                      ? annotateReply.start
                      : undefined
                  }
                />
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Box>
      )}

      {composeEnabled && (
        <Box sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", pt: 0.5, zIndex: 1 }}>
          <ChatComposerBar
            body={body}
            onBodyChange={setBody}
            sending={sending}
            error={error}
            onSendText={() => void handleSend()}
            onSendMedia={(file, kind) => void sendInstantMedia(file, kind)}
          />
        </Box>
      )}
      {!composeEnabled && error && <Alert severity="error">{error}</Alert>}
      <ChatPhotoAnnotateReplyDialog
        photoUrl={annotateReply.photoUrl}
        sending={sending}
        onClose={annotateReply.close}
        onSend={annotateReply.submit}
      />
      <BreakAlertDialog target={breakAlert} onClose={() => setBreakAlert(null)} />
      <ChatFollowUpDialog
        open={remindOpen}
        initialIso={followUpAt}
        saving={sending}
        onClose={() => setRemindOpen(false)}
        onSave={(iso) => {
          setRemindOpen(false);
          void runChatAction(() => taskService.setChatFollowUp(occurrenceId, iso));
        }}
      />
    </Box>
  );
}

async function uploadChatKind(file: File, kind: MediaKind) {
  if (kind === "photo") return { photo_url: (await taskService.uploadPhoto(file)).url };
  if (kind === "video") return { video_url: (await taskService.uploadVideo(file)).url };
  return { audio_url: (await taskService.uploadAudio(file)).url };
}
