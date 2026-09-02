import { Box, IconButton, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VideocamIcon from "@mui/icons-material/Videocam";
import CompletionSlotHintButtons from "./CompletionSlotHintButtons";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { useVideoPoster } from "../../hooks/useVideoPoster";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import {
  slotDisplayTitle,
  slotExampleSrc,
  slotFillSrc,
  slotGuideText,
  type SlotFill,
} from "../../utils/completionSlotView";

type HintControls = {
  speaking: boolean;
  loading: boolean;
  listenEnabled: boolean;
  onShow: () => void;
  onSpeak: () => void;
};

export default function CompletionSlotTile({
  req,
  index,
  fill,
  interactive,
  disabled,
  onCapture,
  onEnlarge,
  hintControls,
}: {
  req: CompletionRequirement;
  index: number;
  fill: SlotFill | null;
  interactive: boolean;
  disabled?: boolean;
  onCapture?: (file: File, durationSeconds?: number) => void;
  onEnlarge?: (src: string, kind?: "photo" | "video") => void;
  hintControls?: HintControls;
}) {
  const filledSrc = slotFillSrc(fill);
  const exampleSrc = slotExampleSrc(req);
  const title = slotDisplayTitle(req, index);
  const filled = Boolean(filledSrc);

  return (
    <Box
      sx={{
        position: "relative",
        aspectRatio: "1",
        borderRadius: 2,
        overflow: "hidden",
        border: 1,
        borderColor: filled ? "success.main" : "divider",
        bgcolor: "action.hover",
      }}
    >
      <SlotBackground
        filled={filled}
        filledSrc={filledSrc}
        exampleSrc={exampleSrc}
        kind={req.kind}
        title={title}
        onEnlarge={onEnlarge}
      />
      {hintControls && slotGuideText(req) ? (
        <CompletionSlotHintButtons {...hintControls} />
      ) : null}
      <SlotOverlay req={req} title={title} filled={filled} />
      {interactive && onCapture && (
        <SlotCaptureBar req={req} filled={filled} disabled={disabled} onCapture={onCapture} />
      )}
    </Box>
  );
}

function captureBarSx(filled: boolean) {
  return {
    position: "absolute" as const,
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 2,
    ...(filled
      ? { "& .MuiButton-root": { minWidth: 0, py: 0.25, px: 1, fontSize: 11, width: "100%" } }
      : {}),
  };
}

function SlotCaptureBar({
  req,
  filled,
  disabled,
  onCapture,
}: {
  req: CompletionRequirement;
  filled: boolean;
  disabled?: boolean;
  onCapture: (file: File, durationSeconds?: number) => void;
}) {
  return (
    <Box sx={captureBarSx(filled)}>
      <MediaCaptureActions
        photoAdded={req.kind === "photo" && filled}
        videoAdded={req.kind === "video" && filled}
        audioAdded={false}
        uploadingKind={null}
        disabled={disabled}
        allowedKinds={[req.kind === "video" ? "video" : "photo"]}
        minVideoSeconds={req.kind === "video" ? req.min_seconds ?? null : null}
        photoLabel={he.completionTakePhoto}
        videoLabel={he.completionTakeVideo}
        photoDoneLabel={he.completionRetake}
        videoDoneLabel={he.completionRetake}
        onCapture={(file, kind, meta) =>
          onCapture(file, kind === "video" ? meta?.durationSeconds : undefined)
        }
      />
    </Box>
  );
}

function SlotBackground({
  filled,
  filledSrc,
  exampleSrc,
  kind,
  title,
  onEnlarge,
}: {
  filled: boolean;
  filledSrc: string | null;
  exampleSrc: string | null;
  kind: CompletionRequirement["kind"];
  title: string;
  onEnlarge?: (src: string, kind?: "photo" | "video") => void;
}) {
  if (filled && filledSrc && kind === "video") {
    return (
      <SlotFilledVideo src={filledSrc} title={title} onPlay={() => onEnlarge?.(filledSrc, "video")} />
    );
  }
  const src = filled ? filledSrc : exampleSrc;
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt={title}
      onClick={onEnlarge && !filled ? () => onEnlarge(src, "photo") : undefined}
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        cursor: onEnlarge && !filled ? "pointer" : "default",
      }}
    />
  );
}

function SlotFilledVideo({ src, title, onPlay }: { src: string; title: string; onPlay: () => void }) {
  const poster = useVideoPoster(src);
  return (
    <>
      {poster ? (
        <Box
          component="img"
          src={poster}
          alt={title}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <Box
          component="video"
          src={src}
          muted
          playsInline
          preload="metadata"
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
        />
      )}
      <SlotPlayButton onPlay={onPlay} />
    </>
  );
}

function SlotPlayButton({ onPlay }: { onPlay: () => void }) {
  return (
    <IconButton
      aria-label={he.completionPlayVideo}
      onClick={onPlay}
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 3,
        bgcolor: "rgba(0,0,0,0.55)",
        color: "common.white",
        "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
      }}
    >
      <PlayArrowIcon />
    </IconButton>
  );
}

function SlotOverlay({
  req,
  title,
  filled,
}: {
  req: CompletionRequirement;
  title: string;
  filled: boolean;
}) {
  const KindIcon = req.kind === "video" ? VideocamIcon : PhotoCameraIcon;
  return (
    <>
      <Box sx={{ position: "absolute", top: 8, right: 8, color: "common.white", zIndex: 2 }}>
        {filled ? (
          <CheckCircleIcon fontSize="small" color="success" aria-label={he.completionSlotDone} />
        ) : (
          <KindIcon fontSize="small" />
        )}
      </Box>
      {filled ? null : (
        <>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
              pointerEvents: "none",
            }}
          />
          <Box sx={{ position: "absolute", top: 34, left: 8, right: 8, zIndex: 2, pointerEvents: "none" }}>
            <Typography variant="subtitle2" color="common.white" fontWeight={700} noWrap>
              {title}
            </Typography>
            {req.kind === "video" && (
              <Typography variant="caption" color="common.white">
                {he.completionSlotVideoMin(req.min_seconds ?? 10)}
              </Typography>
            )}
          </Box>
        </>
      )}
    </>
  );
}
