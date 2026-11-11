import { useEffect } from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import flashIcon from "../../assets/flow1/icon-flash.svg";
import helpIcon from "../../assets/flow1/icon-help.svg";
import FlowPageHeader from "./FlowPageHeader";
import {
  CameraHint,
  DarkIconButton,
  MotionWarning,
  RecordButton,
  RecordingTimer,
  ScanFrame,
} from "./FlowCameraParts";
import { captureErrorMessage } from "../media/captureDialogShared";
import { useCameraTools } from "../../hooks/useCameraTools";
import { requestMotionPermission, useFastMotion } from "../../hooks/useFastMotion";
import type { useVideoRecorder } from "../../hooks/useVideoRecorder";
import { he } from "../../i18n/he";
import { flowColor, flowRadius } from "../../styles/flowTokens";
import type { CaptureGuide } from "../../utils/captureGuide";
import { formatRecordingClock } from "../../utils/captureProgress";
import { durationLine, shouldAutoStop } from "../../utils/flowCamera";

type Recorder = ReturnType<typeof useVideoRecorder>;

type Props = {
  recorder: Recorder;
  guide: CaptureGuide;
  minSeconds: number | null;
  /** La vidéo est finie et part vers l'écran de revue. */
  handingOver: boolean;
  onClose: () => void;
};

function hintText(guide: CaptureGuide, minSeconds: number | null): string {
  const line = durationLine(minSeconds, { between: he.flowCameraHintBetween, upTo: he.flowCameraHintUpTo });
  return [guide.hint?.trim(), line].filter(Boolean).join("\n");
}

/** Message au centre du viseur : appareil non supporté, refus d'accès, démarrage. */
function CameraNotice({ recorder }: { recorder: Recorder }) {
  const { supported, previewReady, starting, error, startPreview } = recorder;
  const errorText = captureErrorMessage(error);
  const needsStart = Boolean(error) || (!previewReady && !starting && supported);
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, px: 3, direction: "rtl" }}>
      {!supported ? <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert> : null}
      {errorText ? <Alert severity="warning">{errorText}</Alert> : null}
      {starting ? <CircularProgress size={28} sx={{ color: flowColor.neutral0 }} /> : null}
      {needsStart && supported ? (
        <Button variant="contained" startIcon={<VideocamIcon />} onClick={() => void startPreview()}>
          {error ? he.mediaCaptureRetry : he.mediaCaptureEnableCamera}
        </Button>
      ) : null}
    </Box>
  );
}

function Tools({ recorder, guide, minSeconds, tools }: {
  recorder: Recorder;
  guide: CaptureGuide;
  minSeconds: number | null;
  tools: ReturnType<typeof useCameraTools>;
}) {
  const { recording, elapsedSeconds } = recorder;
  return (
    <Box data-testid="flow-camera-tools" sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", opacity: recording ? 1 : 0.8 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <DarkIconButton label={he.flowCameraFlash} icon={flashIcon} active={tools.torchOn} disabled={!tools.torchAvailable} onClick={() => void tools.toggleTorch()} />
        <DarkIconButton label={he.flowCameraHelp} icon={helpIcon} disabled={!guide.onHelp} onClick={guide.onHelp} />
        {recording ? <RecordingTimer clock={formatRecordingClock(elapsedSeconds)} /> : null}
      </Box>
      {recording ? null : <CameraHint text={hintText(guide, minSeconds)} />}
    </Box>
  );
}

function Controls({ recorder, minSeconds, disabled }: {
  recorder: Recorder;
  minSeconds: number | null;
  disabled: boolean;
}) {
  const { recording, elapsedSeconds, previewReady, startRecording, stopRecording } = recorder;
  const press = () => {
    if (recording) return stopRecording();
    void requestMotionPermission();
    startRecording();
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
      <RecordButton recording={recording} elapsed={elapsedSeconds} minSeconds={minSeconds} disabled={disabled || (!recording && !previewReady)} onPress={press} />
    </Box>
  );
}

function Viewport({ recorder, guide, minSeconds, handingOver }: Omit<Props, "onClose">) {
  const tools = useCameraTools(recorder.stream);
  const fast = useFastMotion(recorder.recording);
  return (
    <Box
      data-testid="flow-camera-viewport"
      sx={{ position: "relative", direction: "ltr", flex: 1, minHeight: 280, display: "flex", flexDirection: "column", gap: "8px", boxSizing: "border-box", overflow: "hidden", borderRadius: `${flowRadius.md}px`, bgcolor: flowColor.navy800, pt: "22px", pb: "28px", pl: "21px", pr: "20px" }}
    >
      <Box
        component="video"
        ref={recorder.onVideoRef}
        playsInline
        autoPlay
        muted
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: recorder.facing === "user" ? "scaleX(-1)" : "none" }}
      />
      <Box aria-hidden sx={{ position: "absolute", left: 0, right: 0, bottom: "-2px", height: 153, background: "linear-gradient(to bottom, rgba(18,34,63,0), rgba(18,34,63,0.7))" }} />
      <ScanFrame recording={recorder.recording} />
      {!recorder.previewReady && !recorder.recording ? <CameraNotice recorder={recorder} /> : null}
      <Box sx={{ position: "relative" }}>
        <Tools recorder={recorder} guide={guide} minSeconds={minSeconds} tools={tools} />
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: recorder.recording ? "96px" : 0 }}>
        {recorder.recording && fast ? <MotionWarning /> : null}
        <Controls recorder={recorder} minSeconds={minSeconds} disabled={handingOver} />
      </Box>
      {handingOver ? <HandingOver /> : null}
    </Box>
  );
}

function HandingOver() {
  return (
    <Box
      data-testid="flow-camera-handover"
      sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: flowColor.alphaNavy800_72 }}
    >
      <CircularProgress size={32} aria-label={he.flowCameraSending} sx={{ color: flowColor.neutral0 }} />
    </Box>
  );
}

/** Écrans 06 et 07 : caméra avant l'enregistrement, puis enregistrement avec chrono, alerte de mouvement et anneau. */
export default function FlowVideoCamera(props: Props) {
  const { recorder, guide, minSeconds, handingOver, onClose } = props;
  const { recording, elapsedSeconds, stopRecording } = recorder;

  useEffect(() => {
    if (recording && shouldAutoStop(elapsedSeconds, minSeconds)) stopRecording();
  }, [recording, elapsedSeconds, minSeconds, stopRecording]);

  return (
    <Box
      data-testid="flow-video-camera"
      sx={{ width: "100%", maxWidth: 393, mx: "auto", flex: 1, minHeight: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "30px", px: "24px", pt: "calc(38px + env(safe-area-inset-top, 0px))", pb: "calc(21px + env(safe-area-inset-bottom, 0px))" }}
    >
      <FlowPageHeader title={guide.title} progress={guide.progress} onBack={onClose} backDisabled={recording || handingOver} />
      <Viewport recorder={recorder} guide={guide} minSeconds={minSeconds} handingOver={handingOver} />
    </Box>
  );
}
