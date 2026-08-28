import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Typography,
} from "@mui/material";
import { blobToFile } from "../../utils/mediaCapture";
import { cropAvatarToJpeg, type AvatarCrop } from "../../utils/cropAvatar";
import { loadImageElement } from "../../utils/photoAnnotation";
import { he } from "../../i18n/he";
import { dialogActionsPbCss } from "../../utils/systemInsets";

type AvatarCropDialogProps = {
  open: boolean;
  file: File | null;
  uploading?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

const DEFAULT_CROP: AvatarCrop = { panX: 0, panY: 0, zoom: 1.2 };

export default function AvatarCropDialog({
  open,
  file,
  uploading = false,
  onClose,
  onConfirm,
}: AvatarCropDialogProps) {
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.avatarCropTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
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
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt=""
              draggable={false}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translate(${crop.panX * 12}%, ${crop.panY * 12}%) scale(${crop.zoom})`,
              }}
            />
          ) : null}
          <Box
            sx={{
              position: "absolute",
              inset: "8%",
              borderRadius: "50%",
              boxShadow: "0 0 0 999px rgba(0,0,0,0.45)",
              border: "2px solid #fff",
              pointerEvents: "none",
            }}
          />
        </Box>
        <Slider
          aria-label={he.avatarCropZoom}
          min={1}
          max={3}
          step={0.05}
          value={crop.zoom}
          onChange={(_, value) =>
            setCrop((prev) => ({ ...prev, zoom: Array.isArray(value) ? value[0] : value }))
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss() }}>
        <Button onClick={onClose} disabled={saving || uploading}>
          {he.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleConfirm()}
          disabled={!file || saving || uploading}
          startIcon={saving || uploading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {saving || uploading ? he.loading : he.avatarCropConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
