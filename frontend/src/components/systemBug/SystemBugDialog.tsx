import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { he } from "../../i18n/he";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { submitSystemBug } from "../../services/systemBugService";
import { ApiError } from "../../services/api";

const AUDIO_MAX_MS = 30_000;

export type SystemBugDialogProps = {
  open: boolean;
  screenshot: Blob | null;
  route: string;
  trail: string[];
  appVersion: string;
  preview: string;
  branchName: string;
  onClose: () => void;
  onSent: () => void;
  onError: (message: string) => void;
};

export default function SystemBugDialog(props: SystemBugDialogProps) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const audio = useAudioRecorder();

  useEffect(() => {
    if (props.open) return;
    setNote("");
    audio.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when dialog closes
  }, [props.open]);

  useEffect(() => {
    if (!audio.recording) return;
    const timer = window.setTimeout(() => audio.stop(), AUDIO_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [audio.recording, audio.stop]);

  return (
    <Dialog open={props.open} onClose={sending ? undefined : props.onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.systemBug}</DialogTitle>
      <DialogContent>
        <SystemBugFields
          note={note}
          setNote={setNote}
          screenshot={props.screenshot}
          sending={sending}
          recording={audio.recording}
          hasAudio={Boolean(audio.blob)}
          canRecord={audio.supported}
          onToggleRecord={() => (audio.recording ? audio.stop() : void audio.start())}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={sending}>
          {he.close}
        </Button>
        <Button
          variant="contained"
          disabled={sending}
          onClick={() => void sendSystemBug({ ...props, note, sending, setSending, audioBlob: audio.blob })}
        >
          {sending ? <CircularProgress size={22} color="inherit" /> : he.systemBugSend}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SystemBugFields({
  note,
  setNote,
  screenshot,
  sending,
  recording,
  hasAudio,
  canRecord,
  onToggleRecord,
}: {
  note: string;
  setNote: (value: string) => void;
  screenshot: Blob | null;
  sending: boolean;
  recording: boolean;
  hasAudio: boolean;
  canRecord: boolean;
  onToggleRecord: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!screenshot) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);
  return (
    <>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {he.systemBugHint}
      </Typography>
      {previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt=""
          sx={{ width: "100%", maxHeight: 180, objectFit: "contain", mb: 1.5, borderRadius: 1 }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          {he.systemBugCaptureFailed}
        </Typography>
      )}
      <TextField
        label={he.systemBugNote}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        disabled={sending}
      />
      <Box mt={1.5}>
        <Button
          variant="outlined"
          onClick={onToggleRecord}
          startIcon={recording ? <StopIcon /> : <MicIcon />}
          disabled={sending || !canRecord}
        >
          {recording ? he.systemBugStop : he.systemBugRecord}
        </Button>
        {hasAudio ? (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
            {he.systemBugAudioReady}
          </Typography>
        ) : null}
      </Box>
    </>
  );
}

async function sendSystemBug(
  args: SystemBugDialogProps & {
    note: string;
    sending: boolean;
    setSending: (v: boolean) => void;
    audioBlob: Blob | null;
  },
) {
  if (args.sending) return;
  if (!args.note.trim() && !args.audioBlob) {
    args.onError(he.systemBugNeedExplain);
    return;
  }
  args.setSending(true);
  try {
    await submitSystemBug({
      note: args.note.trim(),
      route: args.route,
      trail: args.trail,
      appVersion: args.appVersion,
      preview: args.preview,
      branchName: args.branchName,
      screenshot: args.screenshot,
      audio: args.audioBlob,
    });
    args.onSent();
    args.onClose();
  } catch (e) {
    args.onError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setSending(false);
  }
}
