import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { he } from "../../i18n/he";
import { blobToFile } from "../../utils/mediaCapture";
import { dialogActionsPbCss } from "../../utils/systemInsets";

export function AudioFallbackDialog({
  open,
  uploading,
  onClose,
  onSend,
}: {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onSend: (file: File) => void | Promise<void>;
}) {
  const { supported, recording, blob, error, start, stop, reset } = useAudioRecorder();
  const [sending, setSending] = useState(false);
  const previewUrl = blob && blob.size > 0 ? URL.createObjectURL(blob) : null;

  useEffect(() => {
    if (!open) {
      stop();
      reset();
    }
  }, [open, reset, stop]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.chatAudioButtons}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        {!supported ? <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert> : null}
        {error ? <Alert severity="warning">{he.mediaCapturePermission}</Alert> : null}
        {recording ? (
          <Typography color="error">{he.mediaCaptureRecording}</Typography>
        ) : null}
        {previewUrl ? <Box component="audio" src={previewUrl} controls sx={{ width: "100%" }} /> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={recording || uploading || sending}>{he.cancel}</Button>
        {previewUrl ? (
          <Button onClick={reset} disabled={uploading || sending}>{he.chatAudioDiscard}</Button>
        ) : recording ? (
          <Button color="error" startIcon={<StopIcon />} onClick={stop}>{he.mediaCaptureStop}</Button>
        ) : (
          <Button variant="outlined" startIcon={<MicIcon />} onClick={() => void start()} disabled={!supported}>
            {he.chatAudioStart}
          </Button>
        )}
        <Button
          variant="contained"
          disabled={!blob || uploading || sending}
          startIcon={sending || uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={() => void sendFallbackAudio(blob, onSend, onClose, setSending)}
        >
          {he.taskChatSend}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

async function sendFallbackAudio(
  blob: Blob | null,
  onSend: (file: File) => void | Promise<void>,
  onClose: () => void,
  setSending: (v: boolean) => void,
) {
  if (!blob || blob.size === 0) return;
  setSending(true);
  try {
    await onSend(blobToFile(blob, `chat-audio-${Date.now()}.webm`, blob.type || "audio/webm"));
    onClose();
  } finally {
    setSending(false);
  }
}
