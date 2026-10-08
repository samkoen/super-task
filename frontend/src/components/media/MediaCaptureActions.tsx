import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useVideoRecorder } from "../../hooks/useVideoRecorder";
import PhotoAnnotationCanvas, { type PhotoAnnotationCanvasHandle } from "./PhotoAnnotationCanvas";
import CameraFacingPreview from "./CameraFacingPreview";
import VideoCaptureDialog from "./VideoCaptureDialog";
import AudioCaptureDialog from "./AudioCaptureDialog";
import {
  captureErrorMessage,
  scheduleAfterDialogPaint,
  useBlobPreviewUrl,
} from "./captureDialogShared";
import { he } from "../../i18n/he";
import { blobToFile, capturePhotoFromVideo, isMediaCaptureSupported, normalizePhotoOrientation } from "../../utils/mediaCapture";
import { canUseNativePhotoCapture } from "../../plugins/nativePhotoCapture";
import { canUseNativeVideoRecorder } from "../../plugins/nativeVideoRecorder";
import { launchPhotoCapture } from "../../utils/launchPhotoCapture";
import { launchVideoCapture } from "../../utils/launchVideoCapture";
import CaptureActionButtons from "./CaptureActionButtons";
import AppDialogTitle from "../ui/AppDialogTitle";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";
import { referenceFileKind } from "../../utils/referenceMediaFile";

export type MediaKind = "photo" | "video" | "audio";

interface MediaCaptureActionsProps {
  photoAdded: boolean;
  videoAdded: boolean;
  audioAdded: boolean;
  uploadingKind: MediaKind | null;
  disabled?: boolean;
  /** Boutons texte (défaut) ou petites icônes discrètes (chat). */
  density?: "default" | "icon";
  minVideoSeconds?: number | null;
  allowedKinds?: MediaKind[];
  photoLabel?: string;
  videoLabel?: string;
  photoDoneLabel?: string;
  videoDoneLabel?: string;
  audioLabel?: string;
  audioDoneLabel?: string;
  /** Gros boutons pleine largeur, un par type : pour l'écran de la tâche. */
  prominent?: boolean;
  /** Avec `prominent` : grands boutons contourés, pour les ajouts facultatifs. */
  quiet?: boolean;
  onAudioStart?: () => void;
  onCapture: (file: File, kind: MediaKind, meta?: { durationSeconds?: number }) => void | Promise<void>;
  onAnnotatingChange?: (busy: boolean) => void;
}

function takePhotoFile(
  event: { target: HTMLInputElement },
  onPhoto: (file: File) => void | Promise<void>,
  setInvalid: (value: boolean) => void,
) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (referenceFileKind(file) !== "photo") {
    setInvalid(true);
    return;
  }
  setInvalid(false);
  void onPhoto(file);
}

function PhotoFromFileButton({
  disabled,
  onPhoto,
}: {
  disabled: boolean;
  onPhoto: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/*"
        onChange={(event) => takePhotoFile(event, onPhoto, setInvalid)}
      />
      <Button
        startIcon={<AttachFileIcon />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        sx={{ minHeight: 48, borderRadius: "14px", fontWeight: 700 }}
      >
        {he.addReferenceFromFile}
      </Button>
      {invalid ? (
        <Typography variant="caption" color="error" sx={{ flexBasis: "100%" }}>
          {he.referencePhotoFileInvalid}
        </Typography>
      ) : null}
    </>
  );
}

const stackedActionsSx = dialogStackedActionsSx;
const secondaryActionSx = dialogSecondaryActionSx;

function FaceGuideOverlay() {
  return (
    <Box
      aria-hidden
      data-testid="face-guide"
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          height: "88%",
          aspectRatio: "1",
          borderRadius: "50%",
          border: "3px dashed rgba(255,255,255,0.9)",
          boxShadow: "0 0 0 999px rgba(0,0,0,0.35)",
        }}
      />
    </Box>
  );
}

export function PhotoCaptureDialog({
  open,
  uploading,
  camera,
  onClose,
  onCapture,
  onSkip,
  title,
  annotate = true,
  seedBlob = null,
  preparing = false,
  faceGuide = false,
}: {
  open: boolean;
  uploading: boolean;
  camera: ReturnType<typeof useCameraStream>;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  /** Si fourni : bouton « continuer sans photo » (avant capture). */
  onSkip?: () => void;
  title?: string;
  /** Faux pour un avatar : aperçu brut, sans flèches / ellipses. */
  annotate?: boolean;
  /** Photo déjà prise (CameraX Android) — saute le live WebView. */
  seedBlob?: Blob | null;
  preparing?: boolean;
  /** Avatar : cercle de cadrage sur le viseur + consigne « regardez la caméra ». */
  faceGuide?: boolean;
}) {
  const { supported, active, starting, error, facing, onVideoRef, start, flip } = camera;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [capturing, setCapturing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [confirming, setConfirming] = useState(false);
  const annotationRef = useRef<PhotoAnnotationCanvasHandle>(null);
  const shotPreviewUrl = useBlobPreviewUrl(!annotate ? previewBlob : null);

  useEffect(() => {
    if (!open) {
      setPreviewBlob(null);
      setConfirming(false);
      return;
    }
    if (seedBlob && seedBlob.size > 0) {
      setPreviewBlob(seedBlob);
    }
  }, [open, seedBlob]);

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
      const file =
        annotate && annotationRef.current
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
      <AppDialogTitle title={title ?? he.mediaCapturePhotoTitle} onClose={onClose} closeDisabled={capturing || confirming} />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, overflowY: "auto" }}>
        {faceGuide && !hasPreview ? (
          <Typography variant="body1" fontWeight={700} textAlign="center">
            {he.avatarCaptureHint}
          </Typography>
        ) : null}
        {hasPreview && previewBlob ? (
          annotate ? (
            <PhotoAnnotationCanvas ref={annotationRef} image={previewBlob} />
          ) : (
            <Box
              component="img"
              src={shotPreviewUrl ?? undefined}
              alt=""
              sx={{ width: "100%", borderRadius: 1, maxHeight: "45vh", objectFit: "contain", bgcolor: "black" }}
            />
          )
        ) : preparing ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={4}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              {he.mediaCapturePreparingPhoto}
            </Typography>
          </Box>
        ) : (
          <CameraFacingPreview
            onVideoRef={onVideoRef}
            facing={facing}
            onFlip={flip}
            flipDisabled={starting || capturing}
            overlay={faceGuide ? <FaceGuideOverlay /> : undefined}
          />
        )}
        {!supported && !hasPreview && <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert>}
        {captureErrorMessage(error) && <Alert severity="warning">{captureErrorMessage(error)}</Alert>}
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
      <DialogActions sx={stackedActionsSx}>
        <Button
          onClick={onClose}
          disabled={capturing || uploading || confirming || preparing}
          sx={secondaryActionSx}
        >
          {he.cancel}
        </Button>
        {onSkip && !hasPreview && (
          <>
            <Button onClick={onSkip} disabled={capturing || uploading || confirming} sx={secondaryActionSx}>
              {he.newTaskSkipPhoto}
            </Button>
            <PhotoFromFileButton
              disabled={capturing || uploading || confirming}
              onPhoto={async (file) => {
                await onCapture(file);
                onClose();
              }}
            />
          </>
        )}
        {error && !hasPreview && (
          <Button
            onClick={() => void start()}
            disabled={capturing || uploading || confirming}
            sx={secondaryActionSx}
          >
            {he.mediaCaptureRetry}
          </Button>
        )}
        {hasPreview ? (
          <>
            <Button onClick={handleRetry} disabled={uploading || confirming} sx={secondaryActionSx}>
              {he.mediaCaptureRetry}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleConfirm()}
              disabled={uploading || confirming}
              startIcon={uploading || confirming ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={employeePrimaryButtonSx}
            >
              {uploading || confirming ? he.loading : he.mediaCaptureUseRecording}
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            startIcon={capturing || uploading ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraIcon />}
            onClick={() => void handleCapture()}
            disabled={!active || capturing || uploading}
            sx={employeePrimaryButtonSx}
          >
            {capturing || uploading ? he.loading : he.mediaCaptureTakePhoto}
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
  density = "default",
  minVideoSeconds = null,
  allowedKinds,
  photoLabel,
  videoLabel,
  photoDoneLabel,
  videoDoneLabel,
  audioLabel,
  audioDoneLabel,
  prominent = false,
  quiet = false,
  onAudioStart,
  onCapture,
  onAnnotatingChange,
}: MediaCaptureActionsProps) {
  const photoCamera = useCameraStream({ defaultFacing: "environment" });
  const videoRecorder = useVideoRecorder({ defaultFacing: "environment" });
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoSeed, setPhotoSeed] = useState<Blob | null>(null);
  const [photoPreparing, setPhotoPreparing] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [nativeVideoError, setNativeVideoError] = useState("");
  const [nativePhotoError, setNativePhotoError] = useState("");
  const captureSupported = isMediaCaptureSupported();
  const nativeVideo = canUseNativeVideoRecorder();
  const nativePhoto = canUseNativePhotoCapture();

  const busy = disabled || uploadingKind !== null;
  const captureDisabled = busy || !captureSupported;
  const photoDisabled = busy || (!captureSupported && !nativePhoto);
  const videoDisabled = busy || (!captureSupported && !nativeVideo);
  const nativeError = nativePhotoError || nativeVideoError;
  const kinds = allowedKinds ?? (["photo", "video", "audio"] as MediaKind[]);
  const showPhoto = kinds.includes("photo");
  const showVideo = kinds.includes("video");
  const showAudio = kinds.includes("audio");

  const openWebPhotoCapture = useCallback(() => {
    setPhotoSeed(null);
    setPhotoPreparing(false);
    setPhotoOpen(true);
    onAnnotatingChange?.(true);
    scheduleAfterDialogPaint(() => {
      void photoCamera.start();
    });
  }, [onAnnotatingChange, photoCamera.start]);

  const openPhotoCapture = useCallback(() => {
    setNativePhotoError("");
    onAnnotatingChange?.(true);
    let opened = false;
    void launchPhotoCapture({
      openWeb: () => {
        opened = true;
        openWebPhotoCapture();
      },
      onNative: async (file) => {
        opened = true;
        setPhotoPreparing(true);
        setPhotoOpen(true);
        try {
          setPhotoSeed(await normalizePhotoOrientation(file));
        } finally {
          setPhotoPreparing(false);
        }
      },
      onPermissionDenied: () => setNativePhotoError("permission"),
    }).finally(() => {
      if (!opened) onAnnotatingChange?.(false);
    });
  }, [onAnnotatingChange, openWebPhotoCapture]);

  const closePhotoCapture = useCallback(() => {
    setPhotoOpen(false);
    setPhotoSeed(null);
    setPhotoPreparing(false);
    onAnnotatingChange?.(false);
    photoCamera.stop();
  }, [onAnnotatingChange, photoCamera.stop]);

  const openWebVideoCapture = useCallback(() => {
    setVideoOpen(true);
    scheduleAfterDialogPaint(() => {
      void videoRecorder.startPreview();
    });
  }, [videoRecorder.startPreview]);

  const openVideoCapture = useCallback(() => {
    setNativeVideoError("");
    void launchVideoCapture({
      minSeconds: minVideoSeconds,
      openWeb: openWebVideoCapture,
      onNative: (file, durationSeconds) => onCapture(file, "video", { durationSeconds }),
      onPermissionDenied: () => setNativeVideoError("permission"),
    });
  }, [minVideoSeconds, onCapture, openWebVideoCapture]);

  const closeVideoCapture = useCallback(() => {
    setVideoOpen(false);
    videoRecorder.cleanup();
  }, [videoRecorder.cleanup]);

  const iconActions = (
    <Box display="flex" alignItems="center" gap={0.25} sx={{ opacity: 0.75 }}>
      {showAudio && (
      <Tooltip title={audioAdded ? he.audioAdded : he.addAudio}>
        <span>
          <IconButton
            size="small"
            aria-label={he.addAudio}
            color={audioAdded ? "primary" : "default"}
            onClick={() => (onAudioStart ? onAudioStart() : setAudioOpen(true))}
            disabled={captureDisabled}
            sx={{ p: 0.5 }}
          >
            {uploadingKind === "audio" ? (
              <CircularProgress size={16} />
            ) : (
              <MicIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      )}
      {showPhoto && (
      <Tooltip title={photoAdded ? he.photoAdded : he.addPhoto}>
        <span>
          <IconButton
            size="small"
            aria-label={he.addPhoto}
            color={photoAdded ? "primary" : "default"}
            onClick={openPhotoCapture}
            disabled={photoDisabled}
            sx={{ p: 0.5 }}
          >
            {uploadingKind === "photo" ? (
              <CircularProgress size={16} />
            ) : (
              <PhotoCameraIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      )}
      {showVideo && (
      <Tooltip title={videoAdded ? videoDoneLabel ?? he.videoAdded : videoLabel ?? he.addVideo}>
        <span>
          <IconButton
            size="small"
            aria-label={videoAdded ? videoDoneLabel ?? he.videoAdded : videoLabel ?? he.addVideo}
            color={videoAdded ? "primary" : "default"}
            onClick={openVideoCapture}
            disabled={videoDisabled}
            sx={{ p: 0.5 }}
          >
            {uploadingKind === "video" ? (
              <CircularProgress size={16} />
            ) : (
              <VideocamIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      )}
    </Box>
  );

  const openAudio = () => (onAudioStart ? onAudioStart() : setAudioOpen(true));
  const defaultActions = (
    <CaptureActionButtons
      uploadingKind={uploadingKind}
      prominent={prominent}
      quiet={quiet}
      photo={{
        show: showPhoto,
        added: photoAdded,
        disabled: photoDisabled,
        label: photoLabel,
        doneLabel: photoDoneLabel,
        onClick: openPhotoCapture,
      }}
      video={{
        show: showVideo,
        added: videoAdded,
        disabled: videoDisabled,
        label: videoLabel,
        doneLabel: videoDoneLabel,
        onClick: openVideoCapture,
      }}
      audio={{
        show: showAudio,
        added: audioAdded,
        disabled: captureDisabled,
        label: audioLabel,
        doneLabel: audioDoneLabel,
        onClick: openAudio,
      }}
    />
  );

  return (
    <>
      {density === "icon" ? iconActions : defaultActions}
      {!captureSupported && !nativeVideo && !nativePhoto && (
        <Typography variant="caption" color="warning.main">
          {he.mediaCaptureUnsupported}
        </Typography>
      )}
      {nativeError ? (
        <Typography variant="caption" color="warning.main">
          {captureErrorMessage(nativeError)}
        </Typography>
      ) : null}
      <PhotoCaptureDialog
        open={photoOpen}
        uploading={uploadingKind === "photo"}
        camera={photoCamera}
        seedBlob={photoSeed}
        preparing={photoPreparing}
        onClose={closePhotoCapture}
        onCapture={(file) => onCapture(file, "photo")}
      />
      <VideoCaptureDialog
        open={videoOpen}
        uploading={uploadingKind === "video"}
        recorder={videoRecorder}
        minSeconds={minVideoSeconds && minVideoSeconds > 0 ? minVideoSeconds : null}
        onClose={closeVideoCapture}
        onCapture={(file, durationSeconds) => onCapture(file, "video", { durationSeconds })}
      />
      {onAudioStart ? null : (
        <AudioCaptureDialog
          open={audioOpen}
          uploading={uploadingKind === "audio"}
          onClose={() => setAudioOpen(false)}
          onCapture={(file) => onCapture(file, "audio")}
        />
      )}
    </>
  );
}
