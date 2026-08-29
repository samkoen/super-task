import { useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Box, Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
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
import ChatPhotoCapture from "./ChatPhotoCapture";
import { AudioFallbackDialog } from "./ChatAudioFallback";

export default function ChatComposerBar({
  body,
  onBodyChange,
  sending,
  error,
  disabled = false,
  onSendText,
  onSendMedia,
}: {
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  error?: string;
  disabled?: boolean;
  onSendText: () => void;
  onSendMedia: (file: File, kind: MediaKind) => void | Promise<void>;
}) {
  const media = useChatComposerMedia(onSendMedia);
  const busy = disabled || sending;

  return (
    <Box display="flex" flexDirection="column" gap={1} position="relative">
      <Box display="flex" alignItems="flex-end" gap={0.75} dir="rtl">
        <HoldIconButton
          label={he.chatHoldToRecord}
          recording={media.holdKind === "audio"}
          disabled={busy}
          gesture={media.audioHold}
        >
          <MicIcon />
        </HoldIconButton>
        <Box display="flex" alignItems="flex-end" gap={0.75} flex={1} minWidth={0}>
          <TextField
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={he.taskChatPlaceholder}
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
            {he.taskChatSend}
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
      </Box>
      {media.holdKind ? (
        <Typography variant="caption" color="error.main">{he.chatRecordingHold}</Typography>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
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
      <AudioFallbackDialog
        open={media.audioOpen}
        uploading={sending}
        onClose={() => media.setAudioOpen(false)}
        onSend={(file) => onSendMedia(file, "audio")}
      />
    </Box>
  );
}

function useChatComposerMedia(
  onSendMedia: (file: File, kind: MediaKind) => void | Promise<void>,
) {
  const audio = useAudioRecorder();
  const video = useVideoRecorder({ defaultFacing: "environment" });
  const [photoOpen, setPhotoOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [holdKind, setHoldKind] = useState<MediaKind | null>(null);
  const audioRef = useRef(audio);
  const videoRef = useRef(video);
  const sendRef = useRef(onSendMedia);
  audioRef.current = audio;
  videoRef.current = video;
  sendRef.current = onSendMedia;
  const audioHold = useMemo(() => createHoldGesture({
    onTap: () => setAudioOpen(true),
    onHoldStart: () => {
      setHoldKind("audio");
      void audioRef.current.start();
    },
    onHoldEnd: () => void finishHoldAudio(audioRef.current, sendRef.current, () => setHoldKind(null)),
  }), []);
  const cameraHold = useMemo(() => createHoldGesture({
    onTap: () => setPhotoOpen(true),
    onHoldStart: () => {
      setHoldKind("video");
      void startHoldVideo(videoRef.current);
    },
    onHoldEnd: () => void finishHoldVideo(videoRef.current, sendRef.current, () => setHoldKind(null)),
  }), []);
  return { video, holdKind, photoOpen, setPhotoOpen, audioOpen, setAudioOpen, audioHold, cameraHold };
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

async function finishHoldAudio(
  audio: ReturnType<typeof useAudioRecorder>,
  onSend: (file: File, kind: MediaKind) => void | Promise<void>,
  done: () => void,
) {
  try {
    const blob = await audio.stopAndWait();
    if (blob) await onSend(blobToFile(blob, `chat-audio-${Date.now()}.webm`, blob.type || "audio/webm"), "audio");
  } finally {
    done();
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
