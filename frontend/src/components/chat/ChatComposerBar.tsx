import { useRef, useState } from "react";
import { Alert, Box, CircularProgress, IconButton, TextField } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import MicIcon from "@mui/icons-material/Mic";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SendIcon from "@mui/icons-material/Send";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { he } from "../../i18n/he";
import { blobToFile } from "../../utils/mediaCapture";
import type { MediaKind } from "../media/MediaCaptureActions";
import type { ChatMediaKind } from "../../utils/chatTransport";
import { CHAT_FILE_ACCEPT } from "../../utils/chatFile";
import ChatAudioDock from "./ChatAudioDock";
import ChatPhotoCapture from "./ChatPhotoCapture";

export function isComposerExpanded(focused: boolean, body: string): boolean {
  return focused || Boolean(body.trim());
}

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
  const [focused, setFocused] = useState(false);
  const busy = disabled || sending;
  const shownError = error || media.mediaError;
  const expanded = isComposerExpanded(focused, body);
  if (media.audioDock) {
    return (
      <DockedAudioBar
        audio={media.audio}
        busy={busy}
        error={shownError}
        onSend={() => void media.sendAudio()}
        onDelete={media.deleteAudio}
      />
    );
  }
  return (
    <IdleComposer
      body={body}
      expanded={expanded}
      busy={busy}
      sending={sending}
      shownError={shownError}
      placeholder={placeholder}
      sendLabel={sendLabel}
      media={media}
      onBodyChange={onBodyChange}
      onSendText={onSendText}
      onSendMedia={onSendMedia}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function DockedAudioBar({
  audio,
  busy,
  error,
  onSend,
  onDelete,
}: {
  audio: ReturnType<typeof useAudioRecorder>;
  busy: boolean;
  error?: string;
  onSend: () => void;
  onDelete: () => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <ChatAudioDock audio={audio} sending={busy} onSend={onSend} onDelete={onDelete} />
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Box>
  );
}

function IdleComposer({
  body,
  expanded,
  busy,
  sending,
  shownError,
  placeholder,
  sendLabel,
  media,
  onBodyChange,
  onSendText,
  onSendMedia,
  onFocus,
  onBlur,
}: {
  body: string;
  expanded: boolean;
  busy: boolean;
  sending: boolean;
  shownError?: string;
  placeholder: string;
  sendLabel: string;
  media: ReturnType<typeof useChatComposerMedia>;
  onBodyChange: (value: string) => void;
  onSendText: () => void;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1} position="relative">
      <ComposerRow
        body={body}
        expanded={expanded}
        busy={busy}
        sending={sending}
        placeholder={placeholder}
        sendLabel={sendLabel}
        media={media}
        onBodyChange={onBodyChange}
        onSendText={onSendText}
        onSendMedia={onSendMedia}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {shownError ? <Alert severity="error">{shownError}</Alert> : null}
      <ChatPhotoCapture
        open={media.photoOpen}
        uploading={sending}
        onClose={() => media.setPhotoOpen(false)}
        onSend={(file, kind = "photo") => onSendMedia(file, kind)}
      />
    </Box>
  );
}

function ComposerRow({
  body,
  expanded,
  busy,
  sending,
  placeholder,
  sendLabel,
  media,
  onBodyChange,
  onSendText,
  onSendMedia,
  onFocus,
  onBlur,
}: {
  body: string;
  expanded: boolean;
  busy: boolean;
  sending: boolean;
  placeholder: string;
  sendLabel: string;
  media: ReturnType<typeof useChatComposerMedia>;
  onBodyChange: (value: string) => void;
  onSendText: () => void;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <Box display="flex" alignItems="flex-end" gap={0.75} dir="rtl">
      {expanded ? null : <MicStartButton busy={busy} onStart={media.startAudio} />}
      <Box display="flex" alignItems="flex-end" gap={0.75} flex={1} minWidth={0}>
        <TextField
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          disabled={busy}
        />
        <SendTextButton sendLabel={sendLabel} sending={sending} disabled={busy} onSend={onSendText} />
      </Box>
      {expanded ? null : <IdleMediaEnd busy={busy} media={media} onSendMedia={onSendMedia} />}
    </Box>
  );
}

function MicStartButton({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  return (
    <IconButton
      aria-label={he.chatRecordAudio}
      color="primary"
      disabled={busy}
      onClick={onStart}
      sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "divider" }}
    >
      <MicIcon />
    </IconButton>
  );
}

function IdleMediaEnd({
  busy,
  media,
  onSendMedia,
}: {
  busy: boolean;
  media: ReturnType<typeof useChatComposerMedia>;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
}) {
  return (
    <>
      <IconButton
        aria-label={he.chatCameraAction}
        color="primary"
        disabled={busy}
        onClick={media.openCamera}
        sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "divider" }}
      >
        <PhotoCameraIcon />
      </IconButton>
      <ChatFileAttach disabled={busy} onPick={(file) => void onSendMedia(file, "file")} />
    </>
  );
}

function SendTextButton({
  sendLabel,
  sending,
  disabled,
  onSend,
}: {
  sendLabel: string;
  sending: boolean;
  disabled: boolean;
  onSend: () => void;
}) {
  return (
    <IconButton
      type="button"
      aria-label={sendLabel}
      color="primary"
      disabled={disabled}
      onClick={onSend}
      sx={{
        minWidth: 48,
        minHeight: 48,
        flexShrink: 0,
        borderRadius: "50%",
        bgcolor: "primary.main",
        color: "primary.contrastText",
        "&:hover": { bgcolor: "primary.dark" },
        "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
      }}
    >
      {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ transform: "scaleX(-1)" }} />}
    </IconButton>
  );
}

function useChatComposerMedia(
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>,
) {
  const audio = useAudioRecorder();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [audioDock, setAudioDock] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const refs = useComposerSendRefs(audio, onSendMedia);
  return {
    audio,
    photoOpen,
    setPhotoOpen,
    audioDock,
    mediaError,
    openCamera: () => {
      setMediaError("");
      setPhotoOpen(true);
    },
    ...composerAudioActions(audio, refs, setAudioDock, setMediaError),
  };
}

function useComposerSendRefs(
  audio: ReturnType<typeof useAudioRecorder>,
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>,
) {
  const sendLock = useRef(false);
  const audioRef = useRef(audio);
  const sendRef = useRef(onSendMedia);
  audioRef.current = audio;
  sendRef.current = onSendMedia;
  return { sendLock, audioRef, sendRef };
}

function composerAudioActions(
  audio: ReturnType<typeof useAudioRecorder>,
  refs: ReturnType<typeof useComposerSendRefs>,
  setAudioDock: (open: boolean) => void,
  setMediaError: (message: string) => void,
) {
  return {
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
      audio: refs.audioRef.current,
      onSend: refs.sendRef.current,
      sendLock: refs.sendLock,
      onEmpty: () => {
        setMediaError(he.chatAudioEmpty);
        refs.audioRef.current.reset();
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
