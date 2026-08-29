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
  FormControlLabel,
  Switch,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useCameraStream } from "../../hooks/useCameraStream";
import { he } from "../../i18n/he";
import {
  blobToFile,
  capturePhotoFromVideo,
  normalizePhotoOrientation,
} from "../../utils/mediaCapture";
import { stitchPhotoBlobs } from "../../utils/stitchPhotos";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import CameraFacingPreview from "../media/CameraFacingPreview";

export default function ChatPhotoCapture({
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
  const back = useCameraStream({ defaultFacing: "environment" });
  const front = useCameraStream({ defaultFacing: "user" });
  const [dual, setDual] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const startBack = back.start;
  const stopBack = back.stop;
  const startFront = front.start;
  const stopFront = front.stop;

  useEffect(() => {
    if (!open) {
      stopBack();
      stopFront();
      setDual(false);
      return;
    }
    void startBack();
    return () => {
      stopBack();
      stopFront();
    };
  }, [open, startBack, stopBack, startFront, stopFront]);

  useEffect(() => {
    if (!open) return;
    if (dual) void startFront();
    else stopFront();
  }, [open, dual, startFront, stopFront]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.mediaCapturePhotoTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <Box display="flex" gap={1} flexDirection={dual ? "row" : "column"}>
          <CameraFacingPreview
            onVideoRef={back.onVideoRef}
            facing={back.facing}
            onFlip={back.flip}
            flipDisabled={back.starting || capturing || dual}
          />
          {dual ? (
            <CameraFacingPreview
              onVideoRef={front.onVideoRef}
              facing={front.facing}
              onFlip={front.flip}
              flipDisabled
            />
          ) : null}
        </Box>
        <FormControlLabel
          control={<Switch checked={dual} onChange={(e) => setDual(e.target.checked)} />}
          label={he.chatDualCameras}
        />
        {back.error ? <Alert severity="warning">{he.mediaCaptureDevice}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={capturing || uploading}>{he.cancel}</Button>
        <Button
          variant="contained"
          startIcon={capturing || uploading ? <CircularProgress size={18} color="inherit" /> : <PhotoCameraIcon />}
          disabled={!back.active || capturing || uploading}
          onClick={() => void snapAndSend({ back, front, dual, onSend, onClose, setCapturing })}
        >
          {he.mediaCaptureTakePhoto}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

async function snapAndSend(opts: {
  back: ReturnType<typeof useCameraStream>;
  front: ReturnType<typeof useCameraStream>;
  dual: boolean;
  onSend: (file: File) => void | Promise<void>;
  onClose: () => void;
  setCapturing: (v: boolean) => void;
}) {
  opts.setCapturing(true);
  try {
    const file = await captureChatPhoto(opts.back, opts.front, opts.dual);
    if (!file) return;
    await opts.onSend(file);
    opts.onClose();
  } finally {
    opts.setCapturing(false);
  }
}

async function captureChatPhoto(
  back: ReturnType<typeof useCameraStream>,
  front: ReturnType<typeof useCameraStream>,
  dual: boolean,
): Promise<File | null> {
  const mainEl = back.videoRef.current;
  if (!mainEl) return null;
  const main = await capturePhotoFromVideo(mainEl);
  if (!main) return null;
  let blob = await normalizePhotoOrientation(main);
  if (dual && front.videoRef.current) {
    const selfie = await capturePhotoFromVideo(front.videoRef.current);
    if (selfie) {
      try {
        blob = await stitchPhotoBlobs(blob, await normalizePhotoOrientation(selfie));
      } catch {
        /* keep the back camera shot */
      }
    }
  }
  return blobToFile(blob, `chat-photo-${Date.now()}.jpg`, "image/jpeg");
}
