import { Box, IconButton } from "@mui/material";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import { he } from "../../i18n/he";
import type { CameraFacing } from "../../utils/mediaCapture";

type CameraFacingPreviewProps = {
  onVideoRef: (node: HTMLVideoElement | null) => void;
  facing: CameraFacing;
  onFlip: () => void;
  flipDisabled?: boolean;
};

/** Viseur photo/vidéo avec bouton החלף מצלמה. Le selfie est mirroir à l’écran seulement. */
export default function CameraFacingPreview({
  onVideoRef,
  facing,
  onFlip,
  flipDisabled = false,
}: CameraFacingPreviewProps) {
  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Box
        component="video"
        ref={onVideoRef}
        playsInline
        autoPlay
        muted
        sx={{
          width: "100%",
          borderRadius: 1,
          bgcolor: "black",
          minHeight: 200,
          maxHeight: "45vh",
          objectFit: "contain",
          transform: facing === "user" ? "scaleX(-1)" : "none",
        }}
      />
      <IconButton
        aria-label={he.mediaCaptureFlipCamera}
        onClick={onFlip}
        disabled={flipDisabled}
        sx={{
          position: "absolute",
          top: 8,
          insetInlineEnd: 8,
          bgcolor: "rgba(0,0,0,0.45)",
          color: "#fff",
          "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
          "&.Mui-disabled": { color: "rgba(255,255,255,0.4)" },
        }}
      >
        <CameraswitchIcon />
      </IconButton>
    </Box>
  );
}
