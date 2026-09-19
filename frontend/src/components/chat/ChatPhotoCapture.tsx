import { useEffect, useMemo, useRef, useState } from "react";
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
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import StopIcon from "@mui/icons-material/Stop";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useVideoRecorder } from "../../hooks/useVideoRecorder";
import { he } from "../../i18n/he";
import {
  blobToFile,
  capturePhotoFromVideo,
  normalizePhotoOrientation,
} from "../../utils/mediaCapture";
import { stitchPhotoBlobs } from "../../utils/stitchPhotos";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import { videoElapsedLabel } from "../../utils/videoElapsedLabel";
import CameraFacingPreview from "../media/CameraFacingPreview";
import PhotoAnnotationCanvas, {
  type PhotoAnnotationCanvasHandle,
} from "../media/PhotoAnnotationCanvas";

type Camera = ReturnType<typeof useCameraStream>;
type ChatCaptureKind = "photo" | "video";

export default function ChatPhotoCapture({
  open,
  uploading,
  seedBlob = null,
  onClose,
  onSend,
}: {
  open: boolean;
  uploading: boolean;
  seedBlob?: Blob | null;
  onClose: () => void;
  onSend: (file: File, kind?: ChatCaptureKind) => void | Promise<void>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const session = useChatPhotoSession(open, seedBlob);
  const previewing = Boolean(session.previewBlob);
  const busy = session.capturing || uploading || session.confirming || session.video.starting;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      fullScreen={fullScreen}
      maxWidth="sm"
      dir="rtl"
      disableEnforceFocus
      container={chatPhotoDialogContainer}
      sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
    >
      <DialogTitle>
        {session.videoMode ? he.mediaCaptureVideoTitle : he.mediaCapturePhotoTitle}
      </DialogTitle>
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

function chatPhotoDialogContainer(): Element | null {
  return typeof document === "undefined" ? null : document.body;
}

function useChatPhotoSession(open: boolean, seedBlob: Blob | null) {
  const back = useCameraStream({ defaultFacing: "environment" });
  const front = useCameraStream({ defaultFacing: "user" });
  const video = useVideoRecorder({ defaultFacing: "environment" });
  const [dual, setDual] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [takenBlob, setTakenBlob] = useState<Blob | null>(null);
  const [ignoreSeed, setIgnoreSeed] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const annotateRef = useRef<PhotoAnnotationCanvasHandle>(null);
  const previewBlob = chatPhotoPreview(open, takenBlob, seedBlob, ignoreSeed);
  useResetChatPhoto(open, setTakenBlob, setIgnoreSeed, setVideoMode, video.cleanup);
  useChatPhotoCameras(open, dual, Boolean(previewBlob) || videoMode, back, front, setDual);
  return {
    back, front, dual, setDual, previewBlob, setPreviewBlob: setTakenBlob,
    capturing, setCapturing, confirming, setConfirming, annotateRef,
    video, videoMode, setVideoMode,
    retake: () => {
      setTakenBlob(null);
      setIgnoreSeed(true);
      setVideoMode(false);
      video.cleanup();
    },
  };
}

function chatPhotoPreview(
  open: boolean,
  takenBlob: Blob | null,
  seedBlob: Blob | null,
  ignoreSeed: boolean,
): Blob | null {
  if (!open) return null;
  if (takenBlob) return takenBlob;
  if (!ignoreSeed && seedBlob && seedBlob.size > 0) return seedBlob;
  return null;
}

function useResetChatPhoto(
  open: boolean,
  setTakenBlob: (blob: Blob | null) => void,
  setIgnoreSeed: (value: boolean) => void,
  setVideoMode: (value: boolean) => void,
  cleanupVideo: () => void,
) {
  useEffect(() => {
    if (open) return;
    setTakenBlob(null);
    setIgnoreSeed(false);
    setVideoMode(false);
    cleanupVideo();
  }, [open, setTakenBlob, setIgnoreSeed, setVideoMode, cleanupVideo]);
}

function useChatPhotoCameras(
  open: boolean,
  dual: boolean,
  previewing: boolean,
  back: Camera,
  front: Camera,
  setDual: (v: boolean) => void,
) {
  const { start: startBack, stop: stopBack } = back;
  const { start: startFront, stop: stopFront } = front;

  useEffect(() => {
    if (!open) {
      stopBack();
      stopFront();
      setDual(false);
      return;
    }
    if (previewing) {
      stopBack();
      stopFront();
      return;
    }
    const cancelLive = startLiveChatCamera(startBack);
    return () => {
      cancelLive();
      stopBack();
      stopFront();
    };
  }, [open, previewing, startBack, stopBack, startFront, stopFront, setDual]);

  useEffect(() => {
    if (!open || previewing) return;
    if (dual) void startFront();
    else stopFront();
  }, [open, previewing, dual, startFront, stopFront]);
}

function startLiveChatCamera(startBack: () => Promise<unknown>): () => void {
  let cancelled = false;
  const start = () => {
    if (!cancelled) void startBack();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(start));
  } else {
    start();
  }
  return () => {
    cancelled = true;
  };
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
    return <PhotoAnnotationCanvas ref={session.annotateRef} image={session.previewBlob} />;
  }
  if (session.video.blob) return <RecordedVideoPreview blob={session.video.blob} />;
  const live = session.videoMode ? session.video : session.back;
  return (
    <>
      <Box display="flex" gap={1} flexDirection={session.dual && !session.videoMode ? "row" : "column"}>
        <CameraFacingPreview
          onVideoRef={live.onVideoRef}
          facing={live.facing}
          onFlip={live.flip}
          flipDisabled={busy || session.dual}
        />
        {session.dual && !session.videoMode ? (
          <CameraFacingPreview
            onVideoRef={session.front.onVideoRef}
            facing={session.front.facing}
            onFlip={session.front.flip}
            flipDisabled
          />
        ) : null}
      </Box>
      {session.videoMode ? (
        <VideoStatus session={session} />
      ) : (
        <FormControlLabel
          control={<Switch checked={session.dual} onChange={(e) => session.setDual(e.target.checked)} />}
          label={he.chatDualCameras}
        />
      )}
      {session.back.error || session.video.error ? (
        <Alert severity="warning">{he.mediaCaptureDevice}</Alert>
      ) : null}
    </>
  );
}

function VideoStatus({ session }: { session: ReturnType<typeof useChatPhotoSession> }) {
  if (!session.video.recording) return null;
  return (
    <Typography variant="body2" color="error.main">
      {he.mediaCaptureRecording}
      {` · ${videoElapsedLabel(session.video.elapsedSeconds)} ${he.secondsShort}`}
    </Typography>
  );
}

function RecordedVideoPreview({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <Box
      component="video"
      src={url}
      controls
      playsInline
      sx={{ width: "100%", borderRadius: 1, bgcolor: "black", minHeight: 200, maxHeight: "45vh" }}
    />
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
  onSend: (file: File, kind?: ChatCaptureKind) => void | Promise<void>;
}) {
  if (previewing) {
    return <PhotoConfirmActions session={session} busy={busy} uploading={uploading} onClose={onClose} onSend={onSend} />;
  }
  if (session.video.blob) {
    return <VideoConfirmActions session={session} busy={busy} uploading={uploading} onClose={onClose} onSend={onSend} />;
  }
  if (session.videoMode && session.video.recording) {
    return (
      <>
        <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<StopIcon />}
          onClick={() => session.video.stopRecording()}
        >
          {he.mediaCaptureStop}
        </Button>
      </>
    );
  }
  return <LiveCaptureActions session={session} busy={busy} onClose={onClose} />;
}

function LiveCaptureActions({
  session,
  busy,
  onClose,
}: {
  session: ReturnType<typeof useChatPhotoSession>;
  busy: boolean;
  onClose: () => void;
}) {
  const liveReady = session.videoMode ? session.video.previewReady : session.back.active;
  return (
    <>
      <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
      <Button
        variant="contained"
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PhotoCameraIcon />}
        disabled={!liveReady || busy || session.videoMode}
        onClick={() => void snapToPreview(session)}
      >
        {he.mediaCaptureTakePhoto}
      </Button>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<VideocamIcon />}
        disabled={busy || session.videoMode}
        onClick={() => void startChatVideo(session)}
      >
        {he.chatCaptureVideo}
      </Button>
    </>
  );
}

function PhotoConfirmActions({
  session,
  busy,
  uploading,
  onClose,
  onSend,
}: {
  session: ReturnType<typeof useChatPhotoSession>;
  busy: boolean;
  uploading: boolean;
  onClose: () => void;
  onSend: (file: File, kind?: ChatCaptureKind) => void | Promise<void>;
}) {
  return (
    <>
      <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
      <Button onClick={session.retake} disabled={busy}>{he.mediaCaptureRetry}</Button>
      <Button
        variant="contained"
        disabled={busy}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        onClick={() => void confirmAnnotatedChatPhoto({ session, uploading, onSend, onClose })}
      >
        {busy ? he.loading : he.mediaCaptureUseRecording}
      </Button>
    </>
  );
}

function VideoConfirmActions({
  session,
  busy,
  uploading,
  onClose,
  onSend,
}: {
  session: ReturnType<typeof useChatPhotoSession>;
  busy: boolean;
  uploading: boolean;
  onClose: () => void;
  onSend: (file: File, kind?: ChatCaptureKind) => void | Promise<void>;
}) {
  return (
    <>
      <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
      <Button onClick={session.retake} disabled={busy}>{he.mediaCaptureRetry}</Button>
      <Button
        variant="contained"
        disabled={busy || uploading}
        onClick={() => void confirmChatVideo({ session, uploading, onSend, onClose })}
      >
        {busy ? he.loading : he.mediaCaptureUseRecording}
      </Button>
    </>
  );
}

async function startChatVideo(session: ReturnType<typeof useChatPhotoSession>) {
  session.setDual(false);
  session.setVideoMode(true);
  session.back.stop();
  session.front.stop();
  const ready = await session.video.startPreview();
  if (ready === "ready") session.video.startRecording();
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
  onSend: (file: File, kind?: ChatCaptureKind) => void | Promise<void>;
  onClose: () => void;
}) {
  const { session, uploading, onSend, onClose } = opts;
  if (!session.previewBlob || uploading || session.confirming) return;
  session.setConfirming(true);
  try {
    const file = await exportAnnotatedChatPhoto(session.previewBlob, session.annotateRef.current);
    await onSend(file, "photo");
    onClose();
  } finally {
    session.setConfirming(false);
  }
}

async function confirmChatVideo(opts: {
  session: ReturnType<typeof useChatPhotoSession>;
  uploading: boolean;
  onSend: (file: File, kind?: ChatCaptureKind) => void | Promise<void>;
  onClose: () => void;
}) {
  const { session, uploading, onSend, onClose } = opts;
  const blob = session.video.blob;
  if (!blob || blob.size === 0 || uploading || session.confirming) return;
  session.setConfirming(true);
  try {
    await onSend(
      blobToFile(blob, `chat-video-${Date.now()}.webm`, (blob.type || "video/webm").split(";")[0].trim()),
      "video",
    );
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
