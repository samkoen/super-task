import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, IconButton, Typography, alpha } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SendIcon from "@mui/icons-material/Send";
import { he } from "../../i18n/he";
import { formatAudioElapsed } from "../../utils/formatAudioElapsed";
import type { useAudioRecorder } from "../../hooks/useAudioRecorder";

import {
  EMPLOYEE_BRAND,
  EMPLOYEE_TOUCH_MIN,
  employeePrimaryButtonSx,
} from "../../styles/employeeUi";

type AudioRecorder = ReturnType<typeof useAudioRecorder>;

const secondaryActionSx = { minHeight: 52, borderRadius: "14px", fontWeight: 800, fontSize: "1rem" } as const;

export default function ChatAudioDock({
  audio,
  sending,
  onSend,
  onDelete,
}: {
  audio: AudioRecorder;
  sending: boolean;
  onSend: () => void;
  onDelete: () => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1} dir="rtl">
      {audio.error ? <Alert severity="warning">{he.mediaCapturePermission}</Alert> : null}
      <Box display="flex" alignItems="center" gap={1.5}>
        <ChatAudioPlay audio={audio} disabled={sending} />
        <Typography
          fontWeight={800}
          sx={{ minWidth: 72, fontSize: "1.75rem", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
        >
          {formatAudioElapsed(audio.elapsedSeconds)}
        </Typography>
        {audio.paused ? null : <RecordingBadge />}
      </Box>
      <ChatAudioDockActions audio={audio} sending={sending} onSend={onSend} onDelete={onDelete} />
    </Box>
  );
}

function RecordingBadge() {
  return (
    <Box display="flex" alignItems="center" gap={0.75} color="error.main">
      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "error.main" }} />
      <Typography fontWeight={800} sx={{ fontSize: "1rem", color: "inherit" }}>
        {he.mediaCaptureRecording}
      </Typography>
    </Box>
  );
}

function ChatAudioDockActions({
  audio,
  sending,
  onSend,
  onDelete,
}: {
  audio: AudioRecorder;
  sending: boolean;
  onSend: () => void;
  onDelete: () => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Button
        variant="contained"
        fullWidth
        aria-label={he.chatAudioSend}
        disabled={sending || Boolean(audio.error)}
        onClick={onSend}
        startIcon={<SendIcon sx={{ transform: "scaleX(-1)" }} />}
        sx={employeePrimaryButtonSx}
      >
        {he.chatAudioSend}
      </Button>
      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          disabled={sending || !audio.recording}
          onClick={() => (audio.paused ? audio.resume() : audio.pause())}
          sx={{ ...secondaryActionSx, flex: 1 }}
        >
          {audio.paused ? he.chatAudioResume : he.chatAudioPause}
        </Button>
        <Button
          variant="outlined"
          color="error"
          aria-label={he.chatAudioDiscard}
          disabled={sending}
          onClick={onDelete}
          startIcon={<DeleteOutlineIcon />}
          sx={{ ...secondaryActionSx, flex: 1 }}
        >
          {he.chatAudioDiscard}
        </Button>
      </Box>
    </Box>
  );
}

function ChatAudioPlay({ audio, disabled }: { audio: AudioRecorder; disabled: boolean }) {
  const player = usePreviewPlayer(audio.blob);
  useEffect(() => {
    if (audio.paused) return;
    player.ref.current?.pause();
    player.setPlaying(false);
  }, [audio.paused, player]);
  return (
    <>
      <IconButton
        aria-label={he.chatAudioPlay}
        disabled={disabled}
        onClick={() => toggleChatAudioPlay(audio, player)}
        sx={{
          minWidth: EMPLOYEE_TOUCH_MIN,
          minHeight: EMPLOYEE_TOUCH_MIN,
          color: EMPLOYEE_BRAND,
          bgcolor: alpha(EMPLOYEE_BRAND, 0.1),
          "&:hover": { bgcolor: alpha(EMPLOYEE_BRAND, 0.18) },
        }}
      >
        {player.playing ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      {player.url ? (
        <Box
          component="audio"
          ref={player.ref}
          src={player.url}
          onEnded={() => player.setPlaying(false)}
          sx={{ display: "none" }}
        />
      ) : null}
    </>
  );
}

function usePreviewPlayer(blob: Blob | null) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const url = useMemo(
    () => (blob && blob.size > 0 ? URL.createObjectURL(blob) : null),
    [blob],
  );
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  useEffect(() => {
    setPlaying(false);
  }, [url]);
  return { ref, url, playing, setPlaying };
}

function toggleChatAudioPlay(
  audio: AudioRecorder,
  player: ReturnType<typeof usePreviewPlayer>,
) {
  if (audio.recording && !audio.paused) {
    audio.pause();
    return;
  }
  const node = player.ref.current;
  if (!node || !player.url) return;
  if (player.playing) {
    node.pause();
    player.setPlaying(false);
    return;
  }
  void node.play().then(() => player.setPlaying(true));
}
