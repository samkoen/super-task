import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  directChatService,
  type DirectChatMessage,
  type DirectChatPayload,
} from "../../services/directChatService";
import { he } from "../../i18n/he";
import { systemBottomInsetCss } from "../../utils/systemInsets";
import { parseRecipientBreak, type BreakAlertTarget } from "../../utils/breakAlert";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import { usePagedChatMessages } from "../../hooks/usePagedChatMessages";
import type { MediaKind } from "../media/MediaCaptureActions";
import BreakAlertDialog from "./BreakAlertDialog";
import ChatComposerBar from "./ChatComposerBar";
import ChatMessageList from "./ChatMessageList";
import ChatPhotoAnnotateReplyDialog from "./ChatPhotoAnnotateReplyDialog";
import { useChatPhotoAnnotateReply } from "../../hooks/useChatPhotoAnnotateReply";

interface DirectChatThreadProps {
  conversationId: string | null;
  broadcast?: boolean;
  onSent?: () => void;
}

export default function DirectChatThread({
  conversationId,
  broadcast = false,
  onSent,
}: DirectChatThreadProps) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [breakAlert, setBreakAlert] = useState<BreakAlertTarget | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (before?: string) => {
    if (!conversationId) return { messages: [] as DirectChatMessage[], has_more: false };
    try {
      return await directChatService.listMessages(conversationId, { before });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
      throw e;
    }
  }, [conversationId]);

  const paged = usePagedChatMessages({
    enabled: Boolean(conversationId) && !broadcast,
    fetchPage,
  });
  const { messages, hasMore, loading, loadingOlder, loadLatest, loadOlder, stickToBottom } = paged;

  useDirectChatLiveSync(broadcast ? null : conversationId, () => void loadLatest(true));
  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, loading, stickToBottom]);

  const deliver = (payload: DirectChatPayload) =>
    deliverDirectMessage({
      payload,
      conversationId,
      broadcast,
      loadLatest,
      stickToBottom,
      setBreakAlert,
    });

  const handleSend = async () => {
    if (!body.trim()) {
      setError(he.taskChatNeedContent);
      return;
    }
    setSending(true);
    setError("");
    try {
      await deliver({ body: body.trim() });
      setBody("");
      onSent?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const sendMedia = (file: File, kind: MediaKind) => {
    void postDirectMedia({ file, kind, deliver, setSending, setError, onSent });
  };
  const annotateReply = useChatPhotoAnnotateReply((file) => sendMedia(file, "photo"));

  return (
    <Box display="flex" flexDirection="column" gap={1.5} sx={{ minHeight: 0, flex: 1, pb: systemBottomInsetCss() }}>
      {broadcast ? (
        <Alert severity="info">{he.directChatBroadcastHint}</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
      ) : messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{he.directChatEmpty}</Typography>
      ) : (
        <ChatMessageList
          messages={messages}
          myId={user?.id}
          bottomRef={bottomRef}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          onLoadOlder={() => void loadOlder()}
          onAnnotateReply={annotateReply.start}
        />
      )}
      <ChatComposerBar
        body={body}
        onBodyChange={setBody}
        sending={sending}
        error={error}
        placeholder={he.directChatPlaceholder}
        sendLabel={broadcast ? he.directChatBroadcast : he.taskChatSend}
        onSendText={() => void handleSend()}
        onSendMedia={sendMedia}
      />
      <ChatPhotoAnnotateReplyDialog
        photoUrl={annotateReply.photoUrl}
        sending={sending}
        onClose={annotateReply.close}
        onSend={annotateReply.submit}
      />
      <BreakAlertDialog target={breakAlert} onClose={() => setBreakAlert(null)} />
    </Box>
  );
}

async function deliverDirectMessage(args: {
  payload: DirectChatPayload;
  conversationId: string | null;
  broadcast: boolean;
  loadLatest: (force?: boolean) => Promise<unknown>;
  stickToBottom: { current: boolean };
  setBreakAlert: (value: BreakAlertTarget | null) => void;
}) {
  if (args.broadcast) {
    await directChatService.broadcast(args.payload);
    return;
  }
  if (!args.conversationId) return;
  const sent = await directChatService.send(args.conversationId, args.payload);
  args.setBreakAlert(parseRecipientBreak(sent));
  args.stickToBottom.current = true;
  await args.loadLatest(true);
}

async function uploadDirectKind(file: File, kind: MediaKind): Promise<DirectChatPayload> {
  if (kind === "photo") return { photo_url: (await directChatService.uploadPhoto(file)).url };
  if (kind === "video") return { video_url: (await directChatService.uploadVideo(file)).url };
  return { audio_url: (await directChatService.uploadAudio(file)).url };
}

async function postDirectMedia(args: {
  file: File;
  kind: MediaKind;
  deliver: (payload: DirectChatPayload) => Promise<void>;
  setSending: (value: boolean) => void;
  setError: (value: string) => void;
  onSent?: () => void;
}) {
  args.setSending(true);
  args.setError("");
  try {
    await args.deliver(await uploadDirectKind(args.file, args.kind));
    args.onSent?.();
  } catch (e) {
    args.setError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setSending(false);
  }
}
