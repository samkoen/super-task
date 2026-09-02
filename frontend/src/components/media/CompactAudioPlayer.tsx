import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { he } from "../../i18n/he";
import { formatAudioElapsed } from "../../utils/formatAudioElapsed";

export const COMPACT_AUDIO_HEIGHT = 32;

export const compactAudioPlayerSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  height: COMPACT_AUDIO_HEIGHT,
  minHeight: COMPACT_AUDIO_HEIGHT,
  maxHeight: COMPACT_AUDIO_HEIGHT,
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
  bgcolor: "transparent",
  color: "inherit",
} as const;

export default function CompactAudioPlayer({ src }: { src: string }) {
  const audio = useOffDomAudio(src);
  return (
    <Box data-testid="compact-audio-player" sx={compactAudioPlayerSx}>
      <IconButton
        size="small"
        color="inherit"
        aria-label={audio.playing ? he.chatAudioPause : he.chatAudioPlay}
        onClick={() => toggleCompactAudio(audio.ref.current, audio.playing, audio.setPlaying)}
        sx={{ width: 28, height: 28, color: "inherit" }}
      >
        {audio.playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>
      <Box sx={{ flex: 1, height: 2, bgcolor: "currentColor", opacity: 0.35, borderRadius: 1 }} />
      <Typography variant="body2" sx={{ color: "inherit", fontVariantNumeric: "tabular-nums" }}>
        {formatAudioElapsed(audio.elapsed)}
      </Typography>
    </Box>
  );
}

function useOffDomAudio(src: string) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const el = new Audio(src);
    el.preload = "metadata";
    ref.current = el;
    const onTime = () => setElapsed(safeAudioSeconds(el.currentTime));
    const onEnded = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      try {
        el.pause();
      } catch {
        /* jsdom has no media pipeline */
      }
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      ref.current = null;
    };
  }, [src]);

  return { ref, playing, setPlaying, elapsed };
}

function safeAudioSeconds(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function toggleCompactAudio(
  node: HTMLAudioElement | null,
  playing: boolean,
  setPlaying: (value: boolean) => void,
) {
  if (!node) return;
  if (playing) {
    node.pause();
    setPlaying(false);
    return;
  }
  void node.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
}
