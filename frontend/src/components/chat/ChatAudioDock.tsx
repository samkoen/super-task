import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, IconButton, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SendIcon from "@mui/icons-material/Send";
import { he } from "../../i18n/he";
import { formatAudioElapsed } from "../../utils/formatAudioElapsed";
import type { useAudioRecorder } from "../../hooks/useAudioRecorder";

type AudioRecorder = ReturnType<typeof useAudioRecorder>;

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
      <Box display="flex" alignItems="center" gap={1}>
        <ChatAudioPlay audio={audio} disabled={sending} />
        <Typography variant="h6" fontWeight={800} sx={{ minWidth: 56, fontVariantNumeric: "tabular-nums" }}>
          {formatAudioElapsed(audio.elapsedSeconds)}
        </Typography>
        {audio.paused ? null : (
          <Typography variant="body2" color="error.main">{he.mediaCaptureRecording}</Typography>
        )}
      </Box>
      <ChatAudioDockActions audio={audio} sending={sending} onSend={onSend} onDelete={onDelete} />
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
    <Box display="flex" alignItems="center" justifyContent="space-around" gap={1}>
      <IconButton
        color="primary"
        aria-label={he.chatAudioSend}
        disabled={sending || Boolean(audio.error)}
        onClick={onSend}
        sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "primary.main" }}
      >
        <SendIcon />
      </IconButton>
      <Button
        variant="outlined"
        disabled={sending || !audio.recording}
        onClick={() => (audio.paused ? audio.resume() : audio.pause())}
        sx={{ minHeight: 48, fontWeight: 800, px: 2 }}
      >
        {audio.paused ? he.chatAudioResume : he.chatAudioPause}
      </Button>
      <IconButton
        color="error"
        aria-label={he.chatAudioDiscard}
        disabled={sending}
        onClick={onDelete}
        sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "error.main" }}
      >
        <DeleteOutlineIcon />
      </IconButton>
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
        sx={{ minWidth: 48, minHeight: 48, border: 1, borderColor: "divider" }}
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
