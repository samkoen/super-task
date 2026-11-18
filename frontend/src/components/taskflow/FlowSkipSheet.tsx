import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, Drawer, InputBase, Typography } from "@mui/material";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import closeIcon from "../../assets/flow1/icon-x.svg";
import micIcon from "../../assets/flow1/icon-mic.svg";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSize, flowText } from "../../styles/flowTokens";
import type { CompletionRequirement, SkipReasonCode } from "../../utils/completionMedia";
import { slotDisplayTitle } from "../../utils/completionSlotView";
import { blobToFile } from "../../utils/mediaCapture";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";
import { emptySkipDraft, isSkipDraftValid, SKIP_REASON_CODES, SKIP_TEXT_MAX, skipReasonLabel, type SkipDraft } from "../../utils/slotSkip";

type Props = {
  /** Carte à déclarer « לא ניתן לצלם » ; null = fermé. */
  req: CompletionRequirement | null;
  index: number;
  onClose: () => void;
  onConfirm: (index: number, draft: SkipDraft) => void;
};

const BUTTON_SX = { height: 56, borderRadius: `${flowRadius.sm}px`, ...flowText.button, fontSize: 18, fontWeight: 700 } as const;

function audioFile(blob: Blob): File {
  return blobToFile(blob, `skip-audio-${Date.now()}.webm`, blob.type || "audio/webm");
}

/** Enregistrement de l'explication vocale : un seul fichier gardé, envoyé au serveur avec le récap. */
function useSkipVoice() {
  const recorder = useAudioRecorder();
  const { reset, recording, stopAndWait, start, elapsedSeconds } = recorder;
  const [file, setFile] = useState<File | null>(null);
  /** Durée mesurée pendant l'enregistrement : un webm de MediaRecorder n'annonce souvent pas sa durée. */
  const [seconds, setSeconds] = useState(0);
  useEffect(() => () => reset(), [reset]);

  const keep = (blob: Blob | null) => {
    if (!blob) return null;
    const next = audioFile(blob);
    setSeconds(elapsedSeconds);
    setFile(next);
    return next;
  };
  const toggle = async () => {
    if (recording) {
      keep(await stopAndWait());
      return;
    }
    setFile(null);
    await start();
  };
  /** Appelé au clic sur « דיווח והמשך » : un enregistrement encore ouvert est arrêté et gardé. */
  const finish = async (): Promise<File | null> => {
    if (!recording) return file;
    return keep(await stopAndWait()) ?? file;
  };
  const remove = () => {
    setFile(null);
    setSeconds(0);
    reset();
  };
  return { recorder, file, seconds, toggle, finish, remove };
}

type Voice = ReturnType<typeof useSkipVoice>;

function ReasonChips({ value, onChange }: { value: SkipReasonCode | null; onChange: (code: SkipReasonCode) => void }) {
  return (
    <Box role="group" aria-label={he.flowSkipSheetTitle} sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {SKIP_REASON_CODES.map((code) => {
        const selected = value === code;
        return (
          <ButtonBase
            key={code}
            data-testid={`flow-skip-reason-${code}`}
            aria-pressed={selected}
            onClick={() => onChange(code)}
            sx={{
              height: 40,
              px: "16px",
              borderRadius: `${flowRadius.full}px`,
              border: `1px solid ${selected ? flowColor.neutral900 : flowColor.line}`,
              bgcolor: selected ? flowColor.neutral900 : flowColor.neutral0,
              color: selected ? flowColor.neutral0 : flowColor.neutral900,
              ...flowText.button,
            }}
          >
            {skipReasonLabel(code)}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** « 0:07 » : minutes sans zéro, secondes sur deux chiffres (Figma 05ה2/05ה3). */
function formatVoiceClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Hauteurs des 17 barres de l'onde dessinée dans le Figma. */
const WAVE_BARS = [8, 14, 20, 12, 18, 10, 16, 22, 12, 8, 14, 18, 10, 6, 12, 16, 8];
const WAVE_GREY = "#b2b8bf";

const waveKeyframes = {
  "@keyframes flowSkipWave": {
    "0%, 100%": { transform: "scaleY(0.35)" },
    "50%": { transform: "scaleY(1)" },
  },
};

/** Onde « vivante » pendant l'enregistrement : chaque barre respire avec un léger décalage. */
function LiveWave() {
  return (
    <Box aria-hidden data-testid="flow-skip-live-wave" sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "3px", overflow: "hidden", ...waveKeyframes }}>
      {WAVE_BARS.map((height, i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            height,
            flexShrink: 0,
            borderRadius: `${flowRadius.full}px`,
            bgcolor: flowColor.alphaNeutral900_60,
            animation: `flowSkipWave ${0.9 + (i % 4) * 0.15}s ease-in-out ${(i % 5) * 0.12}s infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
      ))}
    </Box>
  );
}

/** Onde de réécoute : la partie déjà jouée en foncé, depuis la droite (lecture RTL du Figma 05ה3). */
function PlaybackWave({ progress }: { progress: number }) {
  const count = WAVE_BARS.length;
  return (
    <Box aria-hidden sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "3px", overflow: "hidden" }}>
      {WAVE_BARS.map((height, i) => {
        const played = progress > 0 && (count - i) / count <= progress;
        return <Box key={i} sx={{ width: 3, height, flexShrink: 0, borderRadius: `${flowRadius.full}px`, bgcolor: played ? flowColor.neutral900 : WAVE_GREY, transition: "background-color 120ms linear" }} />;
      })}
    </Box>
  );
}

function DeleteVoice({ voice }: { voice: Voice }) {
  return (
    <ButtonBase data-testid="flow-skip-audio-delete" aria-label={he.flowSkipRecordDelete} onClick={voice.remove} sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: "50%" }}>
      <Box component="img" src={closeIcon} alt="" sx={{ width: 20, height: 20, opacity: 0.6 }} />
    </ButtonBase>
  );
}

/** Rangée commune des deux états (05ה2/05ה3), lue de gauche à droite comme dans le Figma. */
const VOICE_ROW_SX = { display: "flex", alignItems: "center", gap: "8px", minHeight: 44, pl: "4px", pr: "12px", py: "4px", borderRadius: `${flowRadius.full}px` } as const;

/** 05ה2 : bouton stop rouge, onde vivante, chrono avec point rouge, X pour jeter. */
function RecordingRow({ voice }: { voice: Voice }) {
  return (
    <Box dir="ltr" data-testid="flow-skip-recording" sx={VOICE_ROW_SX}>
      <ButtonBase
        data-testid="flow-skip-stop"
        aria-label={he.flowSkipRecordStop}
        onClick={() => void voice.toggle()}
        sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", bgcolor: flowColor.rec }}
      >
        <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: flowColor.neutral0 }} />
      </ButtonBase>
      <LiveWave />
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <Typography data-testid="flow-skip-timer" sx={{ ...flowText.body, fontWeight: 500, color: flowColor.neutral900 }}>
          {formatVoiceClock(voice.recorder.elapsedSeconds)}
        </Typography>
        <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: flowColor.rec }} />
      </Box>
      <DeleteVoice voice={voice} />
    </Box>
  );
}

function useAudioPlayback(file: File, fallbackSeconds: number) {
  const url = useMemo(() => (typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(fallbackSeconds);
  const readDuration = () => {
    const d = audioRef.current?.duration;
    if (d && Number.isFinite(d)) setDuration(d);
  };
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play()?.catch(() => setPlaying(false));
    else audio.pause();
  };
  const events = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => {
      setPlaying(false);
      setCurrent(0);
    },
    onTimeUpdate: () => setCurrent(audioRef.current?.currentTime ?? 0),
    onLoadedMetadata: readDuration,
    onDurationChange: readDuration,
  };
  return { url, audioRef, playing, current, duration, toggle, events };
}

/** 05ה3 : onde de réécoute, « 0:05 / 0:14 », lecture/pause noir, X pour jeter. */
function PlaybackRow({ voice, file }: { voice: Voice; file: File }) {
  const player = useAudioPlayback(file, voice.seconds);
  const progress = player.duration > 0 ? Math.min(1, player.current / player.duration) : 0;
  const Icon = player.playing ? PauseRoundedIcon : PlayArrowRoundedIcon;
  return (
    <Box dir="ltr" data-testid="flow-skip-recorded" aria-label={he.flowSkipRecorded} sx={VOICE_ROW_SX}>
      {player.url ? <Box component="audio" ref={player.audioRef} src={player.url} preload="metadata" data-testid="flow-skip-audio" sx={{ display: "none" }} {...player.events} /> : null}
      <PlaybackWave progress={progress} />
      <Typography data-testid="flow-skip-timer" sx={{ ...flowText.body, fontWeight: 500, color: flowColor.neutral900, flexShrink: 0 }}>
        {`${formatVoiceClock(player.current)} / ${formatVoiceClock(player.duration)}`}
      </Typography>
      <ButtonBase
        data-testid="flow-skip-play"
        aria-label={player.playing ? he.flowSkipPause : he.flowSkipPlay}
        aria-pressed={player.playing}
        onClick={player.toggle}
        sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: "50%", bgcolor: flowColor.neutral900, color: flowColor.neutral0 }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </ButtonBase>
      <DeleteVoice voice={voice} />
    </Box>
  );
}

/** Figma 05ד : « הקלטה קולית » puis le micro rond noir, en bas à gauche du champ. */
function MicButton({ voice }: { voice: Voice }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
      <Typography aria-hidden sx={{ ...flowText.label, color: flowColor.alphaNeutral900_66 }}>
        {he.flowSkipRecord}
      </Typography>
      <ButtonBase
        data-testid="flow-skip-mic"
        aria-label={he.flowSkipRecord}
        onClick={() => void voice.toggle()}
        sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", bgcolor: flowColor.neutral900 }}
      >
        <Box component="img" src={micIcon} alt="" sx={{ width: 18, height: 18, display: "block" }} />
      </ButtonBase>
    </Box>
  );
}

/** Micro au repos, enregistreur (05ה2), ou réécoute avant l'envoi (05ה3). */
function VoiceControls({ voice }: { voice: Voice }) {
  if (voice.recorder.recording) return <RecordingRow voice={voice} />;
  if (voice.file) return <PlaybackRow voice={voice} file={voice.file} />;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <MicButton voice={voice} />
      {voice.recorder.error ? (
        <Typography role="alert" data-testid="flow-skip-record-error" sx={{ ...flowText.label, color: flowColor.neutral900 }}>{he.flowSkipRecordFailed}</Typography>
      ) : null}
    </Box>
  );
}

function explanationPlaceholder(voice: Voice, required: boolean): string {
  if (voice.file && !voice.recorder.recording) return he.flowSkipTextPlaceholderVoice;
  return required ? he.flowSkipTextPlaceholderOther : he.flowSkipTextPlaceholder;
}

/** Champ gris (05ד) ; « אחר » (05ה) : bord foncé et pirus obligatoire annoncé dans le placeholder. */
function ExplanationBox({ text, onText, voice, required }: { text: string; onText: (value: string) => void; voice: Voice; required: boolean }) {
  const placeholder = explanationPlaceholder(voice, required);
  const hasVoice = Boolean(voice.file) || voice.recorder.recording;
  return (
    <Box
      data-testid="flow-skip-explanation"
      data-required={required ? "true" : "false"}
      sx={{ p: "12px 16px", gap: "8px", display: "flex", flexDirection: "column", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral100, border: `1.5px solid ${required ? flowColor.neutral900 : "transparent"}` }}
    >
      <InputBase
        multiline
        minRows={hasVoice ? 1 : 2}
        maxRows={4}
        value={text}
        onChange={(event) => onText(event.target.value)}
        placeholder={placeholder}
        inputProps={{ "data-testid": "flow-skip-text", maxLength: SKIP_TEXT_MAX, "aria-label": placeholder }}
        sx={{ ...flowText.body, color: flowColor.neutral900, "& textarea::placeholder": { color: flowColor.alphaNeutral900_60, opacity: 1 } }}
      />
      <VoiceControls voice={voice} />
    </Box>
  );
}

function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <Box sx={{ flex: 1 }}>
        <Typography component="h2" data-testid="flow-skip-heading" sx={{ ...flowText.h2, color: flowColor.navy800, textAlign: "right" }}>
          {title}
        </Typography>
        <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "right" }}>{subtitle}</Typography>
      </Box>
      <ButtonBase
        data-testid="flow-skip-x"
        aria-label={he.flowSkipClose}
        onClick={onClose}
        sx={{ width: 48, height: 48, borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.neutral0 }}
      >
        <Box component="img" src={closeIcon} alt="" sx={{ width: 24, height: 24 }} />
      </ButtonBase>
    </Box>
  );
}

/** Contenu monté seulement quand la feuille est ouverte : brouillon et enregistreur repartent de zéro à chaque ouverture. */
function SheetBody({ req, index, onClose, onConfirm }: Props & { req: CompletionRequirement }) {
  const [draft, setDraft] = useState<SkipDraft>(emptySkipDraft);
  const voice = useSkipVoice();
  const valid = isSkipDraftValid({ ...draft, audio: voice.file }) && !(draft.reasonCode === "other" && voice.recorder.recording);

  const confirm = async () => {
    const audio = await voice.finish();
    const next = { ...draft, audio };
    if (isSkipDraftValid(next)) onConfirm(index, next);
  };
  return (
    <>
      <SheetHeader title={he.flowSkipSheetTitle} subtitle={he.flowSkipSheetSubtitle(slotDisplayTitle(req, index))} onClose={onClose} />
      <ReasonChips value={draft.reasonCode} onChange={(reasonCode) => setDraft((d) => ({ ...d, reasonCode }))} />
      <ExplanationBox text={draft.reasonText} onText={(reasonText) => setDraft((d) => ({ ...d, reasonText }))} voice={voice} required={draft.reasonCode === "other"} />
      <ButtonBase
        data-testid="flow-skip-confirm"
        disabled={!valid}
        onClick={() => void confirm()}
        sx={{ ...BUTTON_SX, bgcolor: flowColor.neutral900, color: flowColor.neutral0, "&.Mui-disabled": { bgcolor: flowColor.alphaNeutral900_35, color: flowColor.neutral0 } }}
      >
        {he.flowSkipConfirm}
      </ButtonBase>
      <ButtonBase data-testid="flow-skip-later" onClick={onClose} sx={{ ...BUTTON_SX, height: 40, fontSize: 15, fontWeight: 600, color: flowColor.neutral900 }}>
        {he.flowSkipLater}
      </ButtonBase>
    </>
  );
}

/**
 * Écran 05ב : bottom sheet « מה מונע את הצילום? ». L'oved choisit une raison, peut l'écrire et/ou l'enregistrer
 * en vocal ; « אחר » exige un texte ou un vocal. « אצלם אחר כך » referme sans rien déclarer.
 */
export default function FlowSkipSheet({ req, index, onClose, onConfirm }: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={Boolean(req)}
      onClose={onClose}
      // L'écran de tâche est un Dialog plein écran (z-index « modal ») : un Drawer s'ouvrirait derrière.
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      PaperProps={{
        dir: "rtl",
        "aria-label": he.flowSkipSheetTitle,
        sx: {
          maxWidth: 393,
          mx: "auto",
          px: `${flowSize.contentPaddingX}px`,
          pt: "12px",
          pb: withSystemBottomInsetCss("24px"),
          gap: "16px",
          display: "flex",
          flexDirection: "column",
          bgcolor: flowColor.neutral0,
          borderRadius: `${flowRadius.xl2}px ${flowRadius.xl2}px 0 0`,
        },
      }}
    >
      <Box aria-hidden sx={{ alignSelf: "center", width: 40, height: 5, borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.line }} />
      {req ? <SheetBody req={req} index={index} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Drawer>
  );
}
