import { useEffect, useRef, useState } from "react";
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
import PhotoAnnotationCanvas, {
  type PhotoAnnotationCanvasHandle,
} from "../media/PhotoAnnotationCanvas";

type Camera = ReturnType<typeof useCameraStream>;

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
  const session = useChatPhotoSession(open);
  const previewing = Boolean(session.previewBlob);
  const busy = session.capturing || uploading || session.confirming;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.mediaCapturePhotoTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1, overflowY: "auto" }}>
        <ChatPhotoDialogBody session={session} previewing={previewing} busy={busy} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
        <ChatPhotoDialogActions
          session={session}
          previewing={previewing}
          busy={busy}
          uploading={uploading}
          onClose={onClose}
          onSend={onSend}
        />
      </DialogActions>
    </Dialog>
  );
}

function useChatPhotoSession(open: boolean) {
  const back = useCameraStream({ defaultFacing: "environment" });
  const front = useCameraStream({ defaultFacing: "user" });
  const [dual, setDual] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const annotateRef = useRef<PhotoAnnotationCanvasHandle>(null);
  useChatPhotoCameras(open, dual, Boolean(previewBlob), back, front, setDual, setPreviewBlob);
  return {
    back, front, dual, setDual, previewBlob, setPreviewBlob,
    capturing, setCapturing, confirming, setConfirming, annotateRef,
  };
}

function useChatPhotoCameras(
  open: boolean,
  dual: boolean,
  previewing: boolean,
  back: Camera,
  front: Camera,
  setDual: (v: boolean) => void,
  setPreviewBlob: (v: Blob | null) => void,
) {
  const { start: startBack, stop: stopBack } = back;
  const { start: startFront, stop: stopFront } = front;

  useEffect(() => {
    if (!open) {
      stopBack();
      stopFront();
      setDual(false);
      setPreviewBlob(null);
      return;
    }
    if (previewing) {
      stopBack();
      stopFront();
      return;
    }
    void startBack();
    return () => {
      stopBack();
      stopFront();
    };
  }, [open, previewing, startBack, stopBack, startFront, stopFront, setDual, setPreviewBlob]);

  useEffect(() => {
    if (!open || previewing) return;
    if (dual) void startFront();
    else stopFront();
  }, [open, previewing, dual, startFront, stopFront]);
}

function ChatPhotoDialogBody({
  session,
  previewing,
  busy,
}: {
  session: ReturnType<typeof useChatPhotoSession>;
  previewing: boolean;
  busy: boolean;
}) {
  if (previewing && session.previewBlob) {
    return <PhotoAnnotationCanvas ref={session.annotateRef} imageBlob={session.previewBlob} />;
  }
  return (
    <>
      <Box display="flex" gap={1} flexDirection={session.dual ? "row" : "column"}>
        <CameraFacingPreview
          onVideoRef={session.back.onVideoRef}
          facing={session.back.facing}
          onFlip={session.back.flip}
          flipDisabled={session.back.starting || busy || session.dual}
        />
        {session.dual ? (
          <CameraFacingPreview
            onVideoRef={session.front.onVideoRef}
            facing={session.front.facing}
            onFlip={session.front.flip}
            flipDisabled
          />
        ) : null}
      </Box>
      <FormControlLabel
        control={<Switch checked={session.dual} onChange={(e) => session.setDual(e.target.checked)} />}
        label={he.chatDualCameras}
      />
      {session.back.error ? <Alert severity="warning">{he.mediaCaptureDevice}</Alert> : null}
    </>
  );
}

function ChatPhotoDialogActions({
  session,
  previewing,
  busy,
  uploading,
  onClose,
  onSend,
}: {
  session: ReturnType<typeof useChatPhotoSession>;
  previewing: boolean;
  busy: boolean;
  uploading: boolean;
  onClose: () => void;
  onSend: (file: File) => void | Promise<void>;
}) {
  return (
    <>
      <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
      {previewing ? (
        <>
          <Button onClick={() => session.setPreviewBlob(null)} disabled={busy}>
            {he.mediaCaptureRetry}
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            onClick={() => void confirmAnnotatedChatPhoto({ session, uploading, onSend, onClose })}
          >
            {busy ? he.loading : he.mediaCaptureUseRecording}
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PhotoCameraIcon />}
          disabled={!session.back.active || busy}
          onClick={() => void snapToPreview(session)}
        >
          {he.mediaCaptureTakePhoto}
        </Button>
      )}
    </>
  );
}

async function snapToPreview(session: ReturnType<typeof useChatPhotoSession>) {
  session.setCapturing(true);
  try {
    const blob = await captureChatPhotoBlob(session.back, session.front, session.dual);
    if (blob) session.setPreviewBlob(blob);
  } finally {
    session.setCapturing(false);
  }
}

async function confirmAnnotatedChatPhoto(opts: {
  session: ReturnType<typeof useChatPhotoSession>;
  uploading: boolean;
  onSend: (file: File) => void | Promise<void>;
  onClose: () => void;
}) {
  const { session, uploading, onSend, onClose } = opts;
  if (!session.previewBlob || uploading || session.confirming) return;
  session.setConfirming(true);
  try {
    const file = await exportAnnotatedChatPhoto(session.previewBlob, session.annotateRef.current);
    await onSend(file);
    onClose();
  } finally {
    session.setConfirming(false);
  }
}

export async function exportAnnotatedChatPhoto(
  original: Blob,
  annotate: Pick<PhotoAnnotationCanvasHandle, "exportFile"> | null,
): Promise<File> {
  if (annotate) {
    try {
      return await annotate.exportFile();
    } catch {
      /* keep the captured shot */
    }
  }
  return blobToFile(original, `chat-photo-${Date.now()}.jpg`, original.type || "image/jpeg");
}

async function captureChatPhotoBlob(back: Camera, front: Camera, dual: boolean): Promise<Blob | null> {
  const mainEl = back.videoRef.current;
  if (!mainEl) return null;
  const main = await capturePhotoFromVideo(mainEl);
  if (!main) return null;
  let blob = await normalizePhotoOrientation(main);
  if (dual && front.videoRef.current) {
    blob = await maybeStitchSelfie(blob, front.videoRef.current);
  }
  return blob;
}

async function maybeStitchSelfie(backBlob: Blob, frontEl: HTMLVideoElement): Promise<Blob> {
  const selfie = await capturePhotoFromVideo(frontEl);
  if (!selfie) return backBlob;
  try {
    return await stitchPhotoBlobs(backBlob, await normalizePhotoOrientation(selfie));
  } catch {
    return backBlob;
  }
}

