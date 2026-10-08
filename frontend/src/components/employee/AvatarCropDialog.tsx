import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Slider,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import AppDialogTitle from "../ui/AppDialogTitle";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { blobToFile } from "../../utils/mediaCapture";
import { cropAvatarToJpeg, avatarPreviewLayout, type AvatarCrop } from "../../utils/cropAvatar";
import { loadImageElement } from "../../utils/photoAnnotation";
import { he } from "../../i18n/he";
type AvatarCropDialogProps = {
  open: boolean;
  file: File | null;
  uploading?: boolean;
  busyLabel?: string;
  onClose: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

const DEFAULT_CROP: AvatarCrop = { panX: 0, panY: 0, zoom: 1.2 };

function CropPreviewImage({ imageUrl, crop }: { imageUrl: string; crop: AvatarCrop }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);
  const layout = size ? avatarPreviewLayout(size.w, size.h, crop) : null;
  if (!layout) return null;
  return (
    <Box
      component="img"
      src={imageUrl}
      alt=""
      draggable={false}
      sx={{
        position: "absolute",
        width: `${layout.widthPct}%`,
        height: `${layout.heightPct}%`,
        left: `${layout.leftPct}%`,
        top: `${layout.topPct}%`,
        maxWidth: "none",
      }}
    />
  );
}

export default function AvatarCropDialog({
  open,
  file,
  uploading = false,
  busyLabel,
  onClose,
  onConfirm,
}: AvatarCropDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_CROP);
  const [saving, setSaving] = useState(false);
  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (!open) setCrop(DEFAULT_CROP);
  }, [open]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, panX: crop.panX, panY: crop.panY };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.x) / 120;
    const dy = (event.clientY - drag.y) / 120;
    setCrop((prev) => ({
      ...prev,
      panX: Math.max(-1, Math.min(1, drag.panX + dx)),
      panY: Math.max(-1, Math.min(1, drag.panY + dy)),
    }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || saving || uploading) return;
    setSaving(true);
    try {
      const image = await loadImageElement(imageUrl);
      const blob = await cropAvatarToJpeg(image, crop);
      await onConfirm(blobToFile(blob, `avatar-${Date.now()}.jpg`, "image/jpeg"));
    } finally {
      setSaving(false);
    }
  }, [crop, imageUrl, onConfirm, saving, uploading]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth fullScreen={fullScreen} maxWidth="xs" dir="rtl">
      <AppDialogTitle title={he.avatarCropTitle} onClose={onClose} closeDisabled={saving || uploading} />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
        <Typography variant="body1" fontWeight={600} textAlign="center">
          {he.avatarCropHint}
        </Typography>
        <Box
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            borderRadius: 2,
            bgcolor: "#111",
            touchAction: "none",
            cursor: "grab",
          }}
        >
          {imageUrl ? <CropPreviewImage imageUrl={imageUrl} crop={crop} /> : null}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: "0 0 0 999px rgba(0,0,0,0.45)",
              border: "2px solid #fff",
              pointerEvents: "none",
            }}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={1.5}>
          <ZoomOutIcon color="action" />
          <Slider
            aria-label={he.avatarCropZoom}
            min={1}
            max={3}
            step={0.05}
            value={crop.zoom}
            onChange={(_, value) =>
              setCrop((prev) => ({ ...prev, zoom: Array.isArray(value) ? value[0] : value }))
            }
            sx={{ "& .MuiSlider-thumb": { width: 28, height: 28 }, "& .MuiSlider-rail": { height: 8 }, "& .MuiSlider-track": { height: 8 } }}
          />
          <ZoomInIcon color="action" />
        </Box>
      </DialogContent>
      <DialogActions sx={dialogStackedActionsSx}>
        <Button onClick={onClose} disabled={saving || uploading} sx={dialogSecondaryActionSx}>
          {he.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={!file || saving || uploading}
          startIcon={saving || uploading ? <CircularProgress size={20} color="inherit" /> : undefined}
          sx={employeePrimaryButtonSx}
        >
          {saving || uploading ? busyLabel || he.loading : he.avatarCropConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
