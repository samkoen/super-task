import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { ApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  directChatService,
  type DirectChatMessage,
  type DirectChatPayload,
} from "../../services/directChatService";
import { he } from "../../i18n/he";
import { formatTime } from "../../utils/dashboardTime";
import { systemBottomInsetCss } from "../../utils/systemInsets";
import { parseRecipientBreak, type BreakAlertTarget } from "../../utils/breakAlert";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import { usePagedChatMessages } from "../../hooks/usePagedChatMessages";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { blobToFile } from "../../utils/mediaCapture";
import MediaCaptureActions, { type MediaKind } from "../media/MediaCaptureActions";
import { chatBubbleCopySx, chatBubbleMetaSx, chatBubbleSx, isChatAudioOnly } from "../../utils/chatBubbleSx";
import BreakAlertDialog from "./BreakAlertDialog";
import ChatAudioDock from "./ChatAudioDock";
import ChatMessageMedia from "./ChatMessageMedia";

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
  const sendLock = useRef(false);
  const [uploadingKind, setUploadingKind] = useState<MediaKind | null>(null);
  const [error, setError] = useState("");
  const [breakAlert, setBreakAlert] = useState<BreakAlertTarget | null>(null);
  const audio = useAudioRecorder();
  const [audioDock, setAudioDock] = useState(false);
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

  const handleCapture = (file: File, kind: MediaKind) => {
    void postDirectMedia({
      file,
      kind,
      deliver,
      setSending,
      setError,
      setUploadingKind,
      onSent,
    });
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.5} sx={{ minHeight: 0, flex: 1, pb: systemBottomInsetCss() }}>
      {broadcast ? (
        <Alert severity="info">{he.directChatBroadcastHint}</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
      ) : messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{he.directChatEmpty}</Typography>
      ) : (
        <MessageList
          messages={messages}
          myId={user?.id}
          bottomRef={bottomRef}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          onLoadOlder={() => void loadOlder()}
        />
      )}
      {audioDock ? (
        <ChatAudioDock
          audio={audio}
          sending={sending}
          onSend={() =>
            void sendDockedDirectAudio({
              audio,
              conversationId,
              broadcast,
              sendLock,
              setAudioDock,
              setSending,
              setError,
              setUploadingKind,
              loadLatest,
              stickToBottom,
              setBreakAlert,
              onSent,
            })
          }
          onDelete={() => {
            audio.reset();
            setAudioDock(false);
          }}
        />
      ) : (
        <DirectChatComposeFields
          body={body}
          onBodyChange={setBody}
          sending={sending}
          uploadingKind={uploadingKind}
          broadcast={broadcast}
          error={error}
          onStartAudio={() => {
            setAudioDock(true);
            void audio.start();
          }}
          onCapture={handleCapture}
          onSend={() => void handleSend()}
        />
      )}
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
  setUploadingKind: (kind: MediaKind | null) => void;
  onSent?: () => void;
}) {
  args.setSending(true);
  args.setError("");
  try {
    args.setUploadingKind(args.kind);
    await args.deliver(await uploadDirectKind(args.file, args.kind));
    args.onSent?.();
  } catch (e) {
    args.setError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setUploadingKind(null);
    args.setSending(false);
  }
}

async function postDockedAudioFile(
  blob: Blob,
  args: {
    audio: ReturnType<typeof useAudioRecorder>;
    conversationId: string | null;
    broadcast: boolean;
    setAudioDock: (open: boolean) => void;
    setSending: (value: boolean) => void;
    setError: (value: string) => void;
    setUploadingKind: (kind: MediaKind | null) => void;
    loadLatest: (force?: boolean) => Promise<unknown>;
    stickToBottom: { current: boolean };
    setBreakAlert: (value: BreakAlertTarget | null) => void;
    onSent?: () => void;
  },
) {
  const file = blobToFile(blob, `chat-audio-${Date.now()}.webm`, blob.type || "audio/webm");
  await postDirectMedia({
    file,
    kind: "audio",
    deliver: (payload) =>
      deliverDirectMessage({
        payload,
        conversationId: args.conversationId,
        broadcast: args.broadcast,
        loadLatest: args.loadLatest,
        stickToBottom: args.stickToBottom,
        setBreakAlert: args.setBreakAlert,
      }),
    setSending: args.setSending,
    setError: args.setError,
    setUploadingKind: args.setUploadingKind,
    onSent: () => {
      args.setAudioDock(false);
      args.audio.reset();
      args.onSent?.();
    },
  });
}

function closeEmptyDockedAudio(args: {
  audio: ReturnType<typeof useAudioRecorder>;
  setAudioDock: (open: boolean) => void;
  setError: (value: string) => void;
}) {
  args.setError(he.chatAudioEmpty);
  args.audio.reset();
  args.setAudioDock(false);
}

async function sendDockedDirectAudio(args: {
  audio: ReturnType<typeof useAudioRecorder>;
  conversationId: string | null;
  broadcast: boolean;
  sendLock: { current: boolean };
  setAudioDock: (open: boolean) => void;
  setSending: (value: boolean) => void;
  setError: (value: string) => void;
  setUploadingKind: (kind: MediaKind | null) => void;
  loadLatest: (force?: boolean) => Promise<unknown>;
  stickToBottom: { current: boolean };
  setBreakAlert: (value: BreakAlertTarget | null) => void;
  onSent?: () => void;
}) {
  if (args.sendLock.current) return;
  args.sendLock.current = true;
  args.setSending(true);
  args.setError("");
  try {
    const blob = await args.audio.stopAndWait();
    if (!blob) {
      closeEmptyDockedAudio(args);
      return;
    }
    await postDockedAudioFile(blob, args);
  } finally {
    args.sendLock.current = false;
    args.setSending(false);
  }
}

function DirectChatComposeFields({
  body,
  onBodyChange,
  sending,
  uploadingKind,
  broadcast,
  error,
  onStartAudio,
  onCapture,
  onSend,
}: {
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  uploadingKind: MediaKind | null;
  broadcast: boolean;
  error: string;
  onStartAudio: () => void;
  onCapture: (file: File, kind: MediaKind) => void;
  onSend: () => void;
}) {
  return (
    <>
      <TextField
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder={he.directChatPlaceholder}
        fullWidth
        multiline
        minRows={2}
        disabled={sending}
      />
      <MediaCaptureActions
        density="icon"
        photoAdded={false}
        videoAdded={false}
        audioAdded={false}
        uploadingKind={uploadingKind}
        disabled={sending}
        onAudioStart={onStartAudio}
        onCapture={onCapture}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Button
        variant="contained"
        startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
        onClick={onSend}
        disabled={sending || Boolean(uploadingKind)}
      >
        {broadcast ? he.directChatBroadcast : he.taskChatSend}
      </Button>
    </>
  );
}

function MessageList({
  messages,
  myId,
  bottomRef,
  hasMore,
  loadingOlder,
  onLoadOlder,
}: {
  messages: DirectChatMessage[];
  myId?: string;
  bottomRef: Ref<HTMLDivElement>;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
}) {
  return (
    <Box sx={{
      flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1,
      p: 1.25, bgcolor: "grey.100", borderRadius: 2, minHeight: 220,
    }}>
      {hasMore && (
        <Button type="button" size="small" onClick={onLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? <CircularProgress size={16} /> : he.chatLoadOlder}
        </Button>
      )}
      {messages.map((msg) => {
        const mine = Boolean(myId && msg.sender_user_id === myId);
        const text = msg.body?.trim();
        const audioOnly = isChatAudioOnly({
          text,
          photoUrl: msg.photo_url,
          videoUrl: msg.video_url,
          audioUrl: msg.audio_url,
        });
        return (
          <Box
            key={msg.id}
            sx={chatBubbleSx({ mine, audioOnly })}
          >
            <Typography variant="caption" sx={chatBubbleMetaSx} display="block">
              {msg.sender_name || "—"} · {formatTime(msg.created_at)}
            </Typography>
            {text ? (
              <Typography variant="body2" sx={chatBubbleCopySx}>{text}</Typography>
            ) : null}
            <ChatMessageMedia
              photoUrl={msg.photo_url}
              videoUrl={msg.video_url}
              audioUrl={msg.audio_url}
            />
          </Box>
        );
      })}
      <div ref={bottomRef} />
    </Box>
  );
}
