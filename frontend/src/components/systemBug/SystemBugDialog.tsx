import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { he } from "../../i18n/he";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { submitSystemBug } from "../../services/systemBugService";
import { ApiError } from "../../services/api";
import { toMailSafeAudio } from "../../utils/audioToMailSafe";
import PhotoAnnotationCanvas, {
  type PhotoAnnotationCanvasHandle,
} from "../media/PhotoAnnotationCanvas";
import AppDialogTitle from "../ui/AppDialogTitle";
import { EMPLOYEE_BRAND, EMPLOYEE_TOUCH_MIN, employeeFieldSx, employeePrimaryButtonSx } from "../../styles/employeeUi";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";

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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const audio = useAudioRecorder();
  const annotateRef = useRef<PhotoAnnotationCanvasHandle>(null);

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

  const send = () =>
    void sendSystemBug({
      ...props,
      note,
      sending,
      setSending,
      audioBlob: audio.blob,
      recording: audio.recording,
      stopAndWait: audio.stopAndWait,
      annotate: annotateRef.current,
    });

  return (
    <Dialog
      open={props.open}
      onClose={sending ? undefined : props.onClose}
      fullWidth
      fullScreen={fullScreen}
      maxWidth="md"
      dir="rtl"
      disableEnforceFocus
    >
      <AppDialogTitle
        data-system-bug-dialog=""
        title={he.systemBug}
        onClose={props.onClose}
        closeDisabled={sending}
      />
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
      <DialogActions sx={dialogStackedActionsSx}>
        <Button onClick={props.onClose} disabled={sending} sx={dialogSecondaryActionSx}>
          {he.cancel}
        </Button>
        <Button variant="contained" disabled={sending} onClick={send} sx={employeePrimaryButtonSx}>
          {sending ? <CircularProgress size={24} color="inherit" /> : he.systemBugSend}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface SystemBugFieldsProps {
  note: string;
  setNote: (value: string) => void;
  screenshot: Blob | null;
  annotateRef: RefObject<PhotoAnnotationCanvasHandle>;
  sending: boolean;
  recording: boolean;
  hasAudio: boolean;
  canRecord: boolean;
  onToggleRecord: () => void;
}

function SystemBugFields(props: SystemBugFieldsProps) {
  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      <Typography variant="body1" fontWeight={600}>
        {he.systemBugSimpleHint}
      </Typography>
      <RecordButton
        recording={props.recording}
        disabled={props.sending || !props.canRecord}
        onToggle={props.onToggleRecord}
      />
      {props.hasAudio ? <AudioReadyBadge /> : null}
      <TextField
        label={he.systemBugNote}
        helperText={he.systemBugOrWrite}
        value={props.note}
        onChange={(e) => props.setNote(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        disabled={props.sending}
        sx={employeeFieldSx}
      />
      <ScreenshotSection screenshot={props.screenshot} annotateRef={props.annotateRef} />
    </Box>
  );
}

function RecordButton({
  recording,
  disabled,
  onToggle,
}: {
  recording: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant={recording ? "contained" : "outlined"}
      color={recording ? "error" : "primary"}
      onClick={onToggle}
      disabled={disabled}
      startIcon={recording ? <StopIcon /> : <MicIcon />}
      sx={{
        minHeight: EMPLOYEE_TOUCH_MIN + 8,
        borderRadius: "16px",
        fontSize: "1.15rem",
        fontWeight: 800,
        borderWidth: 2,
        "&:hover": { borderWidth: 2 },
      }}
    >
      {recording ? he.systemBugStop : he.systemBugRecord}
    </Button>
  );
}

function AudioReadyBadge() {
  return (
    <Box
      role="status"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: "12px",
        color: EMPLOYEE_BRAND,
        bgcolor: alpha(EMPLOYEE_BRAND, 0.1),
      }}
    >
      <CheckCircleRoundedIcon />
      <Typography fontWeight={700}>{he.systemBugAudioReady}</Typography>
    </Box>
  );
}

function ScreenshotSection({
  screenshot,
  annotateRef,
}: {
  screenshot: Blob | null;
  annotateRef: RefObject<PhotoAnnotationCanvasHandle>;
}) {
  if (!screenshot) {
    return (
      <Typography variant="body2" color="text.secondary">
        {he.systemBugCaptureFailed}
      </Typography>
    );
  }
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={800} mb={0.5}>
        {he.systemBugScreenshotTitle}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        {he.systemBugHint}
      </Typography>
      <PhotoAnnotationCanvas ref={annotateRef} image={screenshot} hint={he.systemBugAnnotateHint} />
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
    const audio = await toMailSafeAudio(audioBlob);
    await submitSystemBug({
      note: args.note.trim(),
      route: args.route,
      trail: args.trail,
      appVersion: args.appVersion,
      preview: args.preview,
      branchName: args.branchName,
      screenshot,
      audio,
    });
    args.onSent();
    args.onClose();
  } catch (e) {
    args.onError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    args.setSending(false);
  }
}
