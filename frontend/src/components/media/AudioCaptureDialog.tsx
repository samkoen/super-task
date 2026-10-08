import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import AppDialogTitle from "../ui/AppDialogTitle";
import {
  CaptureInstruction,
  RecordingClock,
  captureErrorMessage,
  useBlobPreviewUrl,
} from "./captureDialogShared";
import { he } from "../../i18n/he";
import { blobToFile } from "../../utils/mediaCapture";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import {
  EMPLOYEE_BRAND,
  employeeBigButtonSx,
  employeePrimaryButtonSx,
} from "../../styles/employeeUi";

type Recorder = ReturnType<typeof useAudioRecorder>;

function MicBadge({ recording }: { recording: boolean }) {
  const color = recording ? "#D32F2F" : EMPLOYEE_BRAND;
  return (
    <Box
      aria-hidden
      sx={{
        alignSelf: "center",
        width: 112,
        height: 112,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        color,
        bgcolor: alpha(color, 0.1),
        border: `3px solid ${alpha(color, 0.35)}`,
      }}
    >
      <MicIcon sx={{ fontSize: 56 }} />
    </Box>
  );
}

function AudioStatus({
  recording,
  hasPreview,
  elapsedSeconds,
}: {
  recording: boolean;
  hasPreview: boolean;
  elapsedSeconds: number;
}) {
  if (recording) {
    return (
      <>
        <RecordingClock elapsedSeconds={elapsedSeconds} />
        <CaptureInstruction tone="danger">{he.mediaCaptureAudioSpeaking}</CaptureInstruction>
      </>
    );
  }
  if (hasPreview) return <CaptureInstruction>{he.mediaCapturePreviewHint}</CaptureInstruction>;
  return <CaptureInstruction>{he.mediaCaptureAudioReady}</CaptureInstruction>;
}

function AudioActions({
  recorder,
  hasPreview,
  uploading,
  confirming,
  onClose,
  onConfirm,
}: {
  recorder: Recorder;
  hasPreview: boolean;
  uploading: boolean;
  confirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { supported, recording, error, start, stop, reset } = recorder;
  const busy = uploading || confirming;
  return (
    <DialogActions sx={dialogStackedActionsSx}>
      <Button onClick={onClose} disabled={busy || recording} sx={dialogSecondaryActionSx}>
        {he.cancel}
      </Button>
      {error && !hasPreview ? (
        <Button onClick={() => void start()} disabled={busy || recording} sx={dialogSecondaryActionSx}>
          {he.mediaCaptureRetry}
        </Button>
      ) : null}
      {hasPreview ? (
        <>
          <Button onClick={reset} disabled={busy} sx={dialogSecondaryActionSx}>
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
      ) : recording ? (
        <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={stop} sx={employeeBigButtonSx}>
          {he.mediaCaptureStop}
        </Button>
      ) : (
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <MicIcon />}
          onClick={() => void start()}
          disabled={!supported || uploading}
          sx={employeePrimaryButtonSx}
        >
          {uploading ? he.loading : he.mediaCaptureRecord}
        </Button>
      )}
    </DialogActions>
  );
}

function useAudioConfirm({
  blob,
  uploading,
  onCapture,
  onClose,
}: {
  blob: Blob | null;
  uploading: boolean;
  onCapture: (file: File) => void | Promise<void>;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const confirm = async () => {
    if (!blob || blob.size === 0 || uploading || confirming) return;
    setConfirming(true);
    try {
      await onCapture(blobToFile(blob, `task-audio-${Date.now()}.webm`, blob.type || "audio/webm"));
      onClose();
    } finally {
      setConfirming(false);
    }
  };
  return { confirming, confirm };
}

export default function AudioCaptureDialog({
  open,
  uploading,
  onClose,
  onCapture,
}: {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const recorder = useAudioRecorder();
  const { supported, recording, blob, error, elapsedSeconds, stop, reset } = recorder;
  const previewUrl = useBlobPreviewUrl(blob);
  const hasPreview = Boolean(blob && blob.size > 0 && previewUrl);
  const { confirming, confirm } = useAudioConfirm({ blob, uploading, onCapture, onClose });
  const errorText = captureErrorMessage(error);

  useEffect(() => {
    if (!open) {
      stop();
      reset();
    }
  }, [open, reset, stop]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth fullScreen={fullScreen} maxWidth="xs" dir="rtl" disableEnforceFocus>
      <AppDialogTitle
        title={he.mediaCaptureAudioTitle}
        onClose={onClose}
        closeDisabled={uploading || recording || confirming}
      />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, overflowY: "auto" }}>
        <MicBadge recording={recording} />
        <AudioStatus recording={recording} hasPreview={hasPreview} elapsedSeconds={elapsedSeconds} />
        {!supported && <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert>}
        {errorText && <Alert severity="warning">{errorText}</Alert>}
        {hasPreview && <Box component="audio" src={previewUrl ?? undefined} controls sx={{ width: "100%" }} />}
      </DialogContent>
      <AudioActions
        recorder={recorder}
        hasPreview={hasPreview}
        uploading={uploading}
        confirming={confirming}
        onClose={onClose}
        onConfirm={() => void confirm()}
      />
    </Dialog>
  );
}
