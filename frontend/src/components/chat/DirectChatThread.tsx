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
import {
  replacePendingMedia,
  revokePendingMedia,
  uploadPendingMedia,
  type PendingMedia,
} from "../../utils/pendingMedia";
import { parseRecipientBreak, type BreakAlertTarget } from "../../utils/breakAlert";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";
import { usePagedChatMessages } from "../../hooks/usePagedChatMessages";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { blobToFile } from "../../utils/mediaCapture";
import MediaCaptureActions, { type MediaKind } from "../media/MediaCaptureActions";
import { chatBubbleCopySx, chatBubbleMetaSx, chatBubbleSx, isChatAudioOnly } from "../../utils/chatBubbleSx";
import CompletionMediaPreview from "../tasks/CompletionMediaPreview";
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
  const [pendingPhoto, setPendingPhoto] = useState<PendingMedia | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingMedia | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingMedia | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<MediaKind | null>(null);
  const [error, setError] = useState("");
  const [breakAlert, setBreakAlert] = useState<BreakAlertTarget | null>(null);
  const audio = useAudioRecorder();
  const [audioDock, setAudioDock] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef({ photo: null as PendingMedia | null, video: null as PendingMedia | null, audio: null as PendingMedia | null });
  pendingRef.current = { photo: pendingPhoto, video: pendingVideo, audio: pendingAudio };

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
  useEffect(() => () => {
    revokePendingMedia(pendingRef.current.photo);
    revokePendingMedia(pendingRef.current.video);
    revokePendingMedia(pendingRef.current.audio);
  }, []);

  const handleCapture = (file: File, kind: MediaKind) => {
    if (kind === "photo") setPendingPhoto((prev) => replacePendingMedia(prev, file));
    else if (kind === "video") setPendingVideo((prev) => replacePendingMedia(prev, file));
    else setPendingAudio((prev) => replacePendingMedia(prev, file));
  };

  const handleSend = async () => {
    if (!body.trim() && !pendingPhoto && !pendingVideo && !pendingAudio) {
      setError(he.taskChatNeedContent);
      return;
    }
    setSending(true);
    setError("");
    try {
      const payload = await buildPayload(pendingPhoto, pendingVideo, pendingAudio, body, setUploadingKind);
      if (broadcast) {
        await directChatService.broadcast(payload);
      } else if (conversationId) {
        const sent = await directChatService.send(conversationId, payload);
        setBreakAlert(parseRecipientBreak(sent));
        stickToBottom.current = true;
        await loadLatest(true);
      }
      setBody("");
      revokePendingMedia(pendingPhoto);
      revokePendingMedia(pendingVideo);
      revokePendingMedia(pendingAudio);
      setPendingPhoto(null);
      setPendingVideo(null);
      setPendingAudio(null);
      onSent?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setUploadingKind(null);
      setSending(false);
    }
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
          pendingPhoto={pendingPhoto}
          pendingVideo={pendingVideo}
          pendingAudio={pendingAudio}
          broadcast={broadcast}
          error={error}
          onStartAudio={() => {
            setAudioDock(true);
            void audio.start();
          }}
          onCapture={handleCapture}
          onRemovePhoto={() => { revokePendingMedia(pendingPhoto); setPendingPhoto(null); }}
          onRemoveVideo={() => { revokePendingMedia(pendingVideo); setPendingVideo(null); }}
          onRemoveAudio={() => { revokePendingMedia(pendingAudio); setPendingAudio(null); }}
          onSend={() => void handleSend()}
        />
      )}
      <BreakAlertDialog target={breakAlert} onClose={() => setBreakAlert(null)} />
    </Box>
  );
}

async function buildPayload(
  photo: PendingMedia | null,
  video: PendingMedia | null,
  audio: PendingMedia | null,
  body: string,
  setKind: (k: MediaKind | null) => void,
): Promise<DirectChatPayload> {
  if (photo) setKind("photo");
  const photo_url = await uploadPendingMedia(photo, directChatService.uploadPhoto);
  if (video) setKind("video");
  const video_url = await uploadPendingMedia(video, directChatService.uploadVideo);
  if (audio) setKind("audio");
  const audio_url = await uploadPendingMedia(audio, directChatService.uploadAudio);
  setKind(null);
  return { body: body.trim() || undefined, photo_url, video_url, audio_url };
}

async function sendDockedDirectAudio(args: {
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
}) {
  args.setSending(true);
  args.setError("");
  try {
    const blob = await args.audio.stopAndWait();
    if (!blob) return;
    const file = blobToFile(blob, `chat-audio-${Date.now()}.webm`, blob.type || "audio/webm");
    args.setUploadingKind("audio");
    const { url } = await directChatService.uploadAudio(file);
    if (args.broadcast) await directChatService.broadcast({ audio_url: url });
    else if (args.conversationId) {
      const sent = await directChatService.send(args.conversationId, { audio_url: url });
      args.setBreakAlert(parseRecipientBreak(sent));
      args.stickToBottom.current = true;
      await args.loadLatest(true);
    }
    args.setAudioDock(false);
    args.audio.reset();
    args.onSent?.();
  } catch (e) {
    args.setError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setUploadingKind(null);
    args.setSending(false);
  }
}

function DirectChatComposeFields({
  body,
  onBodyChange,
  sending,
  uploadingKind,
  pendingPhoto,
  pendingVideo,
  pendingAudio,
  broadcast,
  error,
  onStartAudio,
  onCapture,
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
  onSend,
}: {
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  uploadingKind: MediaKind | null;
  pendingPhoto: PendingMedia | null;
  pendingVideo: PendingMedia | null;
  pendingAudio: PendingMedia | null;
  broadcast: boolean;
  error: string;
  onStartAudio: () => void;
  onCapture: (file: File, kind: MediaKind) => void;
  onRemovePhoto: () => void;
  onRemoveVideo: () => void;
  onRemoveAudio: () => void;
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
        photoAdded={Boolean(pendingPhoto)}
        videoAdded={Boolean(pendingVideo)}
        audioAdded={Boolean(pendingAudio)}
        uploadingKind={uploadingKind}
        disabled={sending}
        onAudioStart={onStartAudio}
        onCapture={onCapture}
      />
      {(pendingPhoto || pendingVideo || pendingAudio) && (
        <CompletionMediaPreview
          photo_path={pendingPhoto?.previewUrl}
          video_path={pendingVideo?.previewUrl}
          audio_path={pendingAudio?.previewUrl}
          disabled={sending}
          transcriptFallback={false}
          onRemovePhoto={onRemovePhoto}
          onRemoveVideo={onRemoveVideo}
          onRemoveAudio={onRemoveAudio}
        />
      )}
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
