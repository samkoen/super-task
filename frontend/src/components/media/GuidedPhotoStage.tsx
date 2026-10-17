import { Alert, Box, Button, CircularProgress } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import type { useCameraStream } from "../../hooks/useCameraStream";
import GuidedCameraStage from "./GuidedCameraStage";
import { captureErrorMessage } from "./captureDialogShared";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx } from "../../styles/dialogUi";
import type { CaptureGuide } from "../../utils/captureGuide";

type Camera = ReturnType<typeof useCameraStream>;

function PhotoNotices({ camera }: { camera: Camera }) {
  const { supported, active, starting, error, start } = camera;
  const errorText = captureErrorMessage(error);
  return (
    <>
      {!supported ? <Alert severity="warning">{he.mediaCaptureUnsupported}</Alert> : null}
      {errorText ? <Alert severity="warning">{errorText}</Alert> : null}
      {starting ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      ) : null}
      {supported && !active && !starting ? (
        <Button
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          onClick={() => void start()}
          sx={{ ...dialogSecondaryActionSx, minHeight: 56 }}
        >
          {error ? he.mediaCaptureRetry : he.mediaCaptureEnableCamera}
        </Button>
      ) : null}
    </>
  );
}

/** Écran caméra photo guidé : même habillage que la vidéo, déclencheur blanc. */
export default function GuidedPhotoStage({
  camera,
  guide,
  capturing,
  uploading,
  onShoot,
  onClose,
}: {
  camera: Camera;
  guide: CaptureGuide;
  capturing: boolean;
  uploading: boolean;
  onShoot: () => void;
  onClose: () => void;
}) {
  return (
    <GuidedCameraStage
      guide={guide}
      onVideoRef={camera.onVideoRef}
      facing={camera.facing}
      shutter={{
        kind: "photo",
        recording: false,
        busy: capturing || uploading,
        disabled: !camera.active,
        onPress: onShoot,
      }}
      onClose={onClose}
      closeDisabled={capturing || uploading}
      onFlip={camera.flip}
      flipDisabled={camera.starting || capturing}
      footer={<PhotoNotices camera={camera} />}
    />
  );
}
