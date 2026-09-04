import { useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Box, Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import MicIcon from "@mui/icons-material/Mic";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SendIcon from "@mui/icons-material/Send";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useVideoRecorder } from "../../hooks/useVideoRecorder";
import { he } from "../../i18n/he";
import { blobToFile } from "../../utils/mediaCapture";
import { createHoldGesture } from "../../utils/holdGesture";
import type { MediaKind } from "../media/MediaCaptureActions";
import type { ChatMediaKind } from "../../utils/chatTransport";
import { CHAT_FILE_ACCEPT } from "../../utils/chatFile";
import ChatAudioDock from "./ChatAudioDock";
import ChatPhotoCapture from "./ChatPhotoCapture";

export default function ChatComposerBar({
  body,
  onBodyChange,
  sending,
  error,
  disabled = false,
  placeholder = he.taskChatPlaceholder,
  sendLabel = he.taskChatSend,
  onSendText,
  onSendMedia,
}: {
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  sendLabel?: string;
  onSendText: () => void;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
}) {
  const media = useChatComposerMedia(onSendMedia);
  const busy = disabled || sending;
  const shownError = error || media.mediaError;
  if (media.audioDock) {
    return (
      <Box display="flex" flexDirection="column" gap={1}>
        <ChatAudioDock
          audio={media.audio}
          sending={busy}
          onSend={() => void media.sendAudio()}
          onDelete={media.deleteAudio}
        />
        {shownError ? <Alert severity="error">{shownError}</Alert> : null}
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={1} position="relative">
      <Box display="flex" alignItems="flex-end" gap={0.75} dir="rtl">
        <IconButton
          aria-label={he.chatRecordAudio}
          color="primary"
          disabled={busy}
          onClick={media.startAudio}
          sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "divider" }}
        >
          <MicIcon />
        </IconButton>
        <Box display="flex" alignItems="flex-end" gap={0.75} flex={1} minWidth={0}>
          <TextField
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={placeholder}
            fullWidth
            multiline
            minRows={1}
            maxRows={4}
            disabled={busy}
          />
          <Button
            variant="contained"
            sx={{ minHeight: 48, minWidth: 72, fontWeight: 800, flexShrink: 0 }}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            onClick={onSendText}
            disabled={busy}
          >
            {sendLabel}
          </Button>
        </Box>
        <HoldIconButton
          label={he.chatCameraAction}
          recording={media.holdKind === "video"}
          disabled={busy}
          gesture={media.cameraHold}
        >
          {media.holdKind === "video" ? <VideocamIcon /> : <PhotoCameraIcon />}
        </HoldIconButton>
        <ChatFileAttach disabled={busy} onPick={(file) => void onSendMedia(file, "file")} />
      </Box>
      {media.holdKind ? (
        <Typography variant="caption" color="error.main">{he.chatRecordingHold}</Typography>
      ) : null}
      {shownError ? <Alert severity="error">{shownError}</Alert> : null}
      <Box
        component="video"
        ref={media.video.onVideoRef}
        muted
        playsInline
        sx={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      <ChatPhotoCapture
        open={media.photoOpen}
        uploading={sending}
        onClose={() => media.setPhotoOpen(false)}
        onSend={(file) => onSendMedia(file, "photo")}
      />
    </Box>
  );
}

function useChatComposerMedia(
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>,
) {
  const audio = useAudioRecorder();
  const video = useVideoRecorder({ defaultFacing: "environment" });
  const [photoOpen, setPhotoOpen] = useState(false);
  const [audioDock, setAudioDock] = useState(false);
  const [holdKind, setHoldKind] = useState<MediaKind | null>(null);
  const [mediaError, setMediaError] = useState("");
  const sendLock = useRef(false);
  const audioRef = useRef(audio);
  const videoRef = useRef(video);
  const sendRef = useRef(onSendMedia);
  audioRef.current = audio;
  videoRef.current = video;
  sendRef.current = onSendMedia;
  const cameraHold = useMemo(() => createHoldGesture({
    onTap: () => setPhotoOpen(true),
    onHoldStart: () => {
      setHoldKind("video");
      void startHoldVideo(videoRef.current);
    },
    onHoldEnd: () => void finishHoldVideo(videoRef.current, sendRef.current, () => setHoldKind(null)),
  }), []);
  return {
    audio,
    video,
    holdKind,
    photoOpen,
    setPhotoOpen,
    audioDock,
    cameraHold,
    mediaError,
    startAudio: () => {
      setMediaError("");
      setAudioDock(true);
      void audio.start();
    },
    deleteAudio: () => {
      audio.reset();
      setAudioDock(false);
    },
    sendAudio: () => sendComposerAudio({
      audio: audioRef.current,
      onSend: sendRef.current,
      sendLock,
      onEmpty: () => {
        setMediaError(he.chatAudioEmpty);
        audioRef.current.reset();
      },
      done: () => setAudioDock(false),
    }),
  };
}

function ChatFileAttach({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={CHAT_FILE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <IconButton
        aria-label={he.chatAttachFile}
        color="primary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "divider" }}
      >
        <AttachFileIcon />
      </IconButton>
    </>
  );
}

function HoldIconButton({
  label,
  recording,
  disabled,
  gesture,
  children,
}: {
  label: string;
  recording: boolean;
  disabled: boolean;
  gesture: ReturnType<typeof createHoldGesture>;
  children: ReactNode;
}) {
  return (
    <IconButton
      aria-label={label}
      color={recording ? "error" : "primary"}
      disabled={disabled}
      onPointerDown={gesture.onPointerDown}
      onPointerUp={gesture.onPointerUp}
      onPointerCancel={gesture.onPointerCancel}
      sx={{
        minWidth: 48,
        minHeight: 48,
        border: 1,
        borderColor: recording ? "error.main" : "divider",
        touchAction: "none",
      }}
    >
      {children}
    </IconButton>
  );
}

async function sendComposerAudio(opts: {
  audio: ReturnType<typeof useAudioRecorder>;
  onSend: (file: File, kind: MediaKind) => void | Promise<void>;
  sendLock: { current: boolean };
  onEmpty: () => void;
  done: () => void;
}) {
  if (opts.sendLock.current) return;
  opts.sendLock.current = true;
  try {
    const blob = await opts.audio.stopAndWait();
    if (!blob) {
      opts.onEmpty();
      return;
    }
    await opts.onSend(blobToFile(blob, `chat-audio-${Date.now()}.webm`, blob.type || "audio/webm"), "audio");
  } finally {
    opts.sendLock.current = false;
    opts.done();
  }
}

async function startHoldVideo(video: ReturnType<typeof useVideoRecorder>) {
  const ready = await video.startPreview();
  if (ready === "ready") video.startRecording();
}

async function finishHoldVideo(
  video: ReturnType<typeof useVideoRecorder>,
  onSend: (file: File, kind: MediaKind) => void | Promise<void>,
  done: () => void,
) {
  try {
    const blob = await video.stopAndWait();
    if (blob) await onSend(blobToFile(blob, `chat-video-${Date.now()}.webm`, blob.type || "video/webm"), "video");
  } finally {
    done();
  }
}
