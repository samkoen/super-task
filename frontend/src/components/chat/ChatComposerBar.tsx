import { useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton, TextField, alpha } from "@mui/material";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_GRADIENT, EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";
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
    <Box display="flex" flexDirection="column" gap={1} dir="rtl">
      <Box display="flex" alignItems="flex-end" gap={1}>
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
          sx={composerFieldSx}
        />
        <SendTextButton sendLabel={sendLabel} sending={sending} disabled={busy} onSend={onSendText} />
      </Box>
      {expanded ? null : <MediaActionRow busy={busy} media={media} onSendMedia={onSendMedia} />}
    </Box>
  );
}

const composerFieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: EMPLOYEE_TOUCH_MIN,
    borderRadius: "28px",
    fontSize: "1.05rem",
    bgcolor: "background.paper",
  },
} as const;

const mediaButtonSx = {
  flex: 1,
  minHeight: EMPLOYEE_TOUCH_MIN,
  minWidth: 0,
  px: 1,
  borderRadius: "16px",
  fontSize: "1rem",
  fontWeight: 800,
  color: EMPLOYEE_BRAND,
  bgcolor: alpha(EMPLOYEE_BRAND, 0.1),
  "&:hover": { bgcolor: alpha(EMPLOYEE_BRAND, 0.18) },
  "&.Mui-disabled": { opacity: 0.5 },
} as const;

/** Trois grandes actions avec icône ET texte : micro, caméra, fichier. */
function MediaActionRow({
  busy,
  media,
  onSendMedia,
}: {
  busy: boolean;
  media: ReturnType<typeof useChatComposerMedia>;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
}) {
  return (
    <Box display="flex" gap={1}>
      <Button
        aria-label={he.chatRecordAudio}
        disabled={busy}
        onClick={media.startAudio}
        startIcon={<MicIcon />}
        sx={mediaButtonSx}
      >
        {he.chatRecordAudio}
      </Button>
      <Button
        aria-label={he.chatCameraAction}
        disabled={busy}
        onClick={media.openCamera}
        startIcon={<PhotoCameraIcon />}
        sx={mediaButtonSx}
      >
        {he.chatCameraAction}
      </Button>
      <ChatFileAttach disabled={busy} onPick={(file) => void onSendMedia(file, "file")} />
    </Box>
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
        minWidth: EMPLOYEE_TOUCH_MIN,
        minHeight: EMPLOYEE_TOUCH_MIN,
        flexShrink: 0,
        borderRadius: "50%",
        background: EMPLOYEE_BRAND_GRADIENT,
        color: "#fff",
        "&:hover": { background: EMPLOYEE_BRAND_GRADIENT, filter: "brightness(0.95)" },
        "&.Mui-disabled": { background: "none", bgcolor: "action.disabledBackground", color: "action.disabled" },
      }}
    >
      {sending ? <CircularProgress size={22} color="inherit" /> : <SendIcon sx={{ transform: "scaleX(-1)" }} />}
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
      <Button
        aria-label={he.chatAttachFile}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        startIcon={<AttachFileIcon />}
        sx={mediaButtonSx}
      >
        {he.chatAttachShort}
      </Button>
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
