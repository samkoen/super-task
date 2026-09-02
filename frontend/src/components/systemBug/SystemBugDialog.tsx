import { useEffect, useRef, useState, type RefObject } from "react";
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
import PhotoAnnotationCanvas, {
  type PhotoAnnotationCanvasHandle,
} from "../media/PhotoAnnotationCanvas";

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
  const annotateRef = useRef<PhotoAnnotationCanvasHandle | null>(null);

  useEffect(() => {
    if (props.open) return;
    setNote("");
    audio.reset();
  }, [props.open, audio.reset]);

  useEffect(() => {
    if (!audio.recording) return;
    const timer = window.setTimeout(() => audio.stop(), AUDIO_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [audio.recording, audio.stop]);

  return (
    <Dialog
      open={props.open}
      onClose={sending ? undefined : props.onClose}
      fullWidth
      maxWidth="md"
      dir="rtl"
      disableEnforceFocus
    >
      <DialogTitle data-system-bug-dialog="">{he.systemBug}</DialogTitle>
      <DialogContent sx={{ overflowY: "auto" }}>
        <SystemBugFields
          note={note}
          setNote={setNote}
          screenshot={props.screenshot}
          annotateRef={annotateRef}
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
          onClick={() =>
            void sendSystemBug({
              ...props,
              note,
              sending,
              setSending,
              audioBlob: audio.blob,
              recording: audio.recording,
              stopAndWait: audio.stopAndWait,
              annotate: annotateRef.current,
            })
          }
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
  annotateRef,
  sending,
  recording,
  hasAudio,
  canRecord,
  onToggleRecord,
}: {
  note: string;
  setNote: (value: string) => void;
  screenshot: Blob | null;
  annotateRef: RefObject<PhotoAnnotationCanvasHandle | null>;
  sending: boolean;
  recording: boolean;
  hasAudio: boolean;
  canRecord: boolean;
  onToggleRecord: () => void;
}) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {he.systemBugHint}
      </Typography>
      <SystemBugScreenshot screenshot={screenshot} annotateRef={annotateRef} />
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

function SystemBugScreenshot({
  screenshot,
  annotateRef,
}: {
  screenshot: Blob | null;
  annotateRef: RefObject<PhotoAnnotationCanvasHandle | null>;
}) {
  if (!screenshot) {
    return (
      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
        {he.systemBugCaptureFailed}
      </Typography>
    );
  }
  return (
    <Box mb={1.5}>
      <PhotoAnnotationCanvas
        ref={annotateRef}
        imageBlob={screenshot}
        hint={he.systemBugAnnotateHint}
      />
    </Box>
  );
}

export async function resolveSystemBugAudio(audio: {
  recording: boolean;
  blob: Blob | null;
  stopAndWait: () => Promise<Blob | null>;
}): Promise<Blob | null> {
  if (!audio.recording) return audio.blob;
  return audio.stopAndWait();
}

export async function resolveSystemBugScreenshot(
  screenshot: Blob | null,
  annotate: Pick<PhotoAnnotationCanvasHandle, "exportFile"> | null,
): Promise<Blob | null> {
  if (!screenshot) return null;
  if (!annotate) return screenshot;
  try {
    return await annotate.exportFile();
  } catch {
    return screenshot;
  }
}

async function sendSystemBug(
  args: SystemBugDialogProps & {
    note: string;
    sending: boolean;
    setSending: (v: boolean) => void;
    audioBlob: Blob | null;
    recording: boolean;
    stopAndWait: () => Promise<Blob | null>;
    annotate: PhotoAnnotationCanvasHandle | null;
  },
) {
  if (args.sending) return;
  const audioBlob = await resolveSystemBugAudio({
    recording: args.recording,
    blob: args.audioBlob,
    stopAndWait: args.stopAndWait,
  });
  if (!args.note.trim() && !audioBlob) {
    args.onError(he.systemBugNeedExplain);
    return;
  }
  await deliverSystemBug(args, audioBlob);
}

async function deliverSystemBug(
  args: Parameters<typeof sendSystemBug>[0],
  audioBlob: Blob | null,
) {
  args.setSending(true);
  try {
    const screenshot = await resolveSystemBugScreenshot(args.screenshot, args.annotate);
    await submitSystemBug({
      note: args.note.trim(),
      route: args.route,
      trail: args.trail,
      appVersion: args.appVersion,
      preview: args.preview,
      branchName: args.branchName,
      screenshot,
      audio: audioBlob,
    });
    args.onSent();
    args.onClose();
  } catch (e) {
    args.onError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setSending(false);
  }
}
