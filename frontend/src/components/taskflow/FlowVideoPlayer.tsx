import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import playIcon from "../../assets/flow1/icon-play-dark.svg";
import handleIcon from "../../assets/flow1/scrub-handle.svg";
import { he } from "../../i18n/he";
import { useTrimMode } from "../../hooks/useTrimMode";
import { flowColor, flowText } from "../../styles/flowTokens";
import { formatRecordingClock } from "../../utils/captureProgress";
import { playbackRatio, playerTotalSeconds, seekRatioFromPointer, type PlaybackSpeed } from "../../utils/flowPlayer";
import { keptSeconds, playbackWindowStep, type TrimRange } from "../../utils/flowTrim";
import FlowSpeedToggle from "./FlowSpeedToggle";
import { TrimActions, TrimBusy, TrimButton, TrimScrubber } from "./FlowTrimControls";

type Props = {
  src: string | null | undefined;
  /** Durée mesurée à l'enregistrement (les fichiers MediaRecorder n'annoncent pas la leur). */
  durationSeconds: number | null | undefined;
  /** Découpe la vidéo sur la portion choisie ; sans elle, le bouton « חיתוך » n'est pas proposé. */
  onTrim?: (range: TrimRange) => Promise<unknown>;
  /** Vrai tant que la découpe réécrit le fichier : la confirmation doit attendre. */
  onTrimActivity?: (busy: boolean) => void;
};

/** Les .webm de MediaRecorder annoncent une durée infinie : on force le navigateur à la calculer. */
function resolveInfiniteDuration(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration)) return;
  const restore = () => {
    video.removeEventListener("timeupdate", restore);
    video.currentTime = 0;
  };
  video.addEventListener("timeupdate", restore);
  video.currentTime = 1e101;
}

function PlayButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={he.flowPlayerPlay}
      data-testid="flow-player-play"
      onClick={onClick}
      sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 64, height: 64, borderRadius: "32px", bgcolor: flowColor.neutral0 }}
    >
      <Box component="img" src={playIcon} alt="" sx={{ width: 28, height: 28, display: "block" }} />
    </ButtonBase>
  );
}

/** Barre de lecture : le remplissage part de la droite, la poignée suit. */
function Scrubber({ ratio, onSeek }: { ratio: number; onSeek: (ratio: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const seek = (event: PointerEvent) => {
    const rect = track.current?.getBoundingClientRect();
    if (rect) onSeek(seekRatioFromPointer(event.clientX, rect));
  };
  return (
    <Box
      ref={track}
      role="slider"
      aria-label={he.flowPlayerSeek}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      data-testid="flow-player-scrubber"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        seek(event);
      }}
      onPointerMove={(event) => event.buttons === 1 && seek(event)}
      sx={{ position: "relative", height: 14, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none" }}
    >
      <Box sx={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: "2px", bgcolor: flowColor.neutral0, opacity: 0.5 }} />
      <Box data-testid="flow-player-progress" sx={{ position: "absolute", right: 0, height: 4, borderRadius: "2px", bgcolor: flowColor.neutral0, width: `${ratio * 100}%` }} />
      <Box component="img" src={handleIcon} alt="" sx={{ position: "absolute", width: 14, height: 14, right: `calc(${ratio * 100}% - 7px)`, pointerEvents: "none" }} />
    </Box>
  );
}

function Times({ current, total }: { current: number; total: number }) {
  return (
    <Box dir="ltr" sx={{ display: "flex", justifyContent: "space-between", ...flowText.caption, color: flowColor.neutral0 }}>
      <Typography component="span" data-testid="flow-player-total" sx={{ ...flowText.caption }}>{formatRecordingClock(total)}</Typography>
      <Typography component="span" data-testid="flow-player-current" sx={{ ...flowText.caption }}>{formatRecordingClock(current)}</Typography>
    </Box>
  );
}

/** Pendant la découpe : fin à gauche, début à droite, durée gardée au milieu. */
function TrimTimes({ range }: { range: TrimRange }) {
  return (
    <Box dir="ltr" sx={{ display: "flex", justifyContent: "space-between", ...flowText.caption, color: flowColor.neutral0 }}>
      <Typography component="span" data-testid="flow-trim-end-time" sx={{ ...flowText.caption }}>{formatRecordingClock(range.end)}</Typography>
      <Typography component="span" data-testid="flow-trim-kept" sx={{ ...flowText.caption }}>{he.flowTrimKept(keptSeconds(range))}</Typography>
      <Typography component="span" data-testid="flow-trim-start-time" sx={{ ...flowText.caption }}>{formatRecordingClock(range.start)}</Typography>
    </Box>
  );
}

/** Vitesse de lecture à droite ; à gauche le bouton « חיתוך » du Figma (ou ses deux actions pendant la découpe). */
function TopRow({ trim, speed, onSpeed }: { trim: ReturnType<typeof useTrimMode>; speed: PlaybackSpeed; onSpeed: (s: PlaybackSpeed) => void }) {
  return (
    <>
      <Box sx={{ position: "absolute", top: 16, left: 16 }}>
        {trim.range ? (
          <TrimActions canApply={trim.canApply} busy={trim.busy} onApply={() => void trim.apply()} onCancel={trim.cancel} />
        ) : trim.available ? (
          <TrimButton onClick={trim.begin} />
        ) : null}
      </Box>
      <Box sx={{ position: "absolute", top: 12, right: 12 }}>
        <FlowSpeedToggle speed={speed} onChoose={onSpeed} />
      </Box>
    </>
  );
}

/** Figma « video-player » (345 × 372, rayon 24) : vidéo filmée, bouton de lecture, barre, temps et découpe. */
export default function FlowVideoPlayer({ src, durationSeconds, onTrim, onTrimActivity }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const total = playerTotalSeconds(durationSeconds, mediaDuration);
  const trim = useTrimMode({ total, src, onTrim });
  const { range } = trim;
  useEffect(() => {
    onTrimActivity?.(trim.busy);
    return () => onTrimActivity?.(false);
  }, [trim.busy, onTrimActivity]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = speed;
  }, [speed, src]);

  const seekSeconds = (seconds: number) => {
    if (video.current) video.current.currentTime = seconds;
  };

  const toggle = () => {
    const element = video.current;
    if (!element || trim.busy) return;
    if (!element.paused) return element.pause();
    if (range && playbackWindowStep(element.currentTime, range) === "restart") element.currentTime = range.start;
    void element.play();
  };

  const onTimeUpdate = (element: HTMLVideoElement) => {
    if (element.currentTime >= 1e6) return;
    setCurrent(element.currentTime);
    if (range && playbackWindowStep(element.currentTime, range) === "restart" && !element.paused) {
      element.pause();
      element.currentTime = range.start;
    }
  };

  return (
    <Box
      data-testid="flow-player"
      sx={{ position: "relative", width: "100%", height: 372, flexShrink: 0, overflow: "hidden", borderRadius: "24px", bgcolor: flowColor.navy800, display: "flex", flexDirection: "column", justifyContent: "flex-end", boxSizing: "border-box", px: "16px", pb: "14px" }}
    >
      <Box
        component="video"
        ref={video}
        data-testid="flow-review-video"
        src={src ? `${src}#t=0.001` : undefined}
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => onTimeUpdate(event.currentTarget)}
        onLoadedMetadata={(event) => {
          setMediaDuration(event.currentTarget.duration);
          resolveInfiniteDuration(event.currentTarget);
        }}
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Box aria-hidden sx={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(18,33,64,0), rgba(18,33,64,0.75))" }} />
      <TopRow trim={trim} speed={speed} onSpeed={setSpeed} />
      {playing || trim.busy ? null : <PlayButton onClick={toggle} />}
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: "5px" }}>
        {trim.error ? <Typography role="alert" sx={{ ...flowText.caption, color: flowColor.neutral0, textAlign: "center" }}>{trim.error}</Typography> : null}
        {range ? (
          <TrimScrubber
            range={range}
            total={total}
            onChange={(next, handle) => {
              trim.setRange(next);
              seekSeconds(handle === "start" ? next.start : next.end);
            }}
          />
        ) : (
          <Scrubber ratio={playbackRatio(current, total)} onSeek={(next) => total > 0 && seekSeconds(next * total)} />
        )}
        {range ? <TrimTimes range={range} /> : <Times current={current} total={total} />}
      </Box>
      {trim.busy ? <TrimBusy /> : null}
    </Box>
  );
}
