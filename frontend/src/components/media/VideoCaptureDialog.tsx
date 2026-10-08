import { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import StopIcon from "@mui/icons-material/Stop";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useVideoRecorder } from "../../hooks/useVideoRecorder";
import CameraFacingPreview from "./CameraFacingPreview";
import AppDialogTitle from "../ui/AppDialogTitle";
import {
  CaptureInstruction,
  RecordingClock,
  captureErrorMessage,
  recordingFrameSx,
  scheduleAfterDialogPaint,
  useBlobPreviewUrl,
} from "./captureDialogShared";
import { he } from "../../i18n/he";
import { blobToFile } from "../../utils/mediaCapture";
import { snapshotMediaFile } from "../../utils/videoUpload";
import { videoRecordingProgress } from "../../utils/captureProgress";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { employeeBigButtonSx, employeePrimaryButtonSx } from "../../styles/employeeUi";

type Recorder = ReturnType<typeof useVideoRecorder>;

function useRecordedVideoRef(previewUrl: string | null) {
  return useCallback(
    (node: HTMLVideoElement | null) => {
      if (!node) return;
      node.srcObject = null;
      if (previewUrl) {
        node.src = previewUrl;
        node.load();
      }
    },
    [previewUrl],
  );
}

function RecordingInstruction({
  minSeconds,
  elapsedSeconds,
}: {
  minSeconds: number | null;
  elapsedSeconds: number;
}) {
  const progress = videoRecordingProgress(elapsedSeconds, minSeconds);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <RecordingClock elapsedSeconds={elapsedSeconds} />
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
        {progress.reached
          ? he.mediaCaptureVideoEnough
          : he.mediaCaptureVideoKeepGoing(progress.remaining)}
      </CaptureInstruction>
    </Box>
  );
}

function VideoInstruction({
  recording,
  hasPreview,
  tooShort,
  ready,
  minSeconds,
  elapsedSeconds,
}: {
  recording: boolean;
  hasPreview: boolean;
  tooShort: boolean;
  ready: boolean;
  minSeconds: number | null;
  elapsedSeconds: number;
}) {
  if (recording) return <RecordingInstruction minSeconds={minSeconds} elapsedSeconds={elapsedSeconds} />;
  if (hasPreview) return tooShort ? null : <CaptureInstruction>{he.mediaCapturePreviewHint}</CaptureInstruction>;
  if (!ready) return null;
  return <CaptureInstruction>{he.mediaCaptureVideoReady(minSeconds)}</CaptureInstruction>;
}

function VideoStage({
  recorder,
  previewUrl,
  hasPreview,
}: {
  recorder: Recorder;
  previewUrl: string | null;
  hasPreview: boolean;
}) {
  const onRecordedVideoRef = useRecordedVideoRef(previewUrl);
  if (hasPreview) {
    return (
      <Box
        key="recorded-preview"
        component="video"
        ref={onRecordedVideoRef}
        controls
        playsInline
        sx={{
          width: "100%",
          borderRadius: "14px",
          bgcolor: "black",
          minHeight: 200,
          maxHeight: "45vh",
          objectFit: "contain",
        }}
      />
    );
  }
  return (
    <Box sx={recordingFrameSx(recorder.recording)}>
      <CameraFacingPreview
        onVideoRef={recorder.onVideoRef}
        facing={recorder.facing}
        onFlip={recorder.flip}
        flipDisabled={recorder.starting || recorder.recording}
      />
    </Box>
  );
}

type ActionsProps = {
  recorder: Recorder;
  hasPreview: boolean;
  uploading: boolean;
  confirming: boolean;
  tooShort: boolean;
  onClose: () => void;
  onRetry: () => void;
  onConfirm: () => void;
};

function PreviewActions({ uploading, confirming, tooShort, onRetry, onConfirm }: ActionsProps) {
  const busy = uploading || confirming;
  if (tooShort) {
    return (
      <Button variant="contained" onClick={onRetry} disabled={busy} sx={employeePrimaryButtonSx}>
        {he.mediaCaptureRetry}
      </Button>
    );
  }
  return (
    <>
      <Button onClick={onRetry} disabled={busy} sx={dialogSecondaryActionSx}>
        {he.mediaCaptureRetry}
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        disabled={busy}
        startIcon={busy ? <CircularProgress size={20} color="inherit" /> : undefined}
        sx={employeePrimaryButtonSx}
      >
        {busy ? he.loading : he.mediaCaptureUseRecording}
      </Button>
    </>
  );
}

function RecordActions({ recorder, uploading }: { recorder: Recorder; uploading: boolean }) {
  const { recording, previewReady, startRecording, stopRecording } = recorder;
  if (recording) {
    return (
      <Button
        variant="contained"
        color="error"
        startIcon={<StopIcon />}
        onClick={stopRecording}
        sx={employeeBigButtonSx}
      >
        {he.mediaCaptureStop}
      </Button>
    );
  }
  return (
    <Button
      variant="contained"
      startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <VideocamIcon />}
      onClick={startRecording}
      disabled={!previewReady || uploading}
      sx={employeePrimaryButtonSx}
    >
      {uploading ? he.loading : he.mediaCaptureRecord}
    </Button>
  );
}

function VideoActions(props: ActionsProps) {
  const { recorder, hasPreview, uploading, confirming, onClose } = props;
  const busy = uploading || confirming;
  const showRetry = Boolean(recorder.error) && !hasPreview;
  return (
    <DialogActions sx={dialogStackedActionsSx}>
      <Button onClick={onClose} disabled={busy || recorder.recording} sx={dialogSecondaryActionSx}>
        {he.cancel}
      </Button>
      {showRetry ? (
        <Button
          onClick={() => void recorder.startPreview()}
          disabled={busy || recorder.recording}
          sx={dialogSecondaryActionSx}
        >
          {he.mediaCaptureRetry}
        </Button>
      ) : null}
      {hasPreview ? <PreviewActions {...props} /> : <RecordActions recorder={recorder} uploading={uploading} />}
    </DialogActions>
  );
}

function useVideoConfirm({
  recorder,
  uploading,
  tooShort,
  onCapture,
  onClose,
}: {
  recorder: Recorder;
  uploading: boolean;
  tooShort: boolean;
  onCapture: (file: File, durationSeconds: number) => void | Promise<void>;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { blob, elapsedSeconds } = recorder;
  const confirm = async () => {
    if (!blob || blob.size === 0 || uploading || confirming || tooShort) return;
    setConfirming(true);
    try {
      const type = (blob.type || "video/webm").split(";")[0].trim() || "video/webm";
      const file = blobToFile(blob, `task-video-${Date.now()}.webm`, type);
      const frozen = await snapshotMediaFile(file);
      await onCapture(frozen, elapsedSeconds);
      onClose();
    } finally {
      setConfirming(false);
    }
  };
  return { confirming, confirm };
}

function VideoDialogBody({
  recorder,
  previewUrl,
  hasPreview,
  tooShort,
  minSeconds,
}: {
  recorder: Recorder;
  previewUrl: string | null;
  hasPreview: boolean;
  tooShort: boolean;
  minSeconds: number | null;
}) {
  const { supported, previewReady, starting, recording, elapsedSeconds, error, startPreview } = recorder;
  const errorText = captureErrorMessage(error);
  return (
    <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, overflowY: "auto" }}>
      <VideoInstruction
        recording={recording}
        hasPreview={hasPreview}
        tooShort={tooShort}
        ready={previewReady && supported}
        minSeconds={minSeconds}
        elapsedSeconds={elapsedSeconds}
      />
      <VideoStage recorder={recorder} previewUrl={previewUrl} hasPreview={hasPreview} />
      {!supported && <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert>}
      {errorText && <Alert severity="warning">{errorText}</Alert>}
      {hasPreview && tooShort && minSeconds ? (
        <Alert severity="warning">{he.videoTooShort(minSeconds)}</Alert>
      ) : null}
      {starting && (
        <Box display="flex" justifyContent="center" py={1}>
          <CircularProgress size={28} />
        </Box>
      )}
      {!hasPreview && !previewReady && !starting && !error && supported && (
        <Box display="flex" flexDirection="column" gap={1.5} alignItems="stretch">
          <CaptureInstruction>{he.mediaCaptureEnableHint}</CaptureInstruction>
          <Button
            variant="outlined"
            startIcon={<VideocamIcon />}
            onClick={() => void startPreview()}
            sx={{ ...dialogSecondaryActionSx, minHeight: 56 }}
          >
            {he.mediaCaptureEnableCamera}
          </Button>
        </Box>
      )}
    </DialogContent>
  );
}

export default function VideoCaptureDialog({
  open,
  uploading,
  recorder,
  minSeconds,
  onClose,
  onCapture,
}: {
  open: boolean;
  uploading: boolean;
  recorder: Recorder;
  minSeconds: number | null;
  onClose: () => void;
  onCapture: (file: File, durationSeconds: number) => void | Promise<void>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { recording, blob, elapsedSeconds, startPreview, reset } = recorder;
  const previewUrl = useBlobPreviewUrl(blob);
  const hasPreview = Boolean(blob && blob.size > 0 && previewUrl);
  const tooShort = Boolean(minSeconds && elapsedSeconds < minSeconds);
  const { confirming, confirm } = useVideoConfirm({ recorder, uploading, tooShort, onCapture, onClose });

  const handleRetry = () => {
    reset();
    scheduleAfterDialogPaint(() => {
      void startPreview();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth fullScreen={fullScreen} maxWidth="xs" dir="rtl" disableEnforceFocus>
      <AppDialogTitle
        title={he.mediaCaptureVideoTitle}
        onClose={onClose}
        closeDisabled={uploading || recording || confirming}
      />
      <VideoDialogBody
        recorder={recorder}
        previewUrl={previewUrl}
        hasPreview={hasPreview}
        tooShort={tooShort}
        minSeconds={minSeconds}
      />
      <VideoActions
        recorder={recorder}
        hasPreview={hasPreview}
        uploading={uploading}
        confirming={confirming}
        tooShort={tooShort}
        onClose={onClose}
        onRetry={handleRetry}
        onConfirm={() => void confirm()}
      />
    </Dialog>
  );
}
