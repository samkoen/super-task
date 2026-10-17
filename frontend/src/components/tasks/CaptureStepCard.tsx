import { Box, ButtonBase, TextField, Typography } from "@mui/material";
import MediaCaptureActions from "../media/MediaCaptureActions";
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
import { MAX_MESSAGE_TEXT, type CompletionRequirement } from "../../utils/completionMedia";
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
};

function fillOf(req: CompletionRequirement, media: PendingMedia | null): SlotFill | null {
  if (pendingSlotHasFile(media)) return { previewUrl: media.previewUrl, posterUrl: media.posterUrl, kind: req.kind };
  if (media?.keptUrl) return { url: media.keptUrl, posterUrl: media.posterUrl, kind: req.kind };
  return null;
}

function tileRootSx(state: CaptureStepState, kind: CompletionRequirement["kind"]) {
  return {
    position: "relative",
    flex: "none",
    minWidth: 0,
    borderRadius: "28px",
    overflow: "hidden",
    ...(kind === "message"
      ? { minHeight: SUBTASK_TILE_HEIGHT, bgcolor: "background.paper" }
      : { height: SUBTASK_TILE_HEIGHT }),
    ...tileRingSx(state),
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
  const { req, state, hintControls, onAsk } = props;
  const isMessage = req.kind === "message";
  return (
    <Box component="section" data-testid="capture-step" data-state={state} sx={tileRootSx(state, req.kind)}>
      {isMessage ? <MessageTile {...props} /> : <VisualTile {...props} />}
      <TileTools hintControls={hintControls} onAsk={onAsk} onDark={!isMessage} />
    </Box>
  );
}
