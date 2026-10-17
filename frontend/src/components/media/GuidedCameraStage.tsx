import { useState, type ReactNode } from "react";
import { Box, ButtonBase, IconButton, Typography } from "@mui/material";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CompletionExampleDialog from "../tasks/CompletionExampleDialog";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { he } from "../../i18n/he";
import { EMPLOYEE_INK } from "../../styles/employeeUi";
import { formatRecordingClock } from "../../utils/captureProgress";
import type { CaptureGuide } from "../../utils/captureGuide";
import type { CameraFacing } from "../../utils/mediaCapture";

export type GuidedShutter = {
  kind: "photo" | "video";
  recording: boolean;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
};

export type GuidedCameraStageProps = {
  guide: CaptureGuide;
  onVideoRef: (node: HTMLVideoElement | null) => void;
  facing: CameraFacing;
  /** Chrono « REC » affiché seulement pendant un enregistrement vidéo. */
  recordingSeconds?: number | null;
  shutter: GuidedShutter;
  onClose: () => void;
  closeDisabled?: boolean;
  onFlip: () => void;
  flipDisabled?: boolean;
  /** Consigne et alertes sous le viseur. */
  footer?: ReactNode;
};

function GuideHeader({ guide }: { guide: CaptureGuide }) {
  return (
    <Box sx={{ textAlign: "center", px: 1 }}>
      <Typography
        component="h2"
        sx={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.2, color: EMPLOYEE_INK, overflowWrap: "anywhere" }}
      >
        {guide.title}
      </Typography>
      {guide.hint ? (
        <Typography
          sx={{
            mt: 0.75,
            fontSize: "1.05rem",
            lineHeight: 1.4,
            color: "text.secondary",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {guide.hint}
        </Typography>
      ) : null}
    </Box>
  );
}

function RecPill({ seconds }: { seconds: number }) {
  return (
    <Box
      role="timer"
      data-testid="guided-rec-pill"
      dir="ltr"
      sx={{
        position: "absolute",
        top: 12,
        left: 12,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        height: 32,
        borderRadius: 16,
        color: "#fff",
        bgcolor: "rgba(0,0,0,0.55)",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#FF3B30" }} />
      {formatRecordingClock(seconds)}
    </Box>
  );
}

/** Miniature de l'image donnée par le menahel : toujours visible, agrandissable d'un toucher. */
function ReferenceThumb({ src, title }: { src: string; title: string }) {
  const [open, setOpen] = useState(false);
  const media = useResolvedMediaSrc(src, false);
  return (
    <>
      <ButtonBase
        aria-label={he.completionEnlargeExample}
        onClick={() => setOpen(true)}
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 72,
          height: 72,
          borderRadius: "16px",
          overflow: "hidden",
          border: "2px solid #fff",
          bgcolor: "rgba(0,0,0,0.4)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        }}
      >
        {media.src ? (
          <Box
            component="img"
            src={media.src}
            alt={title}
            onError={media.onError}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </ButtonBase>
      <CompletionExampleDialog src={open ? src : null} title={title} onClose={() => setOpen(false)} />
    </>
  );
}

const circleButtonSx = {
  width: 52,
  height: 52,
  color: "#fff",
  bgcolor: "rgba(20,24,33,0.7)",
  "&:hover": { bgcolor: "rgba(20,24,33,0.85)" },
  "&.Mui-disabled": { color: "rgba(255,255,255,0.4)" },
} as const;

function ShutterButton({ shutter }: { shutter: GuidedShutter }) {
  const isVideo = shutter.kind === "video";
  const label = !isVideo
    ? he.mediaCaptureTakePhoto
    : shutter.recording
      ? he.mediaCaptureStop
      : he.mediaCaptureRecord;
  return (
    <ButtonBase
      aria-label={label}
      disabled={shutter.disabled || shutter.busy}
      onClick={shutter.onPress}
      sx={{
        width: 76,
        height: 76,
        borderRadius: "50%",
        border: "5px solid #fff",
        display: "grid",
        placeItems: "center",
        "&.Mui-disabled": { opacity: 0.5 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: shutter.recording ? 28 : 54,
          height: shutter.recording ? 28 : 54,
          borderRadius: shutter.recording ? "8px" : "50%",
          bgcolor: isVideo ? "#E5322D" : "#fff",
          transition: "all 0.15s",
        }}
      />
    </ButtonBase>
  );
}

function ControlBar(props: GuidedCameraStageProps) {
  return (
    <Box
      dir="ltr"
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(0deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 100%)",
      }}
    >
      <IconButton aria-label={he.cancel} onClick={props.onClose} disabled={props.closeDisabled} sx={circleButtonSx}>
        <CloseRoundedIcon />
      </IconButton>
      <ShutterButton shutter={props.shutter} />
      <IconButton
        aria-label={he.mediaCaptureFlipCamera}
        onClick={props.onFlip}
        disabled={props.flipDisabled}
        sx={circleButtonSx}
      >
        <CameraswitchIcon />
      </IconButton>
    </Box>
  );
}

function Viewfinder(props: GuidedCameraStageProps) {
  const { guide, recordingSeconds } = props;
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 4",
        maxHeight: "calc(100dvh - 270px)",
        minHeight: 260,
        mx: "auto",
        borderRadius: "28px",
        overflow: "hidden",
        bgcolor: "#000",
        boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
      }}
    >
      <Box
        component="video"
        ref={props.onVideoRef}
        playsInline
        autoPlay
        muted
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: props.facing === "user" ? "scaleX(-1)" : "none",
        }}
      />
      {recordingSeconds != null ? <RecPill seconds={recordingSeconds} /> : null}
      {guide.exampleSrc ? <ReferenceThumb src={guide.exampleSrc} title={guide.title} /> : null}
      <ControlBar {...props} />
    </Box>
  );
}

/** Écran caméra guidé : titre et consigne du menahel, viseur, miniature d'exemple, gros déclencheur. */
export default function GuidedCameraStage(props: GuidedCameraStageProps) {
  return (
    <Box
      data-testid="guided-camera"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2,
        pt: "calc(16px + env(safe-area-inset-top, 0px))",
        pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <GuideHeader guide={props.guide} />
      <Viewfinder {...props} />
      {props.footer}
    </Box>
  );
}
