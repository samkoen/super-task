import { useCallback, useState, type ReactNode } from "react";
import { Box, Button, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import MicIcon from "@mui/icons-material/Mic";
import { PhotoCaptureDialog } from "../media/MediaCaptureActions";
import AudioCaptureDialog from "../media/AudioCaptureDialog";
import CompactAudioPlayer from "../media/CompactAudioPlayer";
import { mediaUrl } from "../../utils/mediaUrl";
import { captureErrorMessage, scheduleAfterDialogPaint } from "../media/captureDialogShared";
import { useCameraStream } from "../../hooks/useCameraStream";
import { taskService } from "../../services/taskService";
import { launchPhotoCapture } from "../../utils/launchPhotoCapture";
import { normalizePhotoOrientation } from "../../utils/mediaCapture";
import { he } from "../../i18n/he";
import { employeeCardSx } from "../../styles/employeeUi";
import {
  lineFacts,
  lineNoteMissing,
  showProblemFields,
  type DeliveryLineDraft,
  type DeliveryLineView,
} from "../../utils/deliveryNote";
import DeliveryProductImage from "./DeliveryProductImage";

const OK_COLOR = "#2e7d32";
const PROBLEM_COLOR = "#d84315";

type Props = {
  line: DeliveryLineView;
  draft: DeliveryLineDraft;
  disabled: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
  onError: (message: string) => void;
};

/** Une ligne de teuda : produit et quantités, puis deux gros boutons « תקין / לא תקין ». */
export default function DeliveryLineCard({ line, draft, disabled, onChange, onError }: Props) {
  const problem = showProblemFields(draft);
  const missing = lineNoteMissing(draft);
  return (
    <Box
      sx={{
        ...employeeCardSx,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderColor: missing ? "error.main" : problem ? alpha(PROBLEM_COLOR, 0.5) : undefined,
      }}
    >
      <LineSummary line={line} />
      <StatusButtons line={line} problem={problem} disabled={disabled} onChange={onChange} draft={draft} />
      {problem ? (
        <ProblemFields draft={draft} disabled={disabled} missing={missing} onChange={onChange} onError={onError} />
      ) : null}
    </Box>
  );
}

function LineSummary({ line }: { line: DeliveryLineView }) {
  const origin = line.origin_name?.trim();
  return (
    <Box display="flex" gap={1.5} alignItems="center">
      <DeliveryProductImage url={line.image_url} />
      <Box minWidth={0}>
        <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>{line.product_name}</Typography>
        {origin ? <Typography color="text.secondary">{origin}</Typography> : null}
        <Typography color="text.secondary" variant="body2">
          {lineFacts(line, { weight: he.deliveryNoteWeight, price: he.deliveryNotePrice })}
        </Typography>
      </Box>
    </Box>
  );
}

function StatusButtons({
  line,
  problem,
  disabled,
  draft,
  onChange,
}: {
  line: DeliveryLineView;
  problem: boolean;
  disabled: boolean;
  draft: DeliveryLineDraft;
  onChange: (draft: DeliveryLineDraft) => void;
}) {
  return (
    <Box display="flex" gap={1.5}>
      <StatusButton
        selected={!problem}
        color={OK_COLOR}
        icon={<CheckCircleOutlineIcon />}
        label={he.deliveryNoteConditionOk}
        ariaLabel={`${he.deliveryNoteConditionOk}: ${line.product_name}`}
        disabled={disabled}
        onClick={() => onChange({ arrival: "ok", note: "", photo_url: "", audio_url: "" })}
      />
      <StatusButton
        selected={problem}
        color={PROBLEM_COLOR}
        icon={<ErrorOutlineIcon />}
        label={he.deliveryNoteNotOk}
        ariaLabel={`${he.deliveryNoteNotOk}: ${line.product_name}`}
        disabled={disabled}
        onClick={() => onChange({ ...draft, arrival: "problem" })}
      />
    </Box>
  );
}

function StatusButton({
  selected,
  color,
  icon,
  label,
  ariaLabel,
  disabled,
  onClick,
}: {
  selected: boolean;
  color: string;
  icon: ReactNode;
  label: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      sx={{
        flex: 1,
        minHeight: 56,
        gap: 1,
        borderRadius: "14px",
        border: "2px solid",
        borderColor: selected ? color : "divider",
        bgcolor: selected ? alpha(color, 0.12) : "background.paper",
        color: selected ? color : "text.secondary",
        fontWeight: 800,
        fontSize: "1.05rem",
      }}
    >
      {icon}
      {label}
    </ButtonBase>
  );
}

function ProblemFields({
  draft,
  disabled,
  missing,
  onChange,
  onError,
}: {
  draft: DeliveryLineDraft;
  disabled: boolean;
  missing: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
  onError: (message: string) => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <TextField
        label={he.deliveryNoteLineNote}
        value={draft.note}
        disabled={disabled}
        required
        error={missing}
        helperText={missing ? he.deliveryNoteNoteMissingHint : undefined}
        onChange={(event) => onChange({ ...draft, note: event.target.value })}
        fullWidth
        multiline
        minRows={2}
      />
      <Box display="flex" gap={1} alignItems="flex-start">
        <Box flex={1}>
          <LinePhotoButton draft={draft} disabled={disabled} onChange={onChange} onError={onError} />
        </Box>
        <LineAudioButton draft={draft} disabled={disabled} onChange={onChange} onError={onError} />
      </Box>
    </Box>
  );
}

type LinePhotoProps = {
  draft: DeliveryLineDraft;
  disabled: boolean;
  onChange: (draft: DeliveryLineDraft) => void;
  onError: (message: string) => void;
};

function LinePhotoButton({ draft, disabled, onChange, onError }: LinePhotoProps) {
  const shot = useLinePhotoCamera();
  const [uploading, setUploading] = useState(false);
  const save = (file: File) => saveLinePhoto(file, draft, onChange, onError, setUploading);
  return (
    <>
      <Button
        type="button"
        disabled={disabled || uploading}
        variant="outlined"
        startIcon={uploading ? <CircularProgress size={18} /> : <PhotoCameraIcon />}
        onClick={shot.launch}
        fullWidth
        sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 700 }}
      >
        {draft.photo_url ? he.deliveryNotePhotoAttached : he.deliveryNoteLinePhoto}
      </Button>
      {shot.nativeError ? (
        <Typography variant="caption" color="warning.main">
          {captureErrorMessage(shot.nativeError)}
        </Typography>
      ) : null}
      <PhotoCaptureDialog
        open={shot.open}
        uploading={uploading}
        camera={shot.camera}
        seedBlob={shot.seed}
        preparing={shot.preparing}
        annotate={false}
        onClose={shot.close}
        onCapture={save}
      />
    </>
  );
}

function useLinePhotoCamera() {
  const camera = useCameraStream({ defaultFacing: "environment" });
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<Blob | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [nativeError, setNativeError] = useState("");
  const openWeb = useCallback(() => {
    setSeed(null);
    setPreparing(false);
    setOpen(true);
    scheduleAfterDialogPaint(() => void camera.start());
  }, [camera.start]);
  const launch = useCallback(() => {
    setNativeError("");
    void launchPhotoCapture({
      openWeb,
      onNative: (file) => showNativeShot(file, setOpen, setPreparing, setSeed),
      onPermissionDenied: () => setNativeError("permission"),
    });
  }, [openWeb]);
  const close = useCallback(() => {
    setOpen(false);
    setSeed(null);
    setPreparing(false);
    camera.stop();
  }, [camera.stop]);
  return { camera, open, seed, preparing, nativeError, launch, close };
}

async function showNativeShot(
  file: File,
  setOpen: (open: boolean) => void,
  setPreparing: (preparing: boolean) => void,
  setSeed: (seed: Blob | null) => void,
) {
  setPreparing(true);
  setOpen(true);
  try {
    setSeed(await normalizePhotoOrientation(file));
  } finally {
    setPreparing(false);
  }
}

function LineAudioButton({ draft, disabled, onChange, onError }: LinePhotoProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const src = mediaUrl(draft.audio_url);
  const save = (file: File) => saveLineAudio(file, draft, onChange, onError, setUploading);
  return (
    <Box flex={1} display="flex" flexDirection="column" gap={1}>
      {src ? <CompactAudioPlayer src={src} /> : null}
      <Button
        type="button"
        disabled={disabled || uploading}
        variant="outlined"
        fullWidth
        startIcon={uploading ? <CircularProgress size={18} /> : <MicIcon />}
        onClick={() => setOpen(true)}
        sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 700 }}
      >
        {draft.audio_url ? he.deliveryNoteAudioAttached : he.deliveryNoteLineAudio}
      </Button>
      <AudioCaptureDialog open={open} uploading={uploading} onClose={() => setOpen(false)} onCapture={save} />
    </Box>
  );
}

async function saveLineAudio(
  file: File,
  draft: DeliveryLineDraft,
  onChange: (draft: DeliveryLineDraft) => void,
  onError: (message: string) => void,
  setUploading: (uploading: boolean) => void,
) {
  setUploading(true);
  try {
    const uploaded = await taskService.uploadAudio(file);
    onChange({ ...draft, audio_url: uploaded.url });
  } catch {
    onError(he.errorGeneric);
  } finally {
    setUploading(false);
  }
}

async function saveLinePhoto(
  file: File,
  draft: DeliveryLineDraft,
  onChange: (draft: DeliveryLineDraft) => void,
  onError: (message: string) => void,
  setUploading: (uploading: boolean) => void,
) {
  setUploading(true);
  try {
    const uploaded = await taskService.uploadPhoto(file);
    onChange({ ...draft, photo_url: uploaded.url });
  } catch {
    onError(he.errorGeneric);
  } finally {
    setUploading(false);
  }
}
