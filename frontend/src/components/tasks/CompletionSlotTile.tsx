import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import VideocamIcon from "@mui/icons-material/Videocam";
import CompletionSlotHintButtons from "./CompletionSlotHintButtons";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import {
  slotDisplayTitle,
  slotExampleSrc,
  slotFillSrc,
  slotGuideText,
  type SlotFill,
} from "../../utils/completionSlotView";

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
  onEnlarge?: (src: string) => void;
  hintControls?: {
    speaking: boolean;
    loading: boolean;
    listenEnabled: boolean;
    onShow: () => void;
    onSpeak: () => void;
  };
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
        onEnlarge={filled || !exampleSrc ? undefined : onEnlarge}
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
    <Box sx={{ position: "absolute", bottom: 8, left: 8, right: 8, zIndex: 2 }}>
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
  onEnlarge?: (src: string) => void;
}) {
  if (filled && filledSrc && kind === "video") {
    return (
      <Box
        component="video"
        src={filledSrc}
        controls
        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }
  const src = filled ? filledSrc : exampleSrc;
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt={title}
      onClick={onEnlarge && !filled ? () => onEnlarge(src) : undefined}
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
        {req.kind === "video" && !filled && (
          <Typography variant="caption" color="common.white">
            {he.completionSlotVideoMin(req.min_seconds ?? 10)}
          </Typography>
        )}
      </Box>
    </>
  );
}
