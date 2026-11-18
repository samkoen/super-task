import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MicNoneRoundedIcon from "@mui/icons-material/MicNoneRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ChatPhotoCapture from "../chat/ChatPhotoCapture";
import sendIcon from "../../assets/flow1/chat-send.svg";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowShadow, flowText } from "../../styles/flowTokens";
import type { ChatMediaKind } from "../../utils/chatTransport";
import { formatRecordingClock } from "../../utils/captureProgress";
import { blobToFile } from "../../utils/mediaCapture";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";

type Props = {
  /** « כתבו הודעה על סרטון בסטה... » */
  placeholder: string;
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
};

/** Hauteurs des barres de l'onde (décoratives, comme dans le Figma). */
const WAVE = [6, 12, 18, 10, 22, 14, 8, 16, 24, 12, 18, 8, 14, 20, 10, 6];

/** Message vocal : enregistrement, écoute avant l'envoi, annulation. */
function useChatVoice() {
  const recorder = useAudioRecorder();
  const { reset, recording, stopAndWait, start } = recorder;
  const [file, setFile] = useState<File | null>(null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => () => reset(), [reset]);

  const stop = async () => {
    const elapsed = recorder.elapsedSeconds;
    const blob = await stopAndWait();
    if (blob) {
      setSeconds(elapsed);
      setFile(blobToFile(blob, `chat-audio-${Date.now()}.webm`, blob.type || "audio/webm"));
    }
  };
  const cancel = () => {
    setFile(null);
    reset();
  };
  return { recording, elapsed: recorder.elapsedSeconds, error: recorder.error, file, seconds, start: () => void start(), stop: () => void stop(), cancel };
}

type Voice = ReturnType<typeof useChatVoice>;

/** Rond de 36 à gauche du champ : envoi (noir) ou arrêt de l'enregistrement (rouge). */
function RoundAction({ testId, label, color, disabled, onClick, children }: {
  testId: string;
  label: string;
  color: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <ButtonBase
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      sx={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", bgcolor: color, color: flowColor.neutral0, "&.Mui-disabled": { opacity: 0.4 } }}
    >
      {children}
    </ButtonBase>
  );
}

function SendIcon() {
  return <Box component="img" src={sendIcon} alt="" sx={{ width: 16, height: 16, display: "block" }} />;
}

function Wave() {
  return (
    <Box aria-hidden sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "3px", overflow: "hidden" }}>
      {WAVE.map((h, i) => (
        <Box key={i} sx={{ flexShrink: 0, width: 2.5, height: h, borderRadius: 2, bgcolor: flowColor.alphaNeutral900_66 }} />
      ))}
    </Box>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase aria-label={he.flowChatVoiceCancel} data-testid="flow-chat-voice-cancel" onClick={onClick} sx={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%" }}>
      <CloseRoundedIcon sx={{ fontSize: 20, color: flowColor.alphaNeutral900_66 }} />
    </ButtonBase>
  );
}

function PlayButton({ file }: { file: File }) {
  const url = useMemo(() => (typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : ""), [file]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play?.();
  };
  return (
    <>
      <Box component="audio" ref={audio} src={url || undefined} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} sx={{ display: "none" }} />
      <ButtonBase aria-label={playing ? he.flowChatVoicePause : he.flowChatVoicePlay} data-testid="flow-chat-voice-play" onClick={toggle} sx={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%" }}>
        {playing ? <PauseRoundedIcon sx={{ fontSize: 18, color: flowColor.neutral900 }} /> : <PlayArrowRoundedIcon sx={{ fontSize: 18, color: flowColor.neutral900 }} />}
      </ButtonBase>
    </>
  );
}

const clockSx = { ...flowText.button, color: flowColor.neutral900, fontVariantNumeric: "tabular-nums", direction: "ltr" } as const;

/** Écran 12ב2 : enregistrement en cours (arrêt rouge, onde, chrono, point rouge, X). */
function RecordingRow({ voice }: { voice: Voice }) {
  return (
    <>
      <CancelButton onClick={voice.cancel} />
      <Box aria-hidden sx={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", bgcolor: flowColor.rec }} />
      <Typography role="timer" data-testid="flow-chat-voice-clock" sx={clockSx}>{formatRecordingClock(voice.elapsed)}</Typography>
      <Wave />
      <RoundAction testId="flow-chat-voice-stop" label={he.flowSkipRecordStop} color={flowColor.rec} onClick={voice.stop}>
        <StopRoundedIcon sx={{ fontSize: 18 }} />
      </RoundAction>
    </>
  );
}

/** Écran 12ב3 : enregistrement prêt (X, écoute, durée, onde, envoi). */
function RecordedRow({ voice, file, sending, onSend }: { voice: Voice; file: File; sending: boolean; onSend: () => void }) {
  return (
    <>
      <CancelButton onClick={voice.cancel} />
      <PlayButton file={file} />
      <Typography data-testid="flow-chat-voice-clock" sx={clockSx}>{formatRecordingClock(voice.seconds)}</Typography>
      <Wave />
      <RoundAction testId="flow-chat-send" label={he.flowChatSend} color={flowColor.neutral900} disabled={sending} onClick={onSend}>
        <SendIcon />
      </RoundAction>
    </>
  );
}

type TextRowProps = Pick<Props, "body" | "onBodyChange" | "placeholder"> & { busy: boolean; canSend: boolean; onSend: () => void; onCamera: () => void; onMic: () => void };

/** Écrans 12ב / 12ב4 : caméra à droite, champ, micro (vide) ou envoi (texte saisi) à gauche. */
function TextRow({ body, onBodyChange, placeholder, busy, canSend, onSend, onCamera, onMic }: TextRowProps) {
  const typed = Boolean(body.trim());
  return (
    <>
      <ButtonBase aria-label={he.flowChatCamera} data-testid="flow-chat-camera" disabled={busy} onClick={onCamera} sx={{ flexShrink: 0, "&.Mui-disabled": { opacity: 0.4 } }}>
        <VideocamOutlinedIcon sx={{ fontSize: 24, color: flowColor.neutral900 }} />
      </ButtonBase>
      <InputBase
        fullWidth
        value={body}
        disabled={busy}
        placeholder={placeholder}
        inputProps={{ "aria-label": placeholder, "data-testid": "flow-chat-input", maxLength: 2000 }}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
        sx={{ ...flowText.body, p: 0, color: flowColor.neutral900, "& input::placeholder": { color: flowColor.alphaNeutral900_66, opacity: 1 } }}
      />
      {typed ? (
        <RoundAction testId="flow-chat-send" label={he.flowChatSend} color={flowColor.neutral900} disabled={!canSend} onClick={onSend}>
          <SendIcon />
        </RoundAction>
      ) : (
        <ButtonBase aria-label={he.flowSkipRecord} data-testid="flow-chat-mic" disabled={busy} onClick={onMic} sx={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", "&.Mui-disabled": { opacity: 0.4 } }}>
          <MicNoneRoundedIcon sx={{ fontSize: 24, color: flowColor.neutral900 }} />
        </ButtonBase>
      )}
    </>
  );
}

/**
 * Zone de saisie du chat d'une sous-tâche (écrans 12ב → 12ב4) : un seul champ arrondi avec la caméra
 * à droite ; à gauche le micro, qui devient l'envoi dès qu'il y a un texte ou un vocal prêt.
 */
export default function FlowChatComposer(props: Props) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const voice = useChatVoice();
  const canSend = Boolean(props.body.trim()) && !props.sending;
  const sendVoice = async () => {
    if (!voice.file) return;
    const file = voice.file;
    voice.cancel();
    await props.onSendMedia(file, "audio");
  };
  const error = props.error || (voice.error ? he.flowSkipRecordFailed : "");
  return (
    <Box
      data-testid="flow-chat-composer"
      sx={{ display: "flex", flexDirection: "column", gap: "10px", px: "16px", pt: "12px", pb: withSystemBottomInsetCss("16px"), bgcolor: flowColor.neutral0, borderRadius: "24px 24px 0 0", boxShadow: flowShadow.floating }}
    >
      {error ? (
        <Typography role="alert" sx={{ ...flowText.caption, color: "#b3261e" }}>{error}</Typography>
      ) : null}
      <Box sx={{ height: 52, display: "flex", alignItems: "center", gap: "10px", pr: "16px", pl: "8px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral100 }}>
        {voice.recording ? (
          <RecordingRow voice={voice} />
        ) : voice.file ? (
          <RecordedRow voice={voice} file={voice.file} sending={props.sending} onSend={() => void sendVoice()} />
        ) : (
          <TextRow
            body={props.body}
            onBodyChange={props.onBodyChange}
            placeholder={props.placeholder}
            busy={props.sending}
            canSend={canSend}
            onSend={props.onSend}
            onCamera={() => setPhotoOpen(true)}
            onMic={voice.start}
          />
        )}
      </Box>
      <ChatPhotoCapture
        open={photoOpen}
        uploading={props.sending}
        onClose={() => setPhotoOpen(false)}
        onSend={(file, kind = "photo") => props.onSendMedia(file, kind)}
      />
    </Box>
  );
}
