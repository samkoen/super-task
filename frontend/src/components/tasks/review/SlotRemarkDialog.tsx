import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import FormDialog from "../../ui/FormDialog";
import PhotoAnnotationCanvas, { type PhotoAnnotationCanvasHandle } from "../../media/PhotoAnnotationCanvas";
import { ReviewableVideo } from "../MarkVideoFrameButton";
import { useResolvedMediaSrc } from "../../../hooks/useResolvedMediaSrc";
import { he } from "../../../i18n/he";
import { employeeFieldSx } from "../../../styles/employeeUi";
import { flowColor, flowText } from "../../../styles/flowTokens";
import { studioPrimarySx } from "../fixed/studio/studioUi";
import type { CompletionKind } from "../../../utils/completionMedia";
import { REMARK_MAX, rejectedDraft, type SlotDraft } from "../../../utils/slotReview";

type Props = {
  open: boolean;
  title: string;
  kind: CompletionKind;
  /** Source du fichier rendu par l'oved (photo, vidéo, audio). */
  mediaUrl: string | null;
  initial?: SlotDraft | null;
  onSave: (draft: SlotDraft) => void;
  onClose: () => void;
};

/** Remarque du menahel sur une sous-tâche refusée : texte + flèches et ronds sur la photo ou un fragment de vidéo. */
export default function SlotRemarkDialog({ open, title, kind, mediaUrl, initial, onSave, onClose }: Props) {
  const canvasRef = useRef<PhotoAnnotationCanvasHandle>(null);
  const [remark, setRemark] = useState("");
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRemark(initial?.remark ?? "");
    setFrameUrl(null);
    setError("");
    setBusy(false);
  }, [open, initial]);

  const imageSource = kind === "photo" ? mediaUrl : frameUrl;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const file = await exportAnnotated(canvasRef.current, kind === "video");
      onSave(
        rejectedDraft({
          remark,
          annotatedFile: file ?? initial?.annotatedFile ?? null,
          annotatedPreviewUrl: file ? URL.createObjectURL(file) : initial?.annotatedPreviewUrl ?? null,
        }),
      );
    } catch {
      setError(he.slotRemarkUploadFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      title={he.slotRemarkTitle}
      onClose={onClose}
      busy={busy}
      actions={
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* Même bouton noir que « אישור » / « שליחה לתיקון » de la revue. */}
          <ButtonBase data-testid="slot-remark-save" onClick={() => void save()} disabled={busy} sx={studioPrimarySx}>
            {busy ? <CircularProgress size={24} sx={{ color: flowColor.neutral0 }} /> : he.slotRemarkSave}
          </ButtonBase>
          <ButtonBase onClick={onClose} disabled={busy} sx={{ ...flowText.button, height: 44, color: flowColor.neutral900 }}>
            {he.cancel}
          </ButtonBase>
        </Box>
      }
    >
      <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>
        {title}
      </Typography>
      {kind === "video" ? (
        <VideoFramePicker
          mediaUrl={mediaUrl}
          frameUrl={frameUrl}
          onFrame={setFrameUrl}
          onReset={() => setFrameUrl(null)}
        />
      ) : null}
      {imageSource ? (
        <PhotoAnnotationCanvas
          ref={canvasRef}
          image={imageSource}
          hint={kind === "photo" ? he.slotRemarkHintPhoto : he.slotRemarkHintDraw}
        />
      ) : null}
      <TextField
        label={he.slotRemarkLabel}
        value={remark}
        onChange={(event) => setRemark(event.target.value)}
        disabled={busy}
        fullWidth
        multiline
        minRows={2}
        inputProps={{ maxLength: REMARK_MAX }}
        sx={employeeFieldSx}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
    </FormDialog>
  );
}

/** Écran peu haut : la vidéo laisse la place aux outils et au bouton du bas. */
function remarkVideoMaxHeight(): number {
  return Math.round(Math.max(180, Math.min(window.innerHeight * 0.4, 320)));
}

async function exportAnnotated(
  handle: PhotoAnnotationCanvasHandle | null,
  alwaysExport: boolean,
): Promise<File | null> {
  if (!handle) return null;
  if (!alwaysExport && !handle.hasAnnotations()) return null;
  return handle.exportFile();
}

function VideoFramePicker({
  mediaUrl,
  frameUrl,
  onFrame,
  onReset,
}: {
  mediaUrl: string | null;
  frameUrl: string | null;
  onFrame: (url: string) => void;
  onReset: () => void;
}) {
  const resolved = useResolvedMediaSrc(mediaUrl, true);
  if (frameUrl) {
    return (
      <Box>
        <Button size="small" variant="outlined" onClick={onReset} sx={{ minHeight: 40, borderRadius: "12px" }}>
          {he.slotRemarkChangeFrame}
        </Button>
      </Box>
    );
  }
  if (!resolved.src) return <CircularProgress size={28} />;
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        {he.slotRemarkHintVideo}
      </Typography>
      <ReviewableVideo src={resolved.src} onMarkFrame={onFrame} maxHeight={remarkVideoMaxHeight()} />
    </Box>
  );
}
