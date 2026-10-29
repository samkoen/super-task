import { useState } from "react";
import { Box, ButtonBase, TextField, Typography } from "@mui/material";
import MediaCaptureActions from "../media/MediaCaptureActions";
import CompletionExampleDialog from "./CompletionExampleDialog";
import SlotRemarkView, { REJECT_COLOR } from "./review/SlotRemarkView";
import {
  ActionPill,
  TileBackdrop,
  TileHeading,
  TileTools,
  stepCaption,
  tileRingSx,
  type StepHintControls,
} from "./SubtaskTileParts";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, employeeFieldSx } from "../../styles/employeeUi";
import { guideFromRequirement, SUBTASK_TILE_HEIGHT } from "../../utils/captureGuide";
import { MAX_MESSAGE_TEXT, type CompletionRequirement, type SlotReview } from "../../utils/completionMedia";
import type { CaptureStepState } from "../../utils/captureProgress";
import { slotDisplayTitle, slotExampleSrc, type SlotFill } from "../../utils/completionSlotView";
import { pendingSlotHasFile, type PendingMedia } from "../../utils/pendingMedia";

export { stepCaption, type StepHintControls };

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
  /** Ouvre le chat de la tâche, question pré-écrite sur cette sous-tâche. */
  onAsk?: () => void;
  /** Contrôle V/X du menahel sur cette sous-tâche. */
  review?: SlotReview | null;
};

function fillOf(req: CompletionRequirement, media: PendingMedia | null): SlotFill | null {
  if (pendingSlotHasFile(media)) return { previewUrl: media.previewUrl, posterUrl: media.posterUrl, kind: req.kind };
  if (media?.keptUrl) return { url: media.keptUrl, posterUrl: media.posterUrl, kind: req.kind };
  return null;
}

/** Enveloppe d'une sous-tâche : anneau d'état, et la remarque du menahel sous la tuile si elle existe. */
function tileRootSx(state: CaptureStepState, fix: boolean) {
  return {
    position: "relative",
    flex: "none",
    minWidth: 0,
    borderRadius: "28px",
    overflow: "hidden",
    bgcolor: "background.paper",
    ...(fix ? { boxShadow: `0 0 0 3px ${REJECT_COLOR}` } : tileRingSx(state)),
  } as const;
}

function tileBodySx(kind: CompletionRequirement["kind"]) {
  return {
    position: "relative",
    ...(kind === "message" ? { minHeight: SUBTASK_TILE_HEIGHT } : { height: SUBTASK_TILE_HEIGHT }),
  } as const;
}

/** Surface tactile d'une sous-tâche photo / vidéo / audio : toucher = ouvrir la caméra. */
function VisualTile(props: CaptureStepCardProps) {
  const { req, index, state, media, disabled, onCapture, onAnnotatingChange } = props;
  const filled = pendingSlotHasFile(media) || Boolean(media?.keptUrl);
  const title = slotDisplayTitle(req, index);
  const kind = req.kind === "video" ? "video" : req.kind === "audio" ? "audio" : "photo";
  return (
    <>
      <TileBackdrop req={req} fill={fillOf(req, media)} exampleSrc={slotExampleSrc(req)} title={title} />
      <TileHeading title={title} index={index} state={state} />
      <MediaCaptureActions
        photoAdded={kind === "photo" && filled}
        videoAdded={kind === "video" && filled}
        audioAdded={kind === "audio" && filled}
        uploadingKind={null}
        disabled={disabled}
        allowedKinds={[kind]}
        minVideoSeconds={kind === "video" ? req.min_seconds ?? null : null}
        guide={guideFromRequirement(req, index)}
        onCapture={(file, captured, meta) => onCapture(file, captured === "video" ? meta?.durationSeconds : undefined)}
        onAnnotatingChange={onAnnotatingChange}
        trigger={(open, ui) => (
          <ButtonBase
            onClick={open}
            disabled={ui.disabled || disabled}
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "flex-end",
              textAlign: "start",
            }}
          >
            <ActionPill kind={kind} filled={filled} disabled={ui.disabled || disabled} />
          </ButtonBase>
        )}
      />
    </>
  );
}

function MessageTile(props: CaptureStepCardProps) {
  const { req, index, media, disabled, onMessage } = props;
  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ paddingInlineEnd: "150px", minHeight: 42 }}>
        <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>
          {slotDisplayTitle(req, index)}
        </Typography>
      </Box>
      <TextField
        label={he.completionReqMessage}
        value={media?.text ?? ""}
        onChange={(event) => onMessage(event.target.value)}
        disabled={disabled}
        fullWidth
        multiline
        minRows={2}
        inputProps={{ maxLength: MAX_MESSAGE_TEXT }}
        sx={{ ...employeeFieldSx, "& .Mui-focused": { color: EMPLOYEE_BRAND } }}
      />
    </Box>
  );
}

/** Une sous-tâche = un tiers d'écran : image du menahel, titre, un geste pour filmer ou photographier. */
export default function CaptureStepCard(props: CaptureStepCardProps) {
  const { req, state, hintControls, onAsk, review } = props;
  const isMessage = req.kind === "message";
  const rejected = review?.status === "rejected";
  // Tant que l'oved n'a pas refait le fichier, l'ancien reste en place mais signalé en rouge.
  const fix = rejected && !isMessage && !pendingSlotHasFile(props.media);
  return (
    <Box
      component="section"
      data-testid="capture-step"
      data-state={state}
      data-review={rejected ? "rejected" : undefined}
      sx={tileRootSx(state, fix)}
    >
      <Box sx={tileBodySx(req.kind)}>
        {isMessage ? <MessageTile {...props} /> : <VisualTile {...props} />}
        <TileTools hintControls={hintControls} onAsk={onAsk} onDark={!isMessage} />
      </Box>
      {rejected && review ? <ManagerRemarkPanel review={review} kind={req.kind} /> : null}
    </Box>
  );
}

/** Ce que le menahel a refusé : sa remarque et l'image avec ses flèches / ronds, visibles tout de suite. */
function ManagerRemarkPanel({ review, kind }: { review: SlotReview; kind: CompletionRequirement["kind"] }) {
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const hint = kind === "message" ? he.slotReviewRewriteHint : he.slotReviewRetakeHint;
  return (
    <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <SlotRemarkView
        label={he.slotReviewManagerRemark}
        remark={review.remark}
        imageUrl={review.annotated_url}
        onEnlarge={setEnlarged}
      />
      <Typography sx={{ color: REJECT_COLOR, fontWeight: 800, px: 0.5 }}>{hint}</Typography>
      <CompletionExampleDialog src={enlarged} title={he.slotRemarkMarkedImage} onClose={() => setEnlarged(null)} />
    </Box>
  );
}
