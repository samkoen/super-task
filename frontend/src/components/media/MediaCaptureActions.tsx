import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useVideoRecorder } from "../../hooks/useVideoRecorder";
import PhotoAnnotationCanvas, { type PhotoAnnotationCanvasHandle } from "./PhotoAnnotationCanvas";
import { he } from "../../i18n/he";
import { blobToFile, capturePhotoFromVideo, isMediaCaptureSupported, normalizePhotoOrientation } from "../../utils/mediaCapture";

export type MediaKind = "photo" | "video" | "audio";

interface MediaCaptureActionsProps {
  photoAdded: boolean;
  videoAdded: boolean;
  audioAdded: boolean;
  uploadingKind: MediaKind | null;
  disabled?: boolean;
  onCapture: (file: File, kind: MediaKind) => void | Promise<void>;
}

function errorMessage(error: string): string {
  if (error === "permission") return he.mediaCapturePermission;
  if (error === "device") return he.mediaCaptureDevice;
  if (error === "unsupported") return he.mediaCaptureUnsupported;
  if (error === "unknown") return he.mediaCaptureUnknown;
  return "";
}

function scheduleAfterDialogPaint(run: () => void) {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
    return;
  }
  run();
}

function useBlobPreviewUrl(blob: Blob | null) {
  const previewUrl = useMemo(
    () => (blob && blob.size > 0 ? URL.createObjectURL(blob) : null),
    [blob]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  return previewUrl;
}

export function PhotoCaptureDialog({
  open,
  uploading,
  camera,
  onClose,
  onCapture,
  onSkip,
  title,
}: {
  open: boolean;
  uploading: boolean;
  camera: ReturnType<typeof useCameraStream>;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  /** Si fourni : bouton « continuer sans photo » (avant capture). */
  onSkip?: () => void;
  title?: string;
}) {
  const { supported, active, starting, error, onVideoRef, start } = camera;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [capturing, setCapturing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [confirming, setConfirming] = useState(false);
  const annotationRef = useRef<PhotoAnnotationCanvasHandle | null>(null);

  useEffect(() => {
    if (!open) {
      setPreviewBlob(null);
      setConfirming(false);
    }
  }, [open]);

  const handleCapture = async () => {
    const video = camera.videoRef.current;
    if (!video) return;
    setCapturing(true);
    try {
      const blob = await capturePhotoFromVideo(video);
      if (!blob) return;
      setPreviewBlob(await normalizePhotoOrientation(blob));
    } finally {
      setCapturing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewBlob || previewBlob.size === 0 || uploading || confirming) return;
    setConfirming(true);
    try {
      const file = annotationRef.current
        ? await annotationRef.current.exportFile()
        : blobToFile(previewBlob, `task-photo-${Date.now()}.jpg`, "image/jpeg");
      await onCapture(file);
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const handleRetry = () => {
    setPreviewBlob(null);
  };

  const hasPreview = Boolean(previewBlob && previewBlob.size > 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth fullScreen={fullScreen} maxWidth="sm" dir="rtl" disableEnforceFocus>
      <DialogTitle>{title ?? he.mediaCapturePhotoTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, overflowY: "auto" }}>
        {hasPreview && previewBlob ? (
          <PhotoAnnotationCanvas ref={annotationRef} imageBlob={previewBlob} />
        ) : (
          <Box
            component="video"
            ref={onVideoRef}
            playsInline
            autoPlay
            muted
            sx={{ width: "100%", borderRadius: 1, bgcolor: "black", minHeight: 200, maxHeight: "45vh", objectFit: "contain" }}
          />
        )}
        {!supported && <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert>}
        {errorMessage(error) && <Alert severity="warning">{errorMessage(error)}</Alert>}
        {starting && (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!hasPreview && !active && !starting && !error && supported && (
          <Box display="flex" flexDirection="column" gap={1} alignItems="flex-start">
            <Typography variant="body2" color="text.secondary">
              {he.mediaCaptureEnableHint}
            </Typography>
            <Button variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => void start()}>
              {he.mediaCaptureEnableCamera}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={capturing || uploading || confirming}>
          {he.cancel}
        </Button>
        {onSkip && !hasPreview && (
          <Button onClick={onSkip} disabled={capturing || uploading || confirming}>
            {he.newTaskSkipPhoto}
          </Button>
        )}
        {error && !hasPreview && (
          <Button onClick={() => void start()} disabled={capturing || uploading || confirming}>
            {he.mediaCaptureRetry}
          </Button>
        )}
        {hasPreview ? (
          <>
            <Button onClick={handleRetry} disabled={uploading || confirming}>
              {he.mediaCaptureRetry}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleConfirm()}
              disabled={uploading || confirming}
              startIcon={uploading || confirming ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {uploading || confirming ? he.loading : he.mediaCaptureUseRecording}
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            startIcon={capturing || uploading ? <CircularProgress size={18} color="inherit" /> : <PhotoCameraIcon />}
            onClick={() => void handleCapture()}
            disabled={!active || capturing || uploading}
          >
            {capturing || uploading ? he.loading : he.mediaCaptureTakePhoto}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function useRecordedVideoRef(previewUrl: string | null) {
  return useCallback(
    (node: HTMLVideoElement | null) => {
      if (!node) return;
      node.srcObject = null;
      if (previewUrl) {
        node.src = previewUrl;
        node.load();
      }
    },
    [previewUrl]
  );
}

function VideoCaptureDialog({
  open,
  uploading,
  recorder,
  onClose,
  onCapture,
}: {
  open: boolean;
  uploading: boolean;
  recorder: ReturnType<typeof useVideoRecorder>;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
}) {
  const {
    supported,
    previewReady,
    starting,
    recording,
    blob,
    error,
    onVideoRef,
    startPreview,
    startRecording,
    stopRecording,
    reset,
  } = recorder;
  const previewUrl = useBlobPreviewUrl(blob);
  const hasPreview = Boolean(blob && blob.size > 0 && previewUrl);
  const onRecordedVideoRef = useRecordedVideoRef(previewUrl);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!blob || blob.size === 0 || uploading || confirming) return;
    setConfirming(true);
    try {
      await onCapture(blobToFile(blob, `task-video-${Date.now()}.webm`, blob.type || "video/webm"));
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const handleRetry = () => {
    reset();
    void startPreview();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.mediaCaptureVideoTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {hasPreview ? (
          <Box
            key="recorded-preview"
            component="video"
            ref={onRecordedVideoRef}
            controls
            playsInline
            sx={{ width: "100%", borderRadius: 1, bgcolor: "black", minHeight: 200, maxHeight: "45vh", objectFit: "contain" }}
          />
        ) : (
          <Box
            key="live-camera"
            component="video"
            ref={onVideoRef}
            playsInline
            autoPlay
            muted
            sx={{ width: "100%", borderRadius: 1, bgcolor: "black", minHeight: 200, maxHeight: "45vh", objectFit: "contain" }}
          />
        )}
        {!supported && <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert>}
        {errorMessage(error) && <Alert severity="warning">{errorMessage(error)}</Alert>}
        {recording && (
          <Typography variant="body2" color="error.main">
            {he.mediaCaptureRecording}
          </Typography>
        )}
        {hasPreview && (
          <Typography variant="body2" color="text.secondary">
            {he.mediaCapturePreviewHint}
          </Typography>
        )}
        {starting && (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!hasPreview && !previewReady && !starting && !error && supported && (
          <Box display="flex" flexDirection="column" gap={1} alignItems="flex-start">
            <Typography variant="body2" color="text.secondary">
              {he.mediaCaptureEnableHint}
            </Typography>
            <Button variant="outlined" startIcon={<VideocamIcon />} onClick={() => void startPreview()}>
              {he.mediaCaptureEnableCamera}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={uploading || recording || confirming}>
          {he.cancel}
        </Button>
        {error && !hasPreview && (
          <Button onClick={() => void startPreview()} disabled={uploading || recording || confirming}>
            {he.mediaCaptureRetry}
          </Button>
        )}
        {hasPreview ? (
          <>
            <Button onClick={handleRetry} disabled={uploading || confirming}>
              {he.mediaCaptureRetry}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleConfirm()}
              disabled={uploading || confirming}
              startIcon={uploading || confirming ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {uploading || confirming ? he.loading : he.mediaCaptureUseRecording}
            </Button>
          </>
        ) : !recording ? (
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <VideocamIcon />}
            onClick={startRecording}
            disabled={!previewReady || uploading}
          >
            {uploading ? he.loading : he.mediaCaptureRecord}
          </Button>
        ) : (
          <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={stopRecording}>
            {he.mediaCaptureStop}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function AudioCaptureDialog({
  open,
  uploading,
  onClose,
  onCapture,
}: {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
}) {
  const { supported, recording, blob, error, start, stop, reset } = useAudioRecorder();
  const previewUrl = useBlobPreviewUrl(blob);
  const hasPreview = Boolean(blob && blob.size > 0 && previewUrl);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      stop();
      reset();
    }
  }, [open, reset, stop]);

  const handleConfirm = async () => {
    if (!blob || blob.size === 0 || uploading || confirming) return;
    setConfirming(true);
    try {
      await onCapture(blobToFile(blob, `task-audio-${Date.now()}.webm`, blob.type || "audio/webm"));
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const recorderMessage = errorMessage(error);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.mediaCaptureAudioTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {he.mediaCaptureAudioHint}
        </Typography>
        {!supported && <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert>}
        {recorderMessage && <Alert severity="warning">{recorderMessage}</Alert>}
        {recording && (
          <Typography variant="body2" color="error.main">
            {he.mediaCaptureRecording}
          </Typography>
        )}
        {hasPreview && (
          <>
            <Typography variant="body2" color="text.secondary">
              {he.mediaCapturePreviewHint}
            </Typography>
            <Box component="audio" src={previewUrl ?? undefined} controls sx={{ width: "100%" }} />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={uploading || recording || confirming}>
          {he.cancel}
        </Button>
        {error && !hasPreview && (
          <Button onClick={() => void start()} disabled={uploading || recording || confirming}>
            {he.mediaCaptureRetry}
          </Button>
        )}
        {hasPreview ? (
          <>
            <Button onClick={reset} disabled={uploading || confirming}>
              {he.mediaCaptureRetry}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleConfirm()}
              disabled={uploading || confirming}
              startIcon={uploading || confirming ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {uploading || confirming ? he.loading : he.mediaCaptureUseRecording}
            </Button>
          </>
        ) : !recording ? (
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <MicIcon />}
            onClick={() => void start()}
            disabled={!supported || uploading}
          >
            {uploading ? he.loading : he.mediaCaptureRecord}
          </Button>
        ) : (
          <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={stop}>
            {he.mediaCaptureStop}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function MediaCaptureActions({
  photoAdded,
  videoAdded,
  audioAdded,
  uploadingKind,
  disabled = false,
  onCapture,
}: MediaCaptureActionsProps) {
  const photoCamera = useCameraStream();
  const videoRecorder = useVideoRecorder();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const captureSupported = isMediaCaptureSupported();

  const busy = disabled || uploadingKind !== null;

  const openPhotoCapture = useCallback(() => {
    setPhotoOpen(true);
    scheduleAfterDialogPaint(() => {
      void photoCamera.start();
    });
  }, [photoCamera.start]);

  const closePhotoCapture = useCallback(() => {
    setPhotoOpen(false);
    photoCamera.stop();
  }, [photoCamera.stop]);

  const openVideoCapture = useCallback(() => {
    setVideoOpen(true);
    scheduleAfterDialogPaint(() => {
      void videoRecorder.startPreview();
    });
  }, [videoRecorder.startPreview]);

  const closeVideoCapture = useCallback(() => {
    setVideoOpen(false);
    videoRecorder.cleanup();
  }, [videoRecorder.cleanup]);

  return (
    <>
      <Button
        startIcon={<PhotoCameraIcon />}
        variant={photoAdded ? "contained" : "outlined"}
        onClick={openPhotoCapture}
        disabled={busy || !captureSupported}
      >
        {uploadingKind === "photo" ? he.loading : photoAdded ? he.photoAdded : he.addPhoto}
      </Button>
      <Button
        startIcon={<VideocamIcon />}
        variant={videoAdded ? "contained" : "outlined"}
        onClick={openVideoCapture}
        disabled={busy || !captureSupported}
      >
        {uploadingKind === "video" ? he.loading : videoAdded ? he.videoAdded : he.addVideo}
      </Button>
      <Button
        startIcon={<MicIcon />}
        variant={audioAdded ? "contained" : "outlined"}
        onClick={() => setAudioOpen(true)}
        disabled={busy || !captureSupported}
      >
        {uploadingKind === "audio" ? he.loading : audioAdded ? he.audioAdded : he.addAudio}
      </Button>
      {!captureSupported && (
        <Typography variant="caption" color="warning.main">
          {he.mediaCaptureUnsupported}
        </Typography>
      )}
      <PhotoCaptureDialog
        open={photoOpen}
        uploading={uploadingKind === "photo"}
        camera={photoCamera}
        onClose={closePhotoCapture}
        onCapture={(file) => onCapture(file, "photo")}
      />
      <VideoCaptureDialog
        open={videoOpen}
        uploading={uploadingKind === "video"}
        recorder={videoRecorder}
        onClose={closeVideoCapture}
        onCapture={(file) => onCapture(file, "video")}
      />
      <AudioCaptureDialog
        open={audioOpen}
        uploading={uploadingKind === "audio"}
        onClose={() => setAudioOpen(false)}
        onCapture={(file) => onCapture(file, "audio")}
      />
    </>
  );
}
