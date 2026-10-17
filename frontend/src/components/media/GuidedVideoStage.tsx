import { Alert, Box, Button, CircularProgress, LinearProgress } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import type { useVideoRecorder } from "../../hooks/useVideoRecorder";
import GuidedCameraStage from "./GuidedCameraStage";
import { CaptureInstruction, captureErrorMessage } from "./captureDialogShared";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx } from "../../styles/dialogUi";
import { videoRecordingProgress } from "../../utils/captureProgress";
import type { CaptureGuide } from "../../utils/captureGuide";

type Recorder = ReturnType<typeof useVideoRecorder>;

function VideoHint({
  recorder,
  minSeconds,
}: {
  recorder: Recorder;
  minSeconds: number | null;
}) {
  const { recording, elapsedSeconds, previewReady, supported } = recorder;
  const progress = videoRecordingProgress(elapsedSeconds, minSeconds);
  if (recording) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {minSeconds ? (
          <LinearProgress
            variant="determinate"
            value={progress.ratio * 100}
            color={progress.reached ? "success" : "error"}
            aria-label={he.mediaCaptureRecording}
            sx={{ height: 10, borderRadius: 5 }}
          />
        ) : null}
        <CaptureInstruction tone={progress.reached ? "success" : "default"}>
          {progress.reached ? he.mediaCaptureVideoEnough : he.mediaCaptureVideoKeepGoing(progress.remaining)}
        </CaptureInstruction>
      </Box>
    );
  }
  if (!previewReady || !supported) return null;
  return <CaptureInstruction>{he.mediaCaptureVideoReady(minSeconds)}</CaptureInstruction>;
}

function VideoNotices({ recorder }: { recorder: Recorder }) {
  const { supported, previewReady, starting, error, startPreview } = recorder;
  const errorText = captureErrorMessage(error);
  return (
    <>
      {!supported ? <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert> : null}
      {errorText ? <Alert severity="warning">{errorText}</Alert> : null}
      {starting ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      ) : null}
      {error || (!previewReady && !starting && supported) ? (
        <Button
          variant="outlined"
          startIcon={<VideocamIcon />}
          onClick={() => void startPreview()}
          sx={{ ...dialogSecondaryActionSx, minHeight: 56 }}
        >
          {error ? he.mediaCaptureRetry : he.mediaCaptureEnableCamera}
        </Button>
      ) : null}
    </>
  );
}

/** Écran caméra vidéo façon « story » : consigne du menahel, REC, déclencheur rouge. */
export default function GuidedVideoStage({
  recorder,
  guide,
  minSeconds,
  uploading,
  onClose,
}: {
  recorder: Recorder;
  guide: CaptureGuide;
  minSeconds: number | null;
  uploading: boolean;
  onClose: () => void;
}) {
  const { recording, previewReady, starting } = recorder;
  return (
    <GuidedCameraStage
      guide={guide}
      onVideoRef={recorder.onVideoRef}
      facing={recorder.facing}
      recordingSeconds={recording ? recorder.elapsedSeconds : null}
      shutter={{
        kind: "video",
        recording,
        busy: uploading,
        disabled: !recording && !previewReady,
        onPress: recording ? recorder.stopRecording : recorder.startRecording,
      }}
      onClose={onClose}
      closeDisabled={uploading || recording}
      onFlip={recorder.flip}
      flipDisabled={starting || recording}
      footer={
        <>
          <VideoHint recorder={recorder} minSeconds={minSeconds} />
          <VideoNotices recorder={recorder} />
        </>
      }
    />
  );
}
