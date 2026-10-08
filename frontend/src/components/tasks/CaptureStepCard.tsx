import { Box, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CompletionSlotHintButtons from "./CompletionSlotHintButtons";
import CompletionSlotTile from "./CompletionSlotTile";
import MediaCaptureActions from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_CARD_RADIUS, employeeFieldSx } from "../../styles/employeeUi";
import { MAX_MESSAGE_TEXT, type CompletionRequirement } from "../../utils/completionMedia";
import type { CaptureStepState } from "../../utils/captureProgress";
import {
  slotDisplayTitle,
  slotExampleSrc,
  slotFillSrc,
  type SlotFill,
} from "../../utils/completionSlotView";
import { pendingSlotHasFile, type PendingMedia } from "../../utils/pendingMedia";

export type StepHintControls = {
  speaking: boolean;
  loading: boolean;
  listenEnabled: boolean;
  onShow: () => void;
  onSpeak: () => void;
};

type CaptureStepCardProps = {
  req: CompletionRequirement;
  index: number;
  state: CaptureStepState;
  media: PendingMedia | null;
  disabled?: boolean;
  hintControls?: StepHintControls;
  onCapture: (file: File, durationSeconds?: number) => void;
  onMessage: (text: string) => void;
  onAnnotatingChange?: (busy: boolean) => void;
  onEnlarge: (src: string, kind: "photo" | "video") => void;
};

function cardSx(state: CaptureStepState) {
  const base = {
    display: "flex",
    flexDirection: "column",
    gap: 1.5,
    p: 2,
    borderRadius: EMPLOYEE_CARD_RADIUS,
    bgcolor: "background.paper",
    minWidth: 0,
  } as const;
  if (state === "done") {
    return { ...base, border: "2px solid", borderColor: "success.main", bgcolor: alpha("#2E7D32", 0.04) };
  }
  if (state === "next") {
    return {
      ...base,
      border: `2px solid ${EMPLOYEE_BRAND}`,
      boxShadow: `0 6px 20px ${alpha(EMPLOYEE_BRAND, 0.18)}`,
    };
  }
  return { ...base, border: "2px solid", borderColor: "divider" };
}

function StepBadge({ state, number }: { state: CaptureStepState; number: number }) {
  const done = state === "done";
  const active = state === "next";
  return (
    <Box
      aria-hidden
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: "1.1rem",
        color: done || active ? "#fff" : "text.secondary",
        bgcolor: done ? "success.main" : active ? EMPLOYEE_BRAND : "action.selected",
      }}
    >
      {done ? <CheckRoundedIcon /> : number}
    </Box>
  );
}

/** Sous-titre d'une étape : « הושלם », ou « הצעד הבא » + durée minimale d'une vidéo. */
export function stepCaption(req: CompletionRequirement, state: CaptureStepState): string {
  if (state === "done") return he.completionSlotDone;
  const parts: string[] = [];
  if (state === "next") parts.push(he.captureStepNext);
  if (req.kind === "video") parts.push(he.completionSlotVideoMin(req.min_seconds ?? 10));
  return parts.join(" · ");
}

function StepHeader({
  req,
  index,
  state,
  hintControls,
}: Pick<CaptureStepCardProps, "req" | "index" | "state" | "hintControls">) {
  const caption = stepCaption(req, state);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <StepBadge state={state} number={index + 1} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.3, overflowWrap: "anywhere" }}>
          {slotDisplayTitle(req, index)}
        </Typography>
        {caption ? (
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: state === "done" ? "success.dark" : "text.secondary" }}
          >
            {caption}
          </Typography>
        ) : null}
      </Box>
      {hintControls ? <CompletionSlotHintButtons {...hintControls} large /> : null}
    </Box>
  );
}

function ExampleImage({
  src,
  title,
  onEnlarge,
}: {
  src: string;
  title: string;
  onEnlarge: (src: string, kind: "photo" | "video") => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={he.completionEnlargeExample}
      onClick={() => onEnlarge(src, "photo")}
      sx={{
        position: "relative",
        p: 0,
        border: 0,
        cursor: "pointer",
        borderRadius: "14px",
        overflow: "hidden",
        height: 150,
        width: "100%",
        display: "block",
        bgcolor: "action.hover",
      }}
    >
      <Box component="img" src={src} alt={title} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <Box
        sx={{
          position: "absolute",
          insetInlineStart: 8,
          bottom: 8,
          px: 1.25,
          py: 0.5,
          borderRadius: "10px",
          bgcolor: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: "0.85rem",
          fontWeight: 700,
        }}
      >
        {he.completionSlotExample}
      </Box>
    </Box>
  );
}

function fillOf(req: CompletionRequirement, media: PendingMedia | null): SlotFill | null {
  if (pendingSlotHasFile(media)) return { previewUrl: media.previewUrl, kind: req.kind };
  if (media?.keptUrl) return { url: media.keptUrl, kind: req.kind };
  return null;
}

function StepMedia({
  req,
  index,
  media,
  onEnlarge,
}: Pick<CaptureStepCardProps, "req" | "index" | "media" | "onEnlarge">) {
  const fill = fillOf(req, media);
  if (fill && req.kind === "audio") {
    return <Box component="audio" src={slotFillSrc(fill) ?? undefined} controls sx={{ width: "100%" }} />;
  }
  if (fill) {
    return (
      <CompletionSlotTile
        req={req}
        index={index}
        fill={fill}
        interactive={false}
        onEnlarge={(src, kind) => onEnlarge(src, kind ?? "photo")}
      />
    );
  }
  const example = req.kind === "photo" || req.kind === "video" ? slotExampleSrc(req) : null;
  return example ? <ExampleImage src={example} title={slotDisplayTitle(req, index)} onEnlarge={onEnlarge} /> : null;
}

function StepCapture({
  req,
  media,
  disabled,
  onCapture,
  onAnnotatingChange,
}: Pick<CaptureStepCardProps, "req" | "media" | "disabled" | "onCapture" | "onAnnotatingChange">) {
  const filled = pendingSlotHasFile(media) || Boolean(media?.keptUrl);
  return (
    <MediaCaptureActions
      prominent
      photoAdded={req.kind === "photo" && filled}
      videoAdded={req.kind === "video" && filled}
      audioAdded={req.kind === "audio" && filled}
      uploadingKind={null}
      disabled={disabled}
      allowedKinds={[req.kind === "video" ? "video" : req.kind === "audio" ? "audio" : "photo"]}
      minVideoSeconds={req.kind === "video" ? req.min_seconds ?? null : null}
      photoLabel={he.completionTakePhoto}
      videoLabel={he.completionTakeVideo}
      audioLabel={he.captureTakeAudio}
      photoDoneLabel={he.completionRetake}
      videoDoneLabel={he.completionRetake}
      audioDoneLabel={he.completionRetake}
      onCapture={(file, kind, meta) => onCapture(file, kind === "video" ? meta?.durationSeconds : undefined)}
      onAnnotatingChange={onAnnotatingChange}
    />
  );
}

/** Une étape de la tâche : numéro, consigne, exemple ou aperçu, puis UN gros bouton pour agir. */
export default function CaptureStepCard(props: CaptureStepCardProps) {
  const { req, index, state, media, disabled, hintControls, onMessage } = props;
  return (
    <Box component="section" data-testid="capture-step" data-state={state} sx={cardSx(state)}>
      <StepHeader req={req} index={index} state={state} hintControls={hintControls} />
      {req.kind === "message" ? (
        <TextField
          label={he.completionReqMessage}
          value={media?.text ?? ""}
          onChange={(event) => onMessage(event.target.value)}
          disabled={disabled}
          fullWidth
          multiline
          minRows={3}
          inputProps={{ maxLength: MAX_MESSAGE_TEXT }}
          sx={employeeFieldSx}
        />
      ) : (
        <>
          <StepMedia req={req} index={index} media={media} onEnlarge={props.onEnlarge} />
          <StepCapture {...props} />
        </>
      )}
    </Box>
  );
}
